// BE-3 SessionService (lld.md §2, SEQ-7): server-side sessions with a 15-minute idle limit (NFR-008, D37).
// Passwords: scrypt$<N>$<r>$<p>$<salt b64>$<hash b64> (Q-1); the stored value carries its own cost (SEAM-6).
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { deleteCookie, getCookie, getRequestHeader, getRequestIP, setCookie, type H3Event } from 'h3'
import { sql } from 'kysely'
import { useDb } from '../utils/db'
import { now } from './clock'
import { ProblemError } from '../utils/problem'

export type Role = 'patient' | 'provider' | 'finance_lead' | 'operations_specialist' | 'sre' | 'data_analyst' | 'none'

export interface Viewer {
  userId: bigint
  displayName: string
  role: Role
  practiceId: bigint | null
  idleExpiresAt: Date
}

export const SESSION_COOKIE = 'session'
const IDLE_MS = 15 * 60 * 1000

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

const hashToken = (token: string): Buffer => createHash('sha256').update(token).digest()

/** Sessions last seen at or before this time are idle (BE-20 Clock, NFR-008). */
export const idleCutoff = (): Date => new Date(now().getTime() - IDLE_MS)

// Compared against when the email is unknown. It uses the configured cost (SEAM-6 SCRYPT_COST, read per call), so
// an unknown email takes as long as a known email with a wrong password. 16384 is Node's own scrypt default.
const dummyHash = (): string =>
  `scrypt$${Number(process.env.SCRYPT_COST) || 16384}$8$1$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(64).toString('base64')}`

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const N = Number(n)
  const R = Number(r)
  const expected = Buffer.from(hash, 'base64')
  try {
    const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
      N,
      r: R,
      p: Number(p),
      maxmem: 256 * N * R,
    })
    return timingSafeEqual(actual, expected)
  } catch {
    return false // malformed stored value
  }
}

export function toViewer(u: { id: string; display_name: string; role: string; practice_id: string | null }, lastSeen: Date): Viewer {
  return {
    userId: BigInt(u.id),
    displayName: u.display_name,
    role: u.role as Role,
    practiceId: u.practice_id === null ? null : BigInt(u.practice_id),
    idleExpiresAt: new Date(lastSeen.getTime() + IDLE_MS),
  }
}

// lld.md §4 /problems/rate-limited: more than 10 sign-in attempts in 15 minutes for one email or one address.
const MAX_ATTEMPTS = 10
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const SIGN_IN_LOCK = 6006 // advisory-lock class for EP-15 attempt keys (two-int form: its own key space)

/**
 * The address EP-15's limit counts. With TRUST_PROXY=1 (behind the platform proxy) it is the last X-Forwarded-For
 * entry, the one the proxy appended; earlier entries come from the client and are ignored. Otherwise the connection
 * address. Unknown: a one-off value, so unknown addresses never share one count (the email limit still holds).
 */
export function clientAddress(event: H3Event): string {
  const ip =
    process.env.TRUST_PROXY === '1'
      ? getRequestHeader(event, 'x-forwarded-for')?.split(',').pop()?.trim()
      : getRequestIP(event)
  return ip || `unknown:${randomUUID()}`
}

/**
 * Refuses the attempt (429) when its email or address already has 10 in the window; otherwise records it. Locks the
 * email and the address first, so parallel tries for either one count and record one at a time.
 */
