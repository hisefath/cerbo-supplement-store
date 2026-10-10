// M4-T901 GET /healthz (docs/ops/HEALTH.md §1): 200 "ok" after one `select 1`, 503 "unavailable" on a database
// error or a 2 s timeout, Cache-Control: no-store, nothing else in the body. No database: a fake Kysely driver.
import { createApp, createRouter, toWebHandler } from 'h3'
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../server/routes/healthz.get'

const fake = vi.hoisted(() => ({
  queries: [] as string[],
  answer: async (): Promise<unknown[]> => [{ '?column?': 1 }],
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
              fake.queries.push(q.sql)
              return { rows: (await fake.answer()) as any[] }
            },
            streamQuery: () => {
              throw new Error('not used')
            },
          }),
          beginTransaction: async () => {},
          commitTransaction: async () => {},
          rollbackTransaction: async () => {},
          releaseConnection: async () => {},
          destroy: async () => {},
        }),
      },
    }),
}))

const app = createApp()
app.use(createRouter().get('/healthz', handler))
const web = toWebHandler(app)
const get = () => web(new Request('http://localhost/healthz'))

describe('GET /healthz', () => {
  let logged: unknown[][]
  beforeEach(() => {
    fake.queries = []
    logged = []
    vi.spyOn(console, 'error').mockImplementation((...args) => void logged.push(args))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('answers 200 "ok" with no-store after one select 1', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(fake.queries).toEqual(['select 1'])
    expect(logged).toEqual([])
  })

  it('answers 503 "unavailable" when the query fails, logging only errorFacts', async () => {
    fake.answer = async () => {
      throw Object.assign(new Error('password authentication failed for user "secret_user"'), { code: '28P01' })
    }
    const res = await get()
    expect(res.status).toBe(503)
    expect(await res.text()).toBe('unavailable')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(logged).toEqual([['healthz: database unavailable', { error: 'Error', code: '28P01' }]])
    expect(JSON.stringify(logged)).not.toContain('secret_user')
  })

  it('answers 503 "unavailable" when the query does not answer within 2 seconds', async () => {
    vi.useFakeTimers()
    fake.answer = () => new Promise(() => {})
    const pending = get()
    await vi.advanceTimersByTimeAsync(1999)
    let settled = false
    void pending.then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const res = await pending
    expect(res.status).toBe(503)
    expect(await res.text()).toBe('unavailable')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
