// M4-T011 security hardening before G5: SEC-4 and SEC-8 headers, SEC-6 absolute session lifetime, SEC-7 safe error
// logs, SEC-9 EP-23 rate limit, SEC-11 attempt retention. No database: a fake Kysely driver records the SQL.
import { createApp, createRouter, toWebHandler } from 'h3'
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { freezeClock } from '../../server/services/clock'
import { requestHash } from '../../server/services/idempotency'
import { answerWithin } from '../../server/services/payment-gateway'
import { countPayAttempt } from '../../server/services/payments'
import { resolve } from '../../server/services/session'
import { defineApiHandler, errorFacts, ProblemError } from '../../server/utils/problem'
import payHandler from '../../server/api/orders/[orderId]/payments.post'

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

beforeEach(() => {
  fake.queries.length = 0
  fake.answer = () => []
  freezeClock(T0)
})
afterEach(() => {
  freezeClock(null)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SEC-4, SEC-8, SEC-11: nuxt.config.ts', () => {
  async function config() {
    vi.stubGlobal('defineNuxtConfig', (c: unknown) => c)
    return (await import('../../nuxt.config')).default as any
  }

  it('every response carries CSP with frame-ancestors, nosniff, a referrer policy and HSTS', async () => {
    const c = await config()
    const h = c.$production.routeRules['/**'].headers
    const csp: string = h['Content-Security-Policy']
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("style-src 'self';")
    expect(csp).not.toContain('unsafe-')
    // the one inline script Nuxt renders (its runtime config, for this build's id) is allowed by hash, nothing else
    const { createHash } = await import('node:crypto')
    const { NUXT_CONFIG_SCRIPT } = await import('../../nuxt.config')
    expect(NUXT_CONFIG_SCRIPT).toContain(`buildId:"${c.buildId}"`)
    expect(csp).toContain(`script-src 'self' 'sha256-${createHash('sha256').update(NUXT_CONFIG_SCRIPT).digest('base64')}';`)
    expect(c.features.inlineStyles).toBe(false)
    expect(c.experimental.entryImportMap).toBe(false)
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains')
  })

  it('API, order (S2) and operations (S3, S4) responses are no-store', async () => {
    const rules = (await config()).routeRules
    for (const path of ['/api/**', '/orders/**', '/ops/**']) expect(rules[path].headers['Cache-Control'], path).toBe('no-store')
  })

  it('the attempt-pruning task runs at least hourly', async () => {
    const nitro = (await config()).nitro
    expect(nitro.experimental.tasks).toBe(true)
    const [cron, tasks] = Object.entries(nitro.scheduledTasks)[0]! as [string, string[]]
    expect(cron).toBe('*/15 * * * *')
    expect(tasks).toEqual(['prune-attempts'])
  })
})

describe('SEC-6: absolute session lifetime of 12 hours', () => {
  it('a session created 12 hours ago or more is not live however recently it was used, and is ended', async () => {
    const out = await resolve('token')
    expect(out).toBeNull()
    const live = fake.queries[0]!
    expect(live.sql).toContain('"created_at" >')
    expect(live.parameters).toContainEqual(new Date(T0.getTime() - 12 * 60 * MIN))
    expect(live.parameters).toContainEqual(new Date(T0.getTime() - 15 * MIN))
    expect(fake.queries[1]!.sql).toMatch(/^update "sessions" set "ended_at"/)
  })
})

describe('SEC-7: logs never carry the error object or its message', () => {
  const dbError = () =>
    Object.assign(new Error('new row violates check constraint "ck_orders_payout_nonneg": Failing row contains (1001, 4999, Ana Ruiz)'), {
      code: '23514',
      constraint: 'ck_orders_payout_nonneg',
    })
  const logged = (spy: { mock: { calls: unknown[][] } }) => JSON.stringify(spy.mock.calls)

  it('errorFacts keeps the class name, PostgreSQL code and constraint only', () => {
    expect(errorFacts(dbError())).toEqual({ error: 'Error', code: '23514', constraint: 'ck_orders_payout_nonneg' })
    class TypeOops extends Error {}
    expect(errorFacts(new TypeOops('Ana Ruiz'))).toEqual({ error: 'TypeOops' })
    expect(errorFacts('a string with 4999')).toEqual({ error: 'string' })
    expect(errorFacts(null)).toEqual({ error: 'null' })
  })

  it('the unexpected-error log writes the instance id and facts, not the row', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await toWebHandler(createApp().use(defineApiHandler(async () => { throw dbError() })))(new Request('http://localhost/x'))
    const body = await res.json()
    expect(res.status).toBe(500)
    const text = logged(spy)
    expect(text).toContain(body.instance)
    expect(text).toContain('23514')
    expect(text).not.toContain('Failing row')
    expect(text).not.toContain('Ana Ruiz')
    expect(spy.mock.calls.flat().some((a) => a instanceof Error)).toBe(false)
  })

  it('the gateway exception log does not carry the error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await answerWithin(Promise.reject(new Error('card 4242 for Ana Ruiz')))).toEqual({ outcome: 'failed', reason: 'no_answer' })
    expect(logged(spy)).not.toContain('Ana Ruiz')
    expect(spy.mock.calls.flat().some((a) => a instanceof Error)).toBe(false)
  })
})

