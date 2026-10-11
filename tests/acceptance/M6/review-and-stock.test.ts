// QA-owned by define-acceptance (specs/M6-measurement-and-operations/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-10 FR-052 (only the operations specialist works the review list and records stock adjustments) and the M5
// decisions M6 carries (lld.md D83 input bounds, D85 invalid-transition members). AT-040 and AT-041 pin access rules
// M4 and M5 already built ("green: pins", ⚠ Q-3); the rest are red until M6 lands.
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey } from '../support/http'
import { as, asAdminNoTriggers, get, pay, sendOrder } from './support'

const app = useApp({ paymentStubMode: 'succeed' })
const T = 120_000

const stock = async (productId: number) => (await q('select units_in_stock from products where id = $1', [productId]))[0].units_in_stock as number
async function adjust(who: 'omar' | 'fran' | 'dana' | 'sam', productId: number, body: Record<string, unknown>) {
  return call(`/api/ops/stock/${productId}/adjustments`, { method: 'POST', cookie: await as(who), key: newKey(), body })
}
const pointer = (r: any) => (r.body?.errors ?? []).map((e: any) => e.pointer)

describe('FR-052 review list and stock adjustments, and carried M5 decisions', () => {
  it('M6_AT_040 Omar sees Order <n> on the review list; Dana and Sam are refused (AE-049, FR-052)', async () => {
    const w = app.world()
    const id = await sendOrder('drChen', w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    await asAdminNoTriggers("update orders set status = 'needs_review' where id = $1", [id])
    const omar = await get('/api/ops/orders?status=needs_review', 'omar')
    expect(omar.status).toBe(200)
    expect(omar.body.data.map((o: any) => o.order_id)).toEqual([id])
    for (const who of ['dana', 'sam'] as const) {
      const r = await get('/api/ops/orders?status=needs_review', who)
      expectProblem(r, 403, 'forbidden')
      expect(r.text).not.toContain(String(id))
    }
  }, T)

  it('M6_AT_041 only Omar records a stock adjustment; Fran, Dana and Sam are refused and the count is unchanged (FR-052, FR-058)', async () => {
    const w = app.world()
    const ok = await adjust('omar', w.vitaminD3, { change: 5, reason: 'delivery received', expected_units_in_stock: 10 })
    expect(ok.status).toBe(201)
    expect(await stock(w.vitaminD3)).toBe(15)
    for (const who of ['fran', 'dana', 'sam'] as const) {
      expectProblem(await adjust(who, w.vitaminD3, { change: 5, reason: 'delivery received', expected_units_in_stock: 15 }), 403, 'forbidden')
    }
    expect(await stock(w.vitaminD3)).toBe(15)
  }, T)

  it('M6_AT_042 a stock change outside ±1,000,000 or a count past 1,000,000 is 422 at #/change; exactly 1,000,000 is allowed (D83, FR-052)', async () => {
    const w = app.world()
    for (const change of [1_000_001, -1_000_001]) {
      const r = await adjust('omar', w.vitaminD3, { change, reason: 'typo', expected_units_in_stock: 10, confirm_large_change: true })
      expectProblem(r, 422, 'validation')
      expect(pointer(r)).toContain('#/change')
    }
    expect(await stock(w.vitaminD3)).toBe(10)
    const on = await adjust('omar', w.vitaminD3, { change: 999_990, reason: 'warehouse count', expected_units_in_stock: 10, confirm_large_change: true })
    expect(on.status).toBe(201)
    expect(await stock(w.vitaminD3)).toBe(1_000_000)
    const above = await adjust('omar', w.vitaminD3, { change: 1, reason: 'one more', expected_units_in_stock: 1_000_000, confirm_large_change: true })
    expectProblem(above, 422, 'validation')
    expect(pointer(above)).toContain('#/change')
    expect(await stock(w.vitaminD3)).toBe(1_000_000)
  }, T)

  it('M6_AT_043 a price above $100,000.00, given or from the margin, is 422 at its field; exactly $100,000.00 is allowed (D83)', async () => {
    const w = app.world()
    const put = async (body: Record<string, unknown>) =>
      call(`/api/practice/prices/${w.omega3}`, { method: 'PUT', cookie: await as('drChen'), key: newKey(), body: { reason: 'test bound', ...body } })
    const given = await put({ price_cents: 10_000_001, expected_current_price_cents: 3000 })
    expectProblem(given, 422, 'validation')
    expect(pointer(given)).toContain('#/price_cents')
    // Omega-3 costs $15.00; a 99.99 % margin gives $150,000.00
    const margin = await put({ margin_basis_points: 9999, expected_current_price_cents: 3000 })
    expectProblem(margin, 422, 'validation')
    expect(pointer(margin)).toContain('#/margin_basis_points')
    expect((await q('select count(*)::int as n from price_changes'))[0].n).toBe(0)
    const on = await put({ price_cents: 10_000_000, expected_current_price_cents: 3000 })
    expect(on.status).toBe(200)
    expect((await q('select price_cents from practice_prices where product_id = $1', [w.omega3]))[0].price_cents).toBe(10_000_000)
  }, T)

  it('M6_AT_044 a refused order transition says why: cancelling or re-opening checkout on a paid order is 409 with from "paid" and the event (D85)', async () => {
    const w = app.world()
    const sent = await sendOrder('drChen', w.ben, [{ product_id: w.omega3, quantity: 1 }])
    const cancelled = await call(`/api/orders/${sent}/cancel`, { method: 'POST', cookie: await as('drChen') })
    expect(cancelled.status).toBe(200)
    const paid = await sendOrder('drChen', w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    expect((await pay('ana', paid)).status).toBe(201)
    const cancel = await call(`/api/orders/${paid}/cancel`, { method: 'POST', cookie: await as('drChen') })
    expectProblem(cancel, 409, 'invalid-transition')
    expect(cancel.body).toMatchObject({ from: 'paid', event: 'cancel' })
    const checkout = await call(`/api/orders/${paid}/checkout`, { method: 'POST', cookie: await as('ana') })
    expectProblem(checkout, 409, 'invalid-transition')
    expect(checkout.body).toMatchObject({ from: 'paid', event: 'start_checkout' })
  }, T)
})
