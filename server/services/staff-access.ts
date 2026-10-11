// BE-18 StaffAccessService (lld.md §2, SEQ-10): operations roles change through the SRE alone, and every grant, removal
// and refused attempt is logged (FR-054 to FR-056, INV-10). Staff are the users with no practice. The access log list
// (accessLog, EP-38) joins this file in M6-T003.
import { z } from 'zod'
import { useDb } from '../utils/db'
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