describe('SEC-9: EP-23 rate limit, more than 10 payment attempts in 15 minutes for one person or one address', () => {
  const attempts = (n: number, who: { user_id?: string; ip?: string }) =>
    Array.from({ length: n }, (_, i) => ({
      user_id: who.user_id ?? '99',
      ip: who.ip ?? '10.0.0.9',
      attempted_at: new Date(T0.getTime() - (14 - i) * MIN),
    }))
  const rows = (r: unknown[]) => (fake.answer = (s) => (s.startsWith('select') && s.includes('"pay_rate_attempts"') ? r : []))

  it('the 10th attempt is recorded; locks come first, all in one transaction', async () => {
    rows(attempts(9, { user_id: '7' }))
    await countPayAttempt(7n, '10.0.0.1')
    const sqls = fake.queries.map((q) => q.sql)
    expect(sqls[0]).toBe('begin')
    expect(sqls[1]).toContain('pg_advisory_xact_lock')
    expect(sqls[2]).toContain('pg_advisory_xact_lock')
    expect(sqls[3]).toMatch(/^select .* from "pay_rate_attempts"/)
    expect(sqls).toContainEqual(expect.stringMatching(/^insert into "pay_rate_attempts"/))
    expect(sqls.at(-1)).toBe('commit')
  })

  for (const [who, extra] of [
    ['one person', { user_id: '7' }],
    ['one address', { ip: '10.0.0.1' }],
  ] as const) {
    it(`the 11th attempt for ${who} is 429 rate-limited with retryAfterSeconds, nothing recorded`, async () => {
      rows(attempts(10, extra))
      const err = await countPayAttempt(7n, '10.0.0.1').catch((e) => e)
      expect(err).toBeInstanceOf(ProblemError)
      expect(err.slug).toBe('rate-limited')
      expect(err.extensions.retryAfterSeconds).toBe(60) // the oldest of 10 leaves the window at T0 + 1 min
      expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
      expect(fake.queries.at(-1)!.sql).toBe('rollback')
    })
  }

  it('a replayed idempotent response is not counted', async () => {
    const receipt = { order_id: 1001, amount_paid_cents: 4999 }
    fake.answer = (s) =>
      s.startsWith('update "sessions" set "last_seen_at"')
        ? [{ user_id: '7', last_seen_at: T0 }]
        : s.startsWith('select') && s.includes('"users"')
          ? [{ id: '7', display_name: 'Ana', role: 'patient', practice_id: '3' }]
          : s.startsWith('select') && s.includes('"idempotency_keys"')
            ? [{
                route: 'POST /api/orders/{orderId}/payments',
                request_hash: requestHash({ orderId: '1001' }),
                status: 'completed',
                response_status: 201,
                response_body: receipt,
                abandoned: false,
              }]
            : []
    const res = await toWebHandler(createApp().use(createRouter().post('/api/orders/:orderId/payments', payHandler)))(
      new Request('http://localhost/api/orders/1001/payments', {
        method: 'POST',
        headers: { cookie: 'session=abc', 'idempotency-key': 'k1' },
      }),
    )
    expect(res.status).toBe(201)
    expect(fake.queries.some((q) => q.sql.includes('pay_rate_attempts'))).toBe(false)
  })
})

describe('SEC-11: scheduled pruning of attempt rows', () => {
  it('deletes sign-in and payment attempts older than 15 minutes', async () => {
    vi.stubGlobal('defineTask', (t: unknown) => t)
    const task = (await import('../../server/tasks/prune-attempts')).default as any
    expect(task.meta.name).toBe('prune-attempts')
    await task.run({})
    const deletes = fake.queries.filter((q) => q.sql.startsWith('delete'))
    expect(deletes.map((d) => d.sql.match(/from "(\w+)"/)![1]).sort()).toEqual(['pay_rate_attempts', 'sign_in_attempts'])
    for (const d of deletes) expect(d.parameters).toEqual([new Date(T0.getTime() - 15 * MIN)])
  })
})
