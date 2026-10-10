// BE-12 MessagingGateway (lld.md §2, SEAM-4): the stand-in notice is a row in `notices`. Its input has no field for
// items, amounts or health details, so a notice can't carry them (FR-044, LINV-5).
import { randomBytes } from 'node:crypto'
import type { Kysely } from 'kysely'
import { useDb } from '../utils/db'
import type { Database } from '../utils/db-types'
import { ProblemError } from '../utils/problem'

export interface Notice {
  practice_name: string
  sign_in_path: string
}

/** Joins the caller's transaction when given one (sendOrder); a real send would happen after commit. */
export async function sendOrderNotice(
  input: { orderId: bigint; patientId: bigint; practiceId: bigint },
  db: Kysely<Database> = useDb(),
): Promise<{ token: string }> {
  const token = randomBytes(32).toString('base64url')
  await db
    .insertInto('notices')
    .values({ order_id: input.orderId, patient_id: input.patientId, practice_id: input.practiceId, token })
    .execute()
  return { token }
}

export async function getNotice(token: string): Promise<Notice> {
  const row = await useDb()
    .selectFrom('notices')
    .innerJoin('practices', 'practices.id', 'notices.practice_id')
    .select(['practices.name', 'notices.order_id'])
    .where('notices.token', '=', token)
    .executeTakeFirst()
  if (!row) throw new ProblemError('not-found')
  return { practice_name: row.name, sign_in_path: `/sign-in?next=/orders/${row.order_id}` }
}
