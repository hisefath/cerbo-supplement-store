// BE-3 SessionService, BE-20 Clock, EP-15 rate limit, EP-16 sign-out and BE-2's `next=` check (lld.md §2, §4, SEQ-7,
// SEAM-1, SEAM-6). No database: a fake Kysely driver records the SQL and answers each statement from `answer`.
import { createHash, randomBytes, scryptSync } from 'node:crypto'
import { createApp, toWebHandler } from 'h3'
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { freezeClock, now } from '../../server/services/clock'
import { clientAddress, idleCutoff, signIn, signOut, toMe, toViewer, verifyPassword } from '../../server/services/session'
import { ProblemError } from '../../server/utils/problem'
import signOutHandler from '../../server/api/session/index.delete'
import signInHandler from '../../server/api/session/index.post'

const fake = vi.hoisted(() => ({
  queries: [] as { sql: string; parameters: readonly unknown[] }[],
  answer: (_sql: string): unknown[] => [],
}))
vi.mock('../../server/utils/db', () => ({
  useDb: () =>
    new Kysely<any>({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createQueryCompiler: () => new PostgresQueryCompiler(),
        createIntrospector: (db) => new PostgresIntrospector(db),
        createDriver: () => ({
          init: async () => {},
          acquireConnection: async () => ({
            executeQuery: async (q: CompiledQuery) => {
              fake.queries.push({ sql: q.sql, parameters: q.parameters })
              return { rows: fake.answer(q.sql) as any[] }
            },
            streamQuery: () => {
              throw new Error('not used')
            },
          }),
          beginTransaction: async () => void fake.queries.push({ sql: 'begin', parameters: [] }),
          commitTransaction: async () => void fake.queries.push({ sql: 'commit', parameters: [] }),
          rollbackTransaction: async () => void fake.queries.push({ sql: 'rollback', parameters: [] }),
          releaseConnection: async () => {},
          destroy: async () => {},
        }),
      },
    }),
}))

const MIN = 60 * 1000
const T0 = new Date('2026-10-10T12:00:00Z')
const sha256 = (s: string) => createHash('sha256').update(s).digest()
const sqlOf = (start: string) => fake.queries.filter((q) => q.sql.startsWith(start))

beforeEach(() => {
  fake.queries.length = 0
  fake.answer = () => []
})

