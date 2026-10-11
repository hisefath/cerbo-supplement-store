// BE-19 RequestMetrics, pure parts and FM-8 (lld.md §2, D87): route groups never carry ids, the availability window
// counts 5-minute slots from the first ping ever, and a failed stats or ping write never rejects. The SQL against the
// real tables is proved by tests/acceptance/M6/system-health.test.ts (AT-034 to AT-037).
import { afterEach, describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => ({ fail: false, queries: [] as { sql: string; parameters: readonly unknown[] }[] }))
vi.mock('../../server/utils/db', async () => {
  const { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } = await import('kysely')
  return {
    useDb: () =>
      new Kysely<any>({
        dialect: {
          createAdapter: () => new PostgresAdapter(),
          createQueryCompiler: () => new PostgresQueryCompiler(),
          createIntrospector: (db) => new PostgresIntrospector(db),
          createDriver: () => ({
            init: async () => {},
            acquireConnection: async () => ({
              executeQuery: async (q: { sql: string; parameters: readonly unknown[] }) => {
                if (fake.fail) throw Object.assign(new Error('row (42, "Ana Patient") violates'), { code: '23514' })
                fake.queries.push(q)
                return { rows: [] }
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
  }
})

const { percent, record, recordPing, routeGroup, slotWindow } = await import('../../server/services/request-metrics')
const { freezeClock } = await import('../../server/services/clock')

afterEach(() => {
  fake.fail = false
  fake.queries = []
  freezeClock(null)
  vi.restoreAllMocks()
})

describe('routeGroup', () => {
  it.each([
    ['/api/orders/1042', 'api.orders'],
    ['/api/orders/1042/payments?x=1', 'api.orders'],
    ['/api/session', 'api.session'],
    ['/api/ops/system-health?month=2025-10', 'api.ops'],
    ['/patients/7/supplements', 'page.S1'],
    ['/orders/1042', 'page.S2'],
    ['/ops/orders', 'page.S3'],
    ['/ops/orders/1042', 'page.S4'],
    ['/sign-in?next=/ops/system', 'page.S8'],
    ['/notices/abc123', 'page.S9'],
    ['/ops/access-log', 'page.S13'],
    ['/ops/system/', 'page.S14'],
  ])('%s -> %s', (path, group) => {
    expect(routeGroup(path)).toBe(group)
  })

  it.each(['/healthz', '/version', '/_nuxt/entry.js', '/', '/favicon.ico', '/api/ana-patient', '/api/', '/orders/1/extra'])(
    'does not count %s',
    (path) => {
      expect(routeGroup(path)).toBeNull()
    },
  )
})

describe('slotWindow (D87)', () => {
  const at = new Date('2026-10-11T12:07:30Z')
  it('a past month pinged from its first instant has 31 × 288 slots', () => {
    expect(slotWindow('2025-10', at, new Date('2025-10-01T00:00:00Z')).slots).toBe(8928)
  })
  it('starts at the first ping ever, truncated to its slot', () => {
    const w = slotWindow('2025-10', at, new Date('2025-10-16T00:03:00Z'))
    expect(w.from.toISOString()).toBe('2025-10-16T00:00:00.000Z')
    expect(w.slots).toBe(16 * 288)
  })
  it('has no slots before the first ping or with no ping at all', () => {
    expect(slotWindow('2025-09', at, new Date('2025-10-16T00:00:00Z')).slots).toBe(0)
    expect(slotWindow('2025-10', at, null).slots).toBe(0)
  })
  it('the current month counts finished slots only', () => {
    const w = slotWindow('2026-10', at, new Date('2026-01-01T00:00:00Z'))
    expect(w.to.toISOString()).toBe('2026-10-11T12:05:00.000Z')
    expect(w.slots).toBe(10 * 288 + 12 * 12 + 1)
  })
})

describe('percent', () => {
  it('is unrounded and null with a zero denominator', () => {
    expect(percent(8901, 8928)).toBeCloseTo(99.6976, 3)
    expect(percent(4, 1000)).toBe(0.4)
    expect(percent(0, 0)).toBeNull()
  })
})

describe('record and recordPing (FM-8)', () => {
  it('upserts into the truncated hour and adds one error, one slow and one refusal', async () => {
    freezeClock(new Date('2025-10-10T10:42:00Z'))
    await record('api.orders', 503, 2500, true)
    const q = fake.queries[0]!
    expect(q.sql).toMatch(/insert into "request_stats".*on conflict \("hour", "route_group"\) do update set/)
    expect(q.parameters.slice(0, 6)).toEqual([new Date('2025-10-10T10:00:00Z'), 'api.orders', 1, 1, 1, 1])
  })

  it('counts a fast 4xx as a request only', async () => {
    await record('page.S4', 403, 2000, false)
    expect(fake.queries[0]!.parameters.slice(2, 6)).toEqual([1, 0, 0, 0])
  })

  it('records the 5-minute slot once (on conflict do nothing)', async () => {
    freezeClock(new Date('2025-10-10T10:44:59Z'))
    await recordPing()
    expect(fake.queries[0]!.sql).toMatch(/insert into "health_pings".*on conflict \("slot"\) do nothing/)
    expect(fake.queries[0]!.parameters).toEqual([new Date('2025-10-10T10:40:00Z')])
  })

  it('a failed write resolves and logs only errorFacts', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fake.fail = true
    await expect(record('api.orders', 200, 5, false)).resolves.toBeUndefined()
    await expect(recordPing()).resolves.toBeUndefined()
    expect(warn.mock.calls).toEqual([
      ['request stats write failed', { error: 'Error', code: '23514' }],
      ['health ping write failed', { error: 'Error', code: '23514' }],
    ])
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Ana')
  })
})
