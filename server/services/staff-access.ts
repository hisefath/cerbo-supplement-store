// BE-18 StaffAccessService (lld.md §2, SEQ-10): operations roles change through the SRE alone, and every grant, removal
// and refused attempt is logged (FR-054 to FR-056, INV-10). Staff are the users with no practice. The finance lead reads
// the log a month at a time, newest first (accessLog, EP-38, SEQ-11, FR-057).
import { sql } from 'kysely'
import { z } from 'zod'
import { useDb } from '../utils/db'
import { decodeCursor, encodeCursor, parseLimit, parsePeriod, type YearMonth } from '../utils/paging'
import { ProblemError } from '../utils/problem'
import { assertCanChangeRole } from './access-policy'
import { now } from './clock'
import type { Role, Viewer } from './session'

const STAFF_ROLES = ['finance_lead', 'operations_specialist', 'sre', 'data_analyst', 'none'] as const
const ALL_ROLES = ['patient', 'provider', ...STAFF_ROLES] as const

/** EP-37 body (openapi RoleChangeRequest). */
export const RoleChangeRequest = z.strictObject({
  role: z.enum(STAFF_ROLES),
  reason: z.string().trim().min(1, 'Add a reason so the finance lead knows why.').max(200),
  expected_role: z.enum(ALL_ROLES),
  confirm_no_finance_lead: z.boolean().default(false),
})
export type RoleChangeInput = z.infer<typeof RoleChangeRequest>

/** openapi StaffMember. */
export interface StaffMember {
  user_id: number
  display_name: string
  role: Role
  role_since: Date | null
  is_you: boolean
}
export interface StaffList {
  data: StaffMember[]
}

/** The checks made on the locked row (SEQ-10 step 6): /problems/stale-role when the dialog saw an old role, then
 *  /problems/last-finance-lead when the change would leave no finance lead and was not confirmed. */
export function checkChange(
  currentRole: string,
  input: { role: string; expected_role: string; confirm_no_finance_lead: boolean },
  otherFinanceLeads: number,
): void {
  if (input.expected_role !== currentRole) throw new ProblemError('stale-role', { currentRole })
  if (currentRole === 'finance_lead' && input.role !== 'finance_lead' && otherFinanceLeads === 0 && !input.confirm_no_finance_lead) {
    throw new ProblemError('last-finance-lead')
  }
}

const member = (viewer: Viewer, u: { id: string; display_name: string; role: string; role_changed_at: Date | null }): StaffMember => ({
  user_id: Number(u.id),
  display_name: u.display_name,
  role: u.role as Role,
  role_since: u.role_changed_at,
  is_you: BigInt(u.id) === viewer.userId,
})

/** EP-36: the operations people by display name (FR-054). The caller checked SRE_ROLES. */
export async function listStaff(viewer: Viewer): Promise<StaffList> {
  const rows = await useDb()
    .selectFrom('users')
    .select(['id', 'display_name', 'role', 'role_changed_at'])
    .where('practice_id', 'is', null)
    .orderBy('display_name')
    .orderBy('id')
    .execute()
  return { data: rows.map((u) => member(viewer, u)) }
}

/** EP-37, in lld.md's order of checks: target (404, not logged) → who may change it (403, refused row logged in its own
 *  statement so the refusal is kept) → expected role (409, not logged) → last finance lead (422, not logged) → update
 *  and granted row, in one transaction. */
export async function changeRole(actor: Viewer, targetUserId: bigint, input: RoleChangeInput): Promise<StaffMember> {
  const db = useDb()
  const target = await db
    .selectFrom('users')
    .select(['id', 'role', 'practice_id'])
    .where('id', '=', targetUserId.toString())
    .executeTakeFirst()
  if (!target || target.practice_id !== null) throw new ProblemError('not-found')

  const log = { actor_id: actor.userId.toString(), target_user_id: target.id, to_role: input.role, reason: input.reason }
  try {
    assertCanChangeRole(actor, { id: BigInt(target.id), role: target.role as Role, practiceId: null })
  } catch (e) {
    await db.insertInto('access_log').values({ ...log, from_role: target.role, outcome: 'refused' }).execute()
    throw e
  }

  return db.transaction().execute(async (tx) => {
    // One statement locks the target and every finance lead in id order, so two changes never deadlock and two
    // removals of different finance leads can't both pass the last-finance-lead check.
    const locked = await tx
      .selectFrom('users')
      .select(['id', 'role'])
      .where((eb) => eb.or([eb('id', '=', target.id), eb('role', '=', 'finance_lead')]))
      .orderBy('id')
      .forUpdate()
      .execute()
    const current = locked.find((u) => u.id === target.id)
    if (!current) throw new ProblemError('not-found')
    checkChange(current.role, input, locked.filter((u) => u.id !== target.id && u.role === 'finance_lead').length)
    const saved = await tx
      .updateTable('users')
      .set({ role: input.role, role_changed_at: now() })
      .where('id', '=', target.id)
      .returning(['id', 'display_name', 'role', 'role_changed_at'])
      .executeTakeFirstOrThrow()
    await tx.insertInto('access_log').values({ ...log, from_role: current.role, outcome: 'granted' }).execute()
    return member(actor, saved)
  })
}

/** openapi AccessLogEntry. */
export interface AccessLogEntry {
  at: string
  actor_display_name: string
  target_display_name: string
  from_role: Role
  to_role: Role
  reason: string
  outcome: 'granted' | 'refused'
}
/** openapi AccessLogPage. */
export interface AccessLogPage {
  data: AccessLogEntry[]
  next_cursor: string | null
}

export const accessLogEntry = (r: { created_at: Date; actor: string; target: string; from_role: string; to_role: string; reason: string; outcome: string }): AccessLogEntry => ({
  at: r.created_at.toISOString(),
  actor_display_name: r.actor,
  target_display_name: r.target,
  from_role: r.from_role as Role,
  to_role: r.to_role as Role,
  reason: r.reason,
  outcome: r.outcome as AccessLogEntry['outcome'],
})

/** EP-38: one month's grants, removals and refused attempts, newest first, keyset on (created_at DESC, id DESC) by
 *  ix_access_log_created (BE-22). The caller checked FINANCE_ROLES; nothing is written. */
export async function accessLog(_viewer: Viewer, month: YearMonth, cursor?: string, limit = 25): Promise<AccessLogPage> {
  const { from, toExclusive } = parsePeriod({ month })
  const n = parseLimit(String(limit), '#/limit')
  const after = cursor ? decodeCursor(cursor, '#/cursor', true) : undefined
  let q = useDb()
    .selectFrom('access_log as l')
    .innerJoin('users as a', 'a.id', 'l.actor_id')
    .innerJoin('users as t', 't.id', 'l.target_user_id')
    .select([
      'l.id',
      'l.created_at',
      // The cursor key in BE-22's form, in UTC whatever the session time zone.
      sql<string>`to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US"+00"')`.as('key'),
      'a.display_name as actor',
      't.display_name as target',
      'l.from_role',
      'l.to_role',
      'l.reason',
      'l.outcome',
    ])
    .where('l.created_at', '>=', from)
    .where('l.created_at', '<', toExclusive)
  if (after) q = q.where(sql<boolean>`(l.created_at, l.id) < (${after.key}::timestamptz, ${after.id}::bigint)`)
  const rows = await q.orderBy('l.created_at', 'desc').orderBy('l.id', 'desc').limit(n + 1).execute()
  const page = rows.slice(0, n)
  const last = page[page.length - 1]
  return { data: page.map(accessLogEntry), next_cursor: rows.length > n && last ? encodeCursor(last.key, last.id) : null }
}
