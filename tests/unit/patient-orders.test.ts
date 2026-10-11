// BE-9 listOrdersForPatient (lld.md §2, EP-42, BE-22): her orders only, keyset (sent_at DESC, id DESC), 25 a page,
// each row as getOrderForViewer shows it. Run against a fake Kysely driver, as in order-notices.test.ts; the real
// database is exercised by tests/acceptance/M6.1.
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listOrdersForPatient } from '../../server/services/orders'
import type { Viewer } from '../../server/services/session'
import { encodeCursor } from '../../server/utils/paging'

const fake = vi.hoisted(() => ({ listed: 0, queries: [] as { sql: string; params: unknown[] }[] }))

function run(q: CompiledQuery): { rows: any[] } {
  const s = q.sql
  fake.queries.push({ sql: s, params: [...q.parameters] })
  // the list query: ids 100, 99, ... with one sent second apart
  if (s.includes('from "orders"') && s.includes('order by'))
    return { rows: Array.from({ length: fake.listed }, (_, i) => ({ id: String(100 - i), key: `2026-10-11 12:00:${String(59 - i).padStart(2, '0')}.000000+00` })) }
  // getOrderForViewer's load: the patient's own sent order
  if (s.includes('inner join "practices"')) {
    const id = String(q.parameters.at(-1))
    return { rows: [{ id, patient_id: '5', practice_id: '2', status: 'sent', prices_held_until: null, paid_at: null, practice_name: 'Willow Creek Wellness', provider_display_name: 'Dr. Chen', hold_live: false, checkout_started: false }] }
  }
  if (s.includes('from "order_lines"')) return { rows: [{ product_id: '7', product_name: 'Vitamin D3', quantity: 2, sent_unit_price_cents: 1800, held_unit_price_cents: null, paid_unit_price_cents: null }] }
  // currentPrices: today's price moved from 18.00 to 20.00, so the total follows today's price as EP-21 does
  if (s.includes('from "products"')) return { rows: [{ id: '7', unit_cost_cents: 1000, price_cents: 2000 }] }
  return { rows: [] }
}

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
            executeQuery: async (q: CompiledQuery) => run(q) as any,
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

const ana: Viewer = { userId: 5n, displayName: 'Ana Ruiz', role: 'patient', practiceId: 2n, practiceName: 'Willow Creek Wellness', idleExpiresAt: new Date() }
const listSql = () => fake.queries.find((q) => q.sql.includes('from "orders"') && q.sql.includes('order by'))!

beforeEach(() => {
  fake.listed = 0
  fake.queries.length = 0
})

describe('listOrdersForPatient (BE-9, EP-42)', () => {
  it('no orders: an empty page and no cursor (S16 Empty)', async () => {
    expect(await listOrdersForPatient(ana, {})).toEqual({ data: [], next_cursor: null })
  })

  it('asks only for her orders, newest sent first, one more than the page to know if another exists', async () => {
    await listOrdersForPatient(ana, {})
    const q = listSql()
    expect(q.sql).toMatch(/where "patient_id" = \$1/)
    expect(q.params[0]).toBe('5')
    expect(q.sql).toMatch(/order by "sent_at" desc, "id" desc limit \$\d+/)
    expect(q.params.at(-1)).toBe(26)
  })

  it('each row carries what the order page shows: status, practice, total at today\'s price, sent_at and paid_at', async () => {
    fake.listed = 1
    const page = await listOrdersForPatient(ana, {})
    expect(page.data).toEqual([{ order_id: 100, status: 'sent', practice_name: 'Willow Creek Wellness', total_cents: 4000, sent_at: '2026-10-11T12:00:59.000Z', paid_at: null }])
    expect(page.next_cursor).toBeNull()
  })

  it('26 rows: 25 returned and a cursor from the 25th, which the next call reads as (sent_at, id) <', async () => {
    fake.listed = 26
    const page = await listOrdersForPatient(ana, {})
    expect(page.data.map((o) => o.order_id)).toEqual(Array.from({ length: 25 }, (_, i) => 100 - i))
    expect(page.next_cursor).toBe(encodeCursor('2026-10-11 12:00:35.000000+00', '76'))
    fake.queries.length = 0
    await listOrdersForPatient(ana, { cursor: page.next_cursor! })
    expect(listSql().sql).toContain('("sent_at", "id") < ($2::timestamptz, $3::bigint)')
    expect(listSql().params.slice(1, 3)).toEqual(['2026-10-11 12:00:35.000000+00', '76'])
  })

  it('a made-up cursor or a bad limit is 422 validation before any query', async () => {
    await expect(listOrdersForPatient(ana, { cursor: 'not-a-cursor' })).rejects.toMatchObject({ slug: 'validation' })
    await expect(listOrdersForPatient(ana, { limit: '0' })).rejects.toMatchObject({ slug: 'validation' })
    await expect(listOrdersForPatient(ana, { cursor: ['a', 'b'] })).rejects.toMatchObject({ slug: 'validation' })
    expect(fake.queries).toEqual([])
  })
})
