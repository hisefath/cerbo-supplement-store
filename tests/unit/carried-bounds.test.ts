// M6-T006 carried M5 decisions: D83 input bounds (BE-8, BE-13), D84 product rows locked FOR NO KEY UPDATE (BE-13) and
// D85 invalid-transition members on Pay (BE-10). The HTTP paths and cancel/checkout members are proved by
// tests/acceptance/M6 (AT-042 to AT-044); Pay and the lock run here against a fake Kysely driver, as in stock.test.ts.
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pay } from '../../server/services/payments'
import { priceFor, PriceChangeRequest } from '../../server/services/pricing'
import type { Viewer } from '../../server/services/session'
import { reserveForOrder } from '../../server/services/stock'
import { adjust, checkAdjustment, StockAdjustmentRequest } from '../../server/services/stock-adjustments'
import { useDb } from '../../server/utils/db'
import { ProblemError } from '../../server/utils/problem'

const fake = vi.hoisted(() => ({ status: 'in_checkout', processing: false, sqls: [] as string[] }))

function run(q: CompiledQuery): { rows: any[]; numAffectedRows?: bigint } {
  const s = q.sql
  fake.sqls.push(s)
  if (s.startsWith('select') && s.includes('from "orders"'))
    return { rows: [{ id: '41', patient_id: '5', practice_id: '2', provider_id: '3', status: fake.status, hold_live: true, checkout_started: true }] }
  if (s.includes('from "order_lines" inner join "products"'))
    return { rows: [{ id: '1', product_id: '7', product_name: 'Vitamin D3', quantity: 2, held_unit_price_cents: 1800, unit_cost_cents: 900 }] }
  if (s.startsWith('select') && s.includes('from "order_lines"')) return { rows: [{ product_id: '7', quantity: 2 }] }
  if (s.startsWith('select') && s.includes('from "products"')) return { rows: [{ id: '7', units_in_stock: 9 }] }
  if (s.startsWith('update "products"')) return { rows: [{ units_in_stock: 7 }] }
  if (s.startsWith('insert into "payment_attempts"')) {
    if (fake.processing) throw Object.assign(new Error('duplicate key'), { code: '23505' })
    return { rows: [{ id: '90' }] }
  }
  return { rows: [], numAffectedRows: 1n }
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

const ana: Viewer = { userId: 5n, displayName: 'Ana', role: 'patient', practiceId: 2n, idleExpiresAt: new Date('2026-10-10T12:15:00Z') }
const omar: Viewer = { userId: 9n, displayName: 'Omar', role: 'operations_specialist', practiceId: null, idleExpiresAt: new Date('2026-10-10T12:15:00Z') }

beforeEach(() => {
  fake.status = 'in_checkout'
  fake.processing = false
  fake.sqls.length = 0
})

function problem(fn: () => unknown): ProblemError {
  try {
    fn()
  } catch (e) {
    if (e instanceof ProblemError) return e
    throw e
  }
  throw new Error('expected a ProblemError')
}
const pointers = (p: ProblemError) => (p.extensions.errors as { pointer: string }[]).map((e) => e.pointer)
const issuePaths = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  (r.error?.issues ?? []).map((i) => '#/' + i.path.join('/'))

describe('D83 stock bounds (BE-13)', () => {
  const body = (change: number) => ({ change, reason: 'count', expected_units_in_stock: 10 })
  it('a change of ±1,000,000 passes the schema; ±1,000,001 is refused at #/change', () => {
    expect(StockAdjustmentRequest.safeParse(body(1_000_000)).success).toBe(true)
    expect(StockAdjustmentRequest.safeParse(body(-1_000_000)).success).toBe(true)
    expect(issuePaths(StockAdjustmentRequest.safeParse(body(1_000_001)))).toEqual(['#/change'])
    expect(issuePaths(StockAdjustmentRequest.safeParse(body(-1_000_001)))).toEqual(['#/change'])
  })
  it('a resulting count of exactly 1,000,000 is allowed; one more is 422 validation at #/change', () => {
    expect(checkAdjustment(7n, 10, { change: 999_990, expected_units_in_stock: 10 })).toBe(1_000_000)
    const p = problem(() => checkAdjustment(7n, 1_000_000, { change: 1, expected_units_in_stock: 1_000_000 }))
    expect(p.slug).toBe('validation')
    expect(pointers(p)).toEqual(['#/change'])
  })
})

describe('D83 price bounds (BE-8)', () => {
  const body = (price_cents: number) => ({ price_cents, reason: 'r', expected_current_price_cents: 3000 })
  it('a given price of 10,000,000 cents passes the schema; 10,000,001 is refused at #/price_cents', () => {
    expect(PriceChangeRequest.safeParse(body(10_000_000)).success).toBe(true)
    expect(issuePaths(PriceChangeRequest.safeParse(body(10_000_001)))).toEqual(['#/price_cents'])
  })
  it('a given price of exactly 10,000,000 cents is allowed; above it is 422 at #/price_cents', () => {
    expect(priceFor(3n, 1500, { price_cents: 10_000_000 })).toBe(10_000_000)
    expect(pointers(problem(() => priceFor(3n, 1500, { price_cents: 10_000_001 })))).toEqual(['#/price_cents'])
  })
  it('a margin whose computed price passes 10,000,000 cents is 422 at #/margin_basis_points ($15.00 at 99.99 %)', () => {
    const p = problem(() => priceFor(3n, 1500, { margin_basis_points: 9999 }))
    expect(p.slug).toBe('validation')
    expect(pointers(p)).toEqual(['#/margin_basis_points'])
  })
})

describe('D84 product rows lock FOR NO KEY UPDATE (BE-13)', () => {
  const productLocks = () => fake.sqls.filter((s) => s.startsWith('select') && s.includes('from "products"')).map((s) => s.match(/for (no key )?update$/)?.[0])
  it('reserveForOrder locks the order\'s products for no key update', async () => {
    await useDb().transaction().execute((tx) => reserveForOrder(tx, 41n))
    expect(productLocks()).toEqual(['for no key update'])
  })
  it('adjust locks the product for no key update', async () => {
    await adjust(omar, 7n, { change: 1, reason: 'count', expected_units_in_stock: 9, confirm_large_change: false }).catch(() => {})
    expect(productLocks()).toEqual(['for no key update'])
  })
})

describe('D85 Pay refusals carry from and event (BE-10)', () => {
  it('a paid order: from "paid", event "pay"', async () => {
    fake.status = 'paid'
    await expect(pay(ana, 41n, 'k1')).rejects.toMatchObject({ slug: 'invalid-transition', extensions: { from: 'paid', event: 'pay' } })
  })
  it('a second Pay losing on LINV-6: from "in_checkout", event "pay"', async () => {
    fake.processing = true
    await expect(pay(ana, 41n, 'k2')).rejects.toMatchObject({
      slug: 'invalid-transition',
      extensions: { from: 'in_checkout', event: 'pay' },
    })
  })
})
