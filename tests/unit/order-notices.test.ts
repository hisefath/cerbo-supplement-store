// BE-9 OrderService pure part (lld.md §2, SM-1, SEQ-2): which price each line of EP-21 shows and which lines get a
// price change notice (FR-022, FR-023, FR-037). The hold ending itself is proved by tests/acceptance/M5 (AT-007); its
// guards (a payment in flight keeps the hold, FM-7 reconciles an abandoned one, EP-21 checks access before any write)
// run here against a fake Kysely driver holding one in-memory order, as in stock.test.ts.
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expireHoldIfDue, getOrderForViewer, orderViewLines } from '../../server/services/orders'
import type { Viewer } from '../../server/services/session'

const fake = vi.hoisted(() => ({
  order: { status: 'in_checkout', hold_over: true },
  attempt: null as null | { id: string; status: string; failure_reason?: unknown; abandoned: boolean },
  moves: [] as { product_id: string; change: number; kind: string }[],
  sqls: [] as string[],
}))

function run(q: CompiledQuery): { rows: any[]; numAffectedRows?: bigint } {
  const s = q.sql
  const p = q.parameters as unknown[]
  fake.sqls.push(s)
  if (s.startsWith('select') && s.includes('from "orders" inner join "practices"'))
    return { rows: [{ id: '41', patient_id: '5', practice_id: '2', status: fake.order.status, prices_held_until: null, paid_at: null, practice_name: 'Chen Clinic', provider_display_name: 'Dr. Chen', hold_live: false }] }
  if (s.startsWith('select') && s.includes('from "orders"')) return { rows: [{ id: '41', ...fake.order }] }
  if (s.startsWith('update "orders"')) {
    fake.order.status = p[0] as string
    return { rows: [{ id: '41' }], numAffectedRows: 1n }
  }
  if (s.startsWith('select') && s.includes('from "payment_attempts"'))
    return { rows: fake.attempt?.status === 'processing' ? [fake.attempt] : [] }
  if (s.startsWith('update "payment_attempts"')) {
    const ok = fake.attempt?.status === 'processing'
    if (ok) Object.assign(fake.attempt!, { status: p[0], failure_reason: p[1] })
    return { rows: [], numAffectedRows: ok ? 1n : 0n }
  }
  // the order reserved 2 units of product 7 in pay's transaction 1
  if (s.startsWith('select') && s.includes('from "stock_movements"')) return { rows: [{ product_id: '7', change: -2 }, ...fake.moves] }
  if (s.startsWith('select') && s.includes('from "products"')) return { rows: [{ id: '7', units_in_stock: 0 }] }
  if (s.startsWith('update "products"')) return { rows: [{ units_in_stock: p[0] }] }
  if (s.startsWith('insert into "stock_movements"')) {
    fake.moves.push({ product_id: p[0] as string, change: p[1] as number, kind: p[2] as string })
    return { rows: [] }
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

const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
beforeEach(() => {
  fake.order = { status: 'in_checkout', hold_over: true }
  fake.attempt = null
  fake.moves.length = 0
  fake.sqls.length = 0
  warn.mockClear()
})
afterEach(() => warn.mockClear())

describe('expireHoldIfDue: SM-1 hold ends, unless a payment is in flight (R3, FM-7)', () => {
  it('an ended hold with no payment in flight goes back to sent and clears the held prices (FR-037)', async () => {
    await expireHoldIfDue(41n)
    expect(fake.order.status).toBe('sent')
    expect(fake.sqls.some((s) => s.startsWith('update "order_lines" set "held_unit_price_cents"'))).toBe(true)
  })
  it('a live hold is left alone', async () => {
    fake.order.hold_over = false
    await expireHoldIfDue(41n)
    expect(fake.order.status).toBe('in_checkout')
  })
  it('R3: a processing attempt under 2 minutes old keeps the ended hold, so the charged payment can still be recorded', async () => {
    fake.attempt = { id: '90', status: 'processing', abandoned: false }
    await expireHoldIfDue(41n)
    expect(fake.order.status).toBe('in_checkout')
    expect(fake.attempt.status).toBe('processing')
    expect(fake.sqls.some((s) => s.startsWith('update'))).toBe(false)
    expect(fake.moves).toEqual([])
  })
  it('FM-7: a processing attempt 2 minutes old fails, gives its 2 units back once, and the order shows payment failed', async () => {
    fake.order.hold_over = false
    fake.attempt = { id: '90', status: 'processing', abandoned: true }
    await expireHoldIfDue(41n)
    expect(fake.attempt).toMatchObject({ status: 'failed', failure_reason: 'no_answer' })
    expect(fake.moves).toEqual([{ product_id: '7', change: 2, kind: 'sale_release' }])
    expect(fake.order.status).toBe('payment_failed')
    expect(warn).toHaveBeenCalledWith(expect.any(String), { orderId: '41', attemptId: '90', reason: 'abandoned' })
    await expireHoldIfDue(41n) // read again: nothing more to reconcile
    expect(fake.moves).toHaveLength(1)
  })
  it('an order no longer in checkout is left alone', async () => {
    fake.order.status = 'paid'
    await expireHoldIfDue(41n)
    expect(fake.sqls.some((s) => s.startsWith('update'))).toBe(false)
  })
})

describe('getOrderForViewer: access is checked before any write (R5)', () => {
  const stranger: Viewer = { userId: 9n, displayName: 'Someone', role: 'patient', practiceId: 2n, idleExpiresAt: new Date('2026-10-10T12:15:00Z') }
  it('someone who may not see the order gets not-found and changes nothing, even with a due hold and an abandoned attempt', async () => {
    fake.attempt = { id: '90', status: 'processing', abandoned: true }
    await expect(getOrderForViewer(stranger, 41n)).rejects.toMatchObject({ slug: 'not-found' })
    expect(fake.sqls.some((s) => s.startsWith('update') || s.startsWith('insert'))).toBe(false)
    expect(fake.order.status).toBe('in_checkout')
  })
})

// Ana's order: Vitamin D3 x2 at $18.00, Magnesium Glycinate x1 at $24.00; Dr. Chen then moves Magnesium to $26.00.
const rows = [
  { product_id: '1', product_name: 'Vitamin D3', quantity: 2, sent_unit_price_cents: 1800, held_unit_price_cents: null, paid_unit_price_cents: null },
  { product_id: '2', product_name: 'Magnesium Glycinate', quantity: 1, sent_unit_price_cents: 2400, held_unit_price_cents: null, paid_unit_price_cents: null },
]
const held = rows.map((r) => ({ ...r, held_unit_price_cents: r.sent_unit_price_cents }))
const current = new Map([[1n, 1800], [2n, 2600]])
const total = (v: ReturnType<typeof orderViewLines>) => v.lines.reduce((s, l) => s + l.line_total_cents, 0)

describe('orderViewLines: EP-21 lines and notices', () => {
  it('a sent order shows today\'s prices and a notice for the changed item (AE-020)', () => {
    const v = orderViewLines('sent', false, rows, current)
    expect(total(v)).toBe(6200)
    expect(v.lines[1]).toEqual({ product_id: 2, name: 'Magnesium Glycinate', quantity: 1, unit_price_cents: 2600, line_total_cents: 2600 })
    expect(v.price_changes).toEqual([{ product_id: 2, name: 'Magnesium Glycinate', old_price_cents: 2400, new_price_cents: 2600 }])
  })
  it('no change, no notice', () => {
    const v = orderViewLines('sent', false, rows, new Map([[1n, 1800], [2n, 2400]]))
    expect(total(v)).toBe(6000)
    expect(v.price_changes).toEqual([])
  })
  it('a payment_failed order follows today\'s prices too', () => {
    expect(orderViewLines('payment_failed', false, rows, current).price_changes).toHaveLength(1)
  })
  it('a live hold shows the held prices and no notice (AE-021, FR-023)', () => {
    const v = orderViewLines('in_checkout', true, held, current)
    expect(total(v)).toBe(6000)
    expect(v.price_changes).toEqual([])
  })
  it('a live hold shows the prices held at checkout start, not the sent ones (FR-023: the price moved before checkout)', () => {
    // Magnesium went $24.00 -> $25.00 before Ana started checkout (held $25.00), then to $26.00 during it
    const heldAt25 = rows.map((r) => ({ ...r, held_unit_price_cents: r.product_id === '2' ? 2500 : r.sent_unit_price_cents }))
    const v = orderViewLines('in_checkout', true, heldAt25, current)
    expect(v.lines[1]!.unit_price_cents).toBe(2500)
    expect(total(v)).toBe(6100)
    expect(v.price_changes).toEqual([])
  })
  it('a paid order shows the paid prices; a cancelled one its sent prices, frozen', () => {
    const paid = rows.map((r) => ({ ...r, paid_unit_price_cents: r.sent_unit_price_cents + 100 }))
    expect(total(orderViewLines('paid', false, paid, current))).toBe(6300)
    expect(orderViewLines('paid', false, paid, current).price_changes).toEqual([])
    expect(total(orderViewLines('cancelled', false, rows, current))).toBe(6000)
    expect(orderViewLines('cancelled', false, rows, current).price_changes).toEqual([])
  })
})
