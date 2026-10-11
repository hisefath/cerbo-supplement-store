// BE-13 StockService pure parts (lld.md §2, SEQ-2): which lines are short of stock, and how much of an order's
// reservation is still out. The locked database parts are proved by tests/acceptance/M5 (AT-015, AT-016, AT-034).
// BE-10's stock decisions (FM-3 release, LINV-6 before reserve) run against a fake Kysely driver holding a tiny
// in-memory order, its stock and its payment attempts, as in session.test.ts.
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeAttempt, pay } from '../../server/services/payments'
import type { Viewer } from '../../server/services/session'
import { outstandingByProduct, shortOfStock } from '../../server/services/stock'

const fake = vi.hoisted(() => ({
  stock: 0,
  moves: [] as { product_id: string; change: number; kind: string }[],
  attempts: [] as { id: string; status: string }[],
  sqls: [] as string[],
}))

function run(q: CompiledQuery): { rows: any[]; numAffectedRows?: bigint } {
  const s = q.sql
  const p = q.parameters as unknown[]
  fake.sqls.push(s)
  if (s.startsWith('select') && s.includes('from "orders"'))
    return { rows: [{ id: '41', patient_id: '5', practice_id: '2', provider_id: '3', status: 'in_checkout', hold_live: true }] }
  if (s.includes('from "order_lines" inner join "products"'))
    return { rows: [{ id: '1', product_id: '7', product_name: 'Vitamin D3', quantity: 2, held_unit_price_cents: 1800, unit_cost_cents: 900 }] }
  if (s.startsWith('select') && s.includes('from "order_lines"')) return { rows: [{ product_id: '7', quantity: 2 }] }
  if (s.startsWith('select') && s.includes('from "products"')) return { rows: [{ id: '7', units_in_stock: fake.stock }] }
  if (s.startsWith('update "products"')) {
    fake.stock += p[0] as number
    return { rows: [{ units_in_stock: fake.stock }] }
  }
  if (s.startsWith('insert into "stock_movements"')) {
    fake.moves.push({ product_id: p[0] as string, change: p[1] as number, kind: p[2] as string })
    return { rows: [] }
  }
  if (s.startsWith('select') && s.includes('from "stock_movements"')) return { rows: fake.moves }
  if (s.startsWith('insert into "payment_attempts"')) {
    if (fake.attempts.some((a) => a.status === 'processing')) throw Object.assign(new Error('duplicate key'), { code: '23505' })
    fake.attempts.push({ id: String(90 + fake.attempts.length), status: 'processing' })
    return { rows: [{ id: fake.attempts.at(-1)!.id }] }
  }
  if (s.startsWith('update "payment_attempts"')) {
    const a = fake.attempts.find((x) => x.id === p.at(-2) && x.status === 'processing')
    if (a) a.status = 'failed'
    return { rows: [], numAffectedRows: a ? 1n : 0n }
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
const savedMode = process.env.PAYMENT_STUB_MODE

beforeEach(() => {
  fake.stock = 0
  fake.moves.length = 0
  fake.attempts.length = 0
  fake.sqls.length = 0
})
afterEach(() => {
  if (savedMode === undefined) delete process.env.PAYMENT_STUB_MODE
  else process.env.PAYMENT_STUB_MODE = savedMode
})

describe('FM-3: a failure after transaction 1 that is not the gateway answer gives the stock back once', () => {
  it('a gateway configuration error releases the 2 reserved units; a second close returns nothing more', async () => {
    fake.stock = 2
    process.env.PAYMENT_STUB_MODE = 'maybe' // charge() rejects: a configuration error, not the gateway's answer
    await expect(pay(ana, 41n, 'key-1')).rejects.toThrow(/PAYMENT_STUB_MODE/)
    expect(fake.stock).toBe(2)
    expect(fake.moves.map((m) => [m.kind, m.change])).toEqual([
      ['sale', -2],
      ['sale_release', 2],
    ])
    expect(fake.attempts).toEqual([{ id: '90', status: 'failed' }])
    await closeAttempt('90', '41')
    expect(fake.stock).toBe(2)
    expect(fake.moves).toHaveLength(2)
  })
})

describe('LINV-6: a second Pay while one is processing answers 409 before any stock is reserved', () => {
  it('the first attempt took the last units: the second gets invalid-transition, not insufficient-stock', async () => {
    fake.attempts.push({ id: '90', status: 'processing' })
    await expect(pay(ana, 41n, 'key-2')).rejects.toMatchObject({ slug: 'invalid-transition' })
    expect(fake.sqls.some((s) => s.includes('from "products"') || s.startsWith('update "products"'))).toBe(false)
    expect(fake.moves).toEqual([])
  })
  it('stock left and no attempt in flight: the pay reserves after recording its attempt', async () => {
    fake.stock = 2
    await pay(ana, 41n, 'key-3').catch(() => {})
    const attempt = fake.sqls.findIndex((s) => s.startsWith('insert into "payment_attempts"'))
    const reserve = fake.sqls.findIndex((s) => s.startsWith('update "products"'))
    expect(attempt).toBeGreaterThanOrEqual(0)
    expect(reserve).toBeGreaterThan(attempt)
  })
})

describe('shortOfStock: lines whose quantity exceeds stock (FR-026, INV-5)', () => {
  it('AE-023: 2 Vitamin D3 wanted with 1 in stock names Vitamin D3 and the 1 available', () => {
    expect(shortOfStock([{ productId: '7', quantity: 2, unitsInStock: 1 }])).toEqual({ productIds: [7], unitsAvailable: [1] })
  })
  it('exactly the stock left is enough (boundary)', () => {
    expect(shortOfStock([{ productId: '7', quantity: 1, unitsInStock: 1 }])).toBeNull()
  })
  it('names only the short lines, in the order given', () => {
    expect(
      shortOfStock([
        { productId: '3', quantity: 4, unitsInStock: 0 },
        { productId: '5', quantity: 1, unitsInStock: 9 },
        { productId: '8', quantity: 3, unitsInStock: 2 },
      ]),
    ).toEqual({ productIds: [3, 8], unitsAvailable: [0, 2] })
  })
  it('no lines, nothing short', () => {
    expect(shortOfStock([])).toBeNull()
  })
})

describe("outstandingByProduct: an order's reserved units not yet returned (FR-035, FM-1)", () => {
  it('one sale of 2 with no release: 2 to return', () => {
    expect(outstandingByProduct([{ product_id: '7', change: -2 }])).toEqual(new Map([['7', 2]]))
  })
  it('a sale already released: nothing to return (release runs at most once per reservation)', () => {
    expect(
      outstandingByProduct([
        { product_id: '7', change: -2 },
        { product_id: '7', change: 2 },
      ]),
    ).toEqual(new Map())
  })
  it('a second reservation after an earlier released one: only the new one is out', () => {
    expect(
      outstandingByProduct([
        { product_id: '7', change: -2 },
        { product_id: '7', change: 2 },
        { product_id: '7', change: -2 },
        { product_id: '9', change: -1 },
      ]),
    ).toEqual(new Map([['7', 2], ['9', 1]]))
  })
})