async function countAttempt(email: string, ip: string): Promise<void> {
  const t = now()
  const since = new Date(t.getTime() - ATTEMPT_WINDOW_MS)
  await useDb()
    .transaction()
    .execute(async (trx) => {
      // always email then address, so two tries can never wait on each other in a circle
      for (const key of [`email:${email}`, `ip:${ip}`])
        await sql`select pg_advisory_xact_lock(${SIGN_IN_LOCK}, hashtext(${key}))`.execute(trx)
      const recent = await trx
        .selectFrom('sign_in_attempts')
        .select(['email', 'ip', 'attempted_at'])
        .where('attempted_at', '>', since)
        .where((eb) => eb.or([eb('email', '=', email), eb('ip', '=', ip)]))
        .orderBy('attempted_at')
        .execute()
      let retryAt = 0
      for (const mine of [recent.filter((a) => a.email === email), recent.filter((a) => a.ip === ip)]) {
        // the next try is allowed once all but the newest 9 have left the window
        if (mine.length >= MAX_ATTEMPTS)
          retryAt = Math.max(retryAt, mine[mine.length - MAX_ATTEMPTS]!.attempted_at.getTime() + ATTEMPT_WINDOW_MS)
      }
      if (retryAt)
        throw new ProblemError('rate-limited', { retryAfterSeconds: Math.ceil((retryAt - t.getTime()) / 1000) })
      await trx.insertInto('sign_in_attempts').values({ email, ip, attempted_at: t }).execute()
      await trx.deleteFrom('sign_in_attempts').where('attempted_at', '<=', since).execute()
    })
}

export async function signIn(email: string, password: string, ip: string): Promise<{ viewer: Viewer; cookieToken: string }> {
  const db = useDb()
  await countAttempt(email.toLowerCase(), ip)
  const user = await db
    .selectFrom('users')
    .select(['id', 'display_name', 'role', 'practice_id', 'password_hash'])
    .where(sql`lower(email)`, '=', email.toLowerCase())
    .executeTakeFirst()
  const ok = await verifyPassword(password, user?.password_hash ?? dummyHash())
  if (!user || !ok) throw new ProblemError('sign-in-failed')
  const cookieToken = randomBytes(32).toString('base64url')
  const s = await db
    .insertInto('sessions')
    .values({ token_hash: hashToken(cookieToken), user_id: user.id, last_seen_at: now() })
    .returning('last_seen_at')
    .executeTakeFirstOrThrow()
  return { viewer: toViewer(user, s.last_seen_at), cookieToken }
}

/** The viewer, after moving last_seen_at forward; null when missing, ended or idle 15 minutes or more. */
export async function resolve(cookieToken: string | undefined): Promise<Viewer | null> {
  if (!cookieToken) return null
  const db = useDb()
  const tokenHash = hashToken(cookieToken)
  const live = await db
    .updateTable('sessions')
    .set({ last_seen_at: now() })
    .where('token_hash', '=', tokenHash)
    .where('ended_at', 'is', null)
    .where('last_seen_at', '>', idleCutoff())
    .returning(['user_id', 'last_seen_at'])
    .executeTakeFirst()
  if (!live) {
    await db
      .updateTable('sessions')
      .set({ ended_at: now() })
      .where('token_hash', '=', tokenHash)
      .where('ended_at', 'is', null)
      .execute()
    return null
  }
  const user = await db
    .selectFrom('users')
    .select(['id', 'display_name', 'role', 'practice_id'])
    .where('id', '=', live.user_id)
    .executeTakeFirstOrThrow()
  return toViewer(user, live.last_seen_at)
}

export async function signOut(cookieToken: string): Promise<void> {
  await useDb()
    .updateTable('sessions')
    .set({ ended_at: now() })
    .where('token_hash', '=', hashToken(cookieToken))
    .where('ended_at', 'is', null)
    .execute()
}

export function setSessionCookie(event: H3Event, cookieToken: string): void {
  setCookie(event, SESSION_COOKIE, cookieToken, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
}

/** The signed-in viewer, or 401 /problems/unauthenticated. */
export async function requireViewer(event: H3Event): Promise<Viewer> {
  const viewer = await resolve(getCookie(event, SESSION_COOKIE))
  if (!viewer) throw new ProblemError('unauthenticated')
  return viewer
}

/** The Me schema (openapi.yaml). */
export function toMe(v: Viewer) {
  return {
    user_id: Number(v.userId),
    display_name: v.displayName,
    role: v.role,
    practice_id: v.practiceId === null ? null : Number(v.practiceId),
    idle_expires_at: v.idleExpiresAt.toISOString(),
  }
}