function hashFor(password: string, N = 1024, r = 8, p = 1): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64, { N, r, p })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`
}

afterEach(() => freezeClock(null))

describe('Clock (BE-20, SEAM-1)', () => {
  it('tells the system time unless frozen', () => {
    const before = Date.now()
    const t = now().getTime()
    expect(t).toBeGreaterThanOrEqual(before)
    expect(t).toBeLessThanOrEqual(Date.now())
  })
  it('a frozen clock returns the frozen time until unfrozen', () => {
    const at = new Date('2026-10-10T12:00:00Z')
    freezeClock(at)
    expect(now().toISOString()).toBe(at.toISOString())
    freezeClock(new Date(at.getTime() + 16 * MIN))
    expect(now().getTime() - at.getTime()).toBe(16 * MIN)
    freezeClock(null)
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000)
  })
})

describe('verifyPassword: Q-1 scrypt$N$r$p$salt$hash', () => {
  const stored = hashFor('correct horse')
  it('accepts the right password', async () => {
    expect(await verifyPassword('correct horse', stored)).toBe(true)
  })
  it('refuses a wrong password', async () => {
    expect(await verifyPassword('wrong horse', stored)).toBe(false)
  })
  it('refuses a malformed or foreign stored value instead of throwing', async () => {
    expect(await verifyPassword('correct horse', 'bcrypt$whatever')).toBe(false)
    expect(await verifyPassword('correct horse', '')).toBe(false)
    expect(await verifyPassword('correct horse', stored.replace('$1024$', '$1000$'))).toBe(false) // N not a power of 2
  })
})

describe('idle limit: 15 minutes (FR-041, NFR-008, AE-039)', () => {
  it('the cutoff is 15 minutes before the clock: 14 idle minutes is live, 16 is not', () => {
    const at = new Date('2026-10-10T12:00:00Z')
    freezeClock(at)
    const cutoff = idleCutoff()
    expect(at.getTime() - cutoff.getTime()).toBe(15 * MIN)
    expect(new Date(at.getTime() - 14 * MIN) > cutoff).toBe(true)
    expect(new Date(at.getTime() - 16 * MIN) > cutoff).toBe(false)
    expect(new Date(at.getTime() - 15 * MIN) > cutoff).toBe(false) // exactly 15 minutes idle is signed out
  })
  it('the viewer expires 15 minutes after last activity; Me carries it as ISO time', () => {
    const lastSeen = new Date('2026-10-10T12:00:00Z')
    const v = toViewer({ id: '7', display_name: 'Ana Ruiz', role: 'patient', practice_id: '3' }, lastSeen)
    expect(v.idleExpiresAt.toISOString()).toBe('2026-10-10T12:15:00.000Z')
    expect(toMe(v)).toEqual({
      user_id: 7,
      display_name: 'Ana Ruiz',
      role: 'patient',
      practice_id: 3,
      idle_expires_at: '2026-10-10T12:15:00.000Z',
    })
    expect(toMe(toViewer({ id: '9', display_name: 'Omar', role: 'sre', practice_id: null }, lastSeen)).practice_id).toBeNull()
  })
})

describe('EP-15 rate limit: more than 10 attempts in 15 minutes for one email or one address (lld.md §4)', () => {
  const chen = { id: '2', display_name: 'Dr. Chen', role: 'provider', practice_id: '3', password_hash: hashFor('pw') }
  const attempts = (n: number, who: { email?: string; ip?: string }, firstMinAgo = 14) =>
    Array.from({ length: n }, (_, i) => ({
      email: who.email ?? 'other@example.test',
      ip: who.ip ?? '10.0.0.9',
      attempted_at: new Date(T0.getTime() - (firstMinAgo - i) * MIN),
    }))
  function world(rows: ReturnType<typeof attempts>) {
    fake.answer = (s) =>
      s.startsWith('select') && s.includes('"sign_in_attempts"')
        ? rows
        : s.startsWith('select') && s.includes('"users"')
          ? [chen]
          : s.startsWith('insert into "sessions"')
            ? [{ last_seen_at: now() }]
            : []
  }

  it('the 11th attempt for one email is refused with 429 rate-limited and when to retry; no password check, nothing recorded', async () => {
    freezeClock(T0)
    world(attempts(10, { email: 'chen@example.test' }))
    const err = await signIn('Chen@Example.test', 'pw', '10.0.0.1').catch((e) => e)
    expect(err).toBeInstanceOf(ProblemError)
    expect(err.slug).toBe('rate-limited')
    expect(err.extensions).toEqual({ retryAfterSeconds: 60 }) // the oldest of the 10 leaves the window in 1 minute
    expect(sqlOf('select').some((q) => q.sql.includes('"users"'))).toBe(false)
    expect(sqlOf('insert')).toEqual([])
  })

  it('the 11th attempt from one address is refused too, whatever the email', async () => {
    freezeClock(T0)
    world(attempts(10, { ip: '10.0.0.1' }, 5))
    const err = await signIn('chen@example.test', 'pw', '10.0.0.1').catch((e) => e)
    expect(err.slug).toBe('rate-limited')
    expect(err.extensions).toEqual({ retryAfterSeconds: 10 * 60 })
  })

  it('the 10th attempt goes through, is recorded (email lower-cased) and only the last 15 minutes count', async () => {
    freezeClock(T0)
    world(attempts(9, { email: 'chen@example.test', ip: '10.0.0.1' }))
    const { viewer } = await signIn('Chen@Example.test', 'pw', '10.0.0.1')
    expect(viewer.displayName).toBe('Dr. Chen')
    const count = sqlOf('select').find((q) => q.sql.includes('"sign_in_attempts"'))!
    expect(count.sql).toContain('"attempted_at" >')
    expect(count.parameters).toContainEqual(new Date(T0.getTime() - 15 * MIN))
    const [recorded] = sqlOf('insert into "sign_in_attempts"')
    expect(recorded.parameters).toEqual(expect.arrayContaining(['chen@example.test', '10.0.0.1']))
  })

  it('counts attempts for the same email OR the same address (never AND)', async () => {
    freezeClock(T0)
    world([])
    await signIn('chen@example.test', 'pw', '10.0.0.1')
    const count = sqlOf('select').find((q) => q.sql.includes('"sign_in_attempts"'))!
    expect(count.sql).toMatch(/\("email" = \$\d+ or "ip" = \$\d+\)/)
    expect(count.sql).not.toMatch(/"email" = \$\d+ and "ip"/)
  })

  it('holds under parallel tries: locks the email and the address, then counts and records, in one transaction', async () => {
    freezeClock(T0)
    world([])
    await signIn('Chen@Example.test', 'pw', '10.0.0.1')
    const steps = fake.queries.map((q) =>
      q.sql === 'begin' || q.sql === 'commit'
        ? q.sql
        : q.sql.includes('pg_advisory_xact_lock')
          ? `lock ${q.parameters.at(-1)}`
          : q.sql.includes('"sign_in_attempts"')
            ? q.sql.split(' ')[0]
            : null,
    )
    expect(steps.filter(Boolean).slice(0, 7)).toEqual([
      'begin',
      'lock email:chen@example.test',
      'lock ip:10.0.0.1',
      'select',
      'insert',
      'delete',
      'commit',
    ])
  })

  it('a wrong password is still one recorded attempt and answers sign-in-failed', async () => {
    freezeClock(T0)
    world([])
    const err = await signIn('chen@example.test', 'wrong', '10.0.0.1').catch((e) => e)
    expect(err.slug).toBe('sign-in-failed')
    expect(sqlOf('insert into "sign_in_attempts"')).toHaveLength(1)
    expect(sqlOf('insert into "sessions"')).toEqual([])
  })
})

describe('EP-15 reads only application/json bodies (no sign-in by a cross-site form post)', () => {
  const post = (type: string, body: string) =>
    toWebHandler(createApp().use(signInHandler))(
      new Request('http://localhost/api/session', { method: 'POST', headers: { 'content-type': type }, body }),
    )
  it('text/plain or a form post with valid JSON-looking content is 422 validation and never checked', async () => {
    const json = JSON.stringify({ email: 'chen@example.test', password: 'pw' })
    for (const [type, body] of [
      ['text/plain', json],
      ['text/plain;charset=UTF-8', json],
      ['application/x-www-form-urlencoded', 'email=chen%40example.test&password=pw'],
      ['multipart/form-data; boundary=x', '--x--'],
    ]) {
      const res = await post(type!, body!)
      expect(res.status, type).toBe(422)
      expect((await res.json()).type).toBe('/problems/validation')
    }
    expect(fake.queries).toEqual([])
  })
  it('application/json (any charset) is read', async () => {
    fake.answer = () => []
    const res = await post('application/json; charset=utf-8', JSON.stringify({ email: 'nobody@example.test', password: 'pw' }))
    expect((await res.json()).type).toBe('/problems/sign-in-failed')
  })
})

describe('EP-16 DELETE /api/session: sign out (FR-041)', () => {
  const run = (cookie?: string) =>
    toWebHandler(createApp().use(signOutHandler))(
      new Request('http://localhost/api/session', { method: 'DELETE', headers: cookie ? { cookie } : {} }),
    )

  it('204, the session cookie cleared and the session ended', async () => {
    freezeClock(T0)
    fake.answer = (s) =>
      s.startsWith('update "sessions" set "last_seen_at"')
        ? [{ user_id: '2', last_seen_at: T0 }]
        : s.startsWith('select')
          ? [{ id: '2', display_name: 'Dr. Chen', role: 'provider', practice_id: '3' }]
          : []
    const res = await run('session=tok-1')
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    const cleared = res.headers.getSetCookie().find((c) => c.startsWith('session='))
    expect(cleared).toMatch(/^session=;.*Max-Age=0/i)
    expect(cleared).toMatch(/HttpOnly/i)
    const ended = sqlOf('update "sessions" set "ended_at"')
    expect(ended).toHaveLength(1)
    expect(ended[0].sql).toContain('"ended_at" is null')
    expect(ended[0].parameters).toEqual([T0, sha256('tok-1')])
  })

  it('401 unauthenticated when nobody is signed in, and nothing is ended', async () => {
    const res = await run()
    expect(res.status).toBe(401)
    expect((await res.json()).type).toBe('/problems/unauthenticated')
    expect(sqlOf('update')).toEqual([])
  })

  it('signOut ends only a live session with that token', async () => {
    freezeClock(T0)
    await signOut('tok-2')
    expect(fake.queries).toEqual([
      { sql: 'update "sessions" set "ended_at" = $1 where "token_hash" = $2 and "ended_at" is null', parameters: [T0, sha256('tok-2')] },
    ])
  })
})

describe('BE-2 page guard and the sign-in `next=` check', () => {
  const nav = vi.fn()
  let session: () => Promise<unknown>
  async function guard() {
    vi.stubGlobal('defineNuxtRouteMiddleware', (f: unknown) => f)
    vi.stubGlobal('useRequestFetch', () => () => session())
    vi.stubGlobal('navigateTo', nav)
    vi.stubGlobal('useCookie', () => ({ value: undefined }))
    vi.stubGlobal('useNuxtData', () => ({ data: { value: undefined } }))
    return import('../../app/middleware/auth.global')
  }
  afterEach(() => {
    vi.unstubAllGlobals()
    nav.mockReset()
  })

  it('accepts only same-site paths; anything a browser would take off-site is refused', async () => {
    const { safeNext } = await guard()
    expect(safeNext('/orders/1001')).toBe('/orders/1001')
    expect(safeNext('/ops/orders?status=paid#top')).toBe('/ops/orders?status=paid#top')
    for (const bad of [
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      '/..//evil.example',
      '/\n/evil.example',
      '\\/evil.example',
      'https://evil.example/x',
      'javascript:alert(1)',
      'orders/1001',
      '',
      undefined,
      ['/orders/1'],
    ])
      expect(safeNext(bad), JSON.stringify(bad)).toBeNull()
  })

  it('a signed-out visitor is sent to sign-in with next (303); a signed-in one passes', async () => {
    const { default: mw } = await guard()
    session = async () => ({ role: 'patient' })
    await (mw as any)({ path: '/orders/1001', fullPath: '/orders/1001' })
    expect(nav).not.toHaveBeenCalled()
    session = async () => Promise.reject({ statusCode: 401 })
    await (mw as any)({ path: '/orders/1001', fullPath: '/orders/1001' })
    expect(nav).toHaveBeenCalledWith({ path: '/sign-in', query: { next: '/orders/1001' } }, { redirectCode: 303 })
  })

  it('fails closed: a session check that errors sends the person to sign-in, not to the page', async () => {
    const { default: mw } = await guard()
    session = async () => Promise.reject({ statusCode: 500 })
    await (mw as any)({ path: '/orders/1001', fullPath: '/orders/1001' })
    expect(nav).toHaveBeenCalledWith({ path: '/sign-in', query: { next: '/orders/1001' } }, { redirectCode: 303 })
    nav.mockReset()
    session = async () => Promise.reject(new TypeError('fetch failed'))
    await (mw as any)({ path: '/ops/orders', fullPath: '/ops/orders' })
    expect(nav).toHaveBeenCalledTimes(1)
  })

  it('the sign-in and notice pages are public', async () => {
    const { default: mw } = await guard()
    session = async () => Promise.reject({ statusCode: 401 })
    await (mw as any)({ path: '/sign-in', fullPath: '/sign-in?next=/orders/1' })
    await (mw as any)({ path: '/notices/abc', fullPath: '/notices/abc' })
    expect(nav).not.toHaveBeenCalled()
  })
})

describe('EP-15 the address the limit counts (TRUST_PROXY)', () => {
  const req = (headers: Record<string, string>, remoteAddress?: string) =>
    ({ context: {}, node: { req: { headers, socket: { remoteAddress } } } }) as any
  afterEach(() => vi.unstubAllEnvs())

  it('without TRUST_PROXY=1 the connection address is used and a forwarded header is ignored', () => {
    vi.stubEnv('TRUST_PROXY', '')
    expect(clientAddress(req({ 'x-forwarded-for': '6.6.6.6' }, '10.0.0.7'))).toBe('10.0.0.7')
  })

  it('with TRUST_PROXY=1 the address the platform proxy appended (the last forwarded entry) is used', () => {
    vi.stubEnv('TRUST_PROXY', '1')
    expect(clientAddress(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.5' }, '10.0.0.7'))).toBe('203.0.113.5')
    expect(clientAddress(req({ 'x-forwarded-for': '203.0.113.5' }, '10.0.0.7'))).toBe('203.0.113.5')
  })

  it('an unknown address never shares one count with other unknown addresses', () => {
    vi.stubEnv('TRUST_PROXY', '1')
    const a = clientAddress(req({}, '10.0.0.7'))
    const b = clientAddress(req({}, '10.0.0.7'))
    vi.stubEnv('TRUST_PROXY', '')
    const c = clientAddress(req({}))
    expect(new Set([a, b, c]).size).toBe(3)
    for (const x of [a, b, c]) expect(x).toMatch(/^unknown:/)
  })
})
