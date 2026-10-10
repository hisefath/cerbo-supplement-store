// BE-3 SessionService (lld.md §2, SEQ-7): server-side sessions with a 15-minute idle limit (NFR-008, D37).
// Passwords: scrypt$<N>$<r>$<p>$<salt b64>$<hash b64> (Q-1); the stored value carries its own cost (SEAM-6).
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { getCookie, setCookie, type H3Event } from 'h3'
import { sql } from 'kysely'
import { useDb } from '../utils/db'
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

// Compared against when the email is unknown. It uses the configured cost (SEAM-6 SCRYPT_COST, read per call), so
// an unknown email takes as long as a known email with a wrong password. 16384 is Node's own scrypt default.
const dummyHash = (): string =>
  `scrypt$${Number(process.env.SCRYPT_COST) || 16384}$8$1$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(64).toString('base64')}`

async function verifyPassword(password: string, stored: string): Promise<boolean> {
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

function toViewer(u: { id: string; display_name: string; role: string; practice_id: string | null }, lastSeen: Date): Viewer {
  return {
    userId: BigInt(u.id),
    displayName: u.display_name,
    role: u.role as Role,
    practiceId: u.practice_id === null ? null : BigInt(u.practice_id),
    idleExpiresAt: new Date(lastSeen.getTime() + IDLE_MS),
  }
}

// ponytail: no sign-in rate limit yet (lld §4 says 10 tries / 15 min per email or address); no table holds the
// counts and counting every attempt would refuse the acceptance suite's repeated sign-ins. See result.md Questions.
export async function signIn(email: string, password: string, _ip: string): Promise<{ viewer: Viewer; cookieToken: string }> {
  const db = useDb()
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
    .values({ token_hash: hashToken(cookieToken), user_id: user.id })
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
    .set({ last_seen_at: sql`now()` })
    .where('token_hash', '=', tokenHash)
    .where('ended_at', 'is', null)
    .where('last_seen_at', '>', sql<Date>`now() - interval '15 minutes'`)
    .returning(['user_id', 'last_seen_at'])
    .executeTakeFirst()
  if (!live) {
    await db
      .updateTable('sessions')
      .set({ ended_at: sql`now()` })
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
    .set({ ended_at: sql`now()` })
    .where('token_hash', '=', hashToken(cookieToken))
    .where('ended_at', 'is', null)
    .execute()
}

export function setSessionCookie(event: H3Event, cookieToken: string): void {
  setCookie(event, SESSION_COOKIE, cookieToken, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
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
