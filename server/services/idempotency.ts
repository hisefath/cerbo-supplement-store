// BE-5 IdempotencyGuard (lld.md §2, §4 Idempotency, SM-3, D41): a repeated mutating request gets the first request's
// stored response. Keys live in `idempotency_keys`, scoped to the signed-in person, kept 24 h.
import { createHash } from 'node:crypto'
import { getRequestHeader, getResponseStatus, setResponseHeader, setResponseStatus, type H3Event } from 'h3'
import { sql } from 'kysely'
import { useDb } from '../utils/db'
import { defineApiHandler, ProblemError } from '../utils/problem'

export interface StoredResponse {
  status: number
  body: unknown
}

export interface KeyRow {
  route: string
  request_hash: Buffer
  status: string
  response_status: number | null
  response_body: unknown
  /** in flight for 60 s or more (FM-6) */
  abandoned: boolean
}

/** SHA-256 of the canonical request: the parsed body plus path params, in schema order. */
export function requestHash(value: unknown): Buffer {
  return createHash('sha256').update(JSON.stringify(value)).digest()
}

/** What a request gets when its (user, key) already has a row (SM-3). */
export function decide(row: KeyRow, route: string, hash: Buffer): { replay: StoredResponse } | { takeOver: true } {
  if (row.route !== route || !row.request_hash.equals(hash)) throw new ProblemError('idempotency-mismatch')
  if (row.status === 'completed') return { replay: { status: row.response_status!, body: row.response_body } }
  if (row.abandoned) return { takeOver: true }
  throw new ProblemError('idempotency-in-flight')
}

export async function begin(
  userId: bigint,
  key: string | undefined,
  route: string,
  hash: Buffer,
): Promise<{ replay: StoredResponse } | { proceed: true }> {
  if (!key) throw new ProblemError('idempotency-key-missing')
  if (key.length > 255) {
    throw new ProblemError('validation', { errors: [{ pointer: '#/headers/Idempotency-Key', detail: 'At most 255 characters.' }] })
  }
  const db = useDb()
  const user = userId.toString()
  // Q-5: expired keys are purged on write.
  await db.deleteFrom('idempotency_keys').where('expires_at', '<=', sql<Date>`now()`).execute()
  const inserted = await db
    .insertInto('idempotency_keys')
    .values({ user_id: user, key, route, request_hash: hash, expires_at: sql<Date>`now() + interval '24 hours'` })
    .onConflict((oc) => oc.doNothing())
    .returning('key')
    .executeTakeFirst()
  if (inserted) return { proceed: true }

  const row = await db
    .selectFrom('idempotency_keys')
    .select(['route', 'request_hash', 'status', 'response_status', 'response_body', sql<boolean>`created_at <= now() - interval '60 seconds'`.as('abandoned')])
    .where('user_id', '=', user)
    .where('key', '=', key)
    .executeTakeFirst()
  // ponytail: a row released between our insert and this read answers in-flight; the client's retry then proceeds.
  if (!row) throw new ProblemError('idempotency-in-flight')
  const d = decide(row, route, hash)
  if ('replay' in d) return d
  // FM-6: take over an abandoned in-flight key, only if no other request took it first.
  const taken = await db
    .updateTable('idempotency_keys')
    .set({ created_at: sql<Date>`now()`, expires_at: sql<Date>`now() + interval '24 hours'` })
    .where('user_id', '=', user)
    .where('key', '=', key)
    .where('status', '=', 'in_flight')
    .where(sql<boolean>`created_at <= now() - interval '60 seconds'`)
    .returning('key')
    .executeTakeFirst()
  if (!taken) throw new ProblemError('idempotency-in-flight')
  return { proceed: true }
}

export async function complete(userId: bigint, key: string, status: number, body: unknown): Promise<void> {
  await useDb()
    .updateTable('idempotency_keys')
    .set({ status: 'completed', response_status: status, response_body: JSON.stringify(body ?? null) })
    .where('user_id', '=', userId.toString())
    .where('key', '=', key)
    .where('status', '=', 'in_flight')
    .execute()
}

/** Deletes the in-flight row so a retry with the same key can run (SM-3 release). */
export async function release(userId: bigint, key: string): Promise<void> {
  await useDb()
    .deleteFrom('idempotency_keys')
    .where('user_id', '=', userId.toString())
    .where('key', '=', key)
    .where('status', '=', 'in_flight')
    .execute()
}

function send(event: H3Event, r: StoredResponse) {
  setResponseStatus(event, r.status)
  if (r.status >= 400) setResponseHeader(event, 'content-type', 'application/problem+json')
  return r.body
}

/** Only a success is stored and replayed. Every problem (4xx, the 502 of a failed payment) and every 5xx releases the
 *  key, so the same key can be retried once the cause is fixed (BE-5 release; SEQ-1 a2/a3, SEQ-2 a3 and alts). */
export function storesResponse(status: number): boolean {
  return status < 400
}

/** BE-1 wrapping for a guarded mutation: begin, run `work` (its problems become responses), then complete a success
 *  or release the key. */
export async function guard<T>(event: H3Event, userId: bigint, route: string, request: unknown, work: (key: string) => Promise<T>): Promise<T> {
  const key = getRequestHeader(event, 'idempotency-key')
  const started = await begin(userId, key, route, requestHash(request))
  if ('replay' in started) return send(event, started.replay) as T
  const body = await defineApiHandler(() => work(key!))(event)
  const status = getResponseStatus(event)
  if (storesResponse(status)) await complete(userId, key!, status, body)
  else await release(userId, key!)
  return body
}
