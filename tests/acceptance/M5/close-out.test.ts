// QA-owned by define-acceptance (specs/M5-prices-and-stock/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// M5 close-out: the FM-7 reconcile also runs when the patient pays or starts checkout again (lld.md FM-7, M5-pass4 R4),
// and EP-21 tells a hold that ended apart from an order never checked out (OrderView.hold_ended, M5-pass2 R4).
// An abandoned attempt is arranged in the LLD-named tables as BE-10.pay's transaction 1 leaves it.
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

async function inCheckoutForTwo(): Promise<{ id: number; cookie: string }> {
  const w = app.world()
  const chen = await signIn(EMAIL.drChen)
  const s = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }] } })
  expect(s.status).toBe(201)
  const id = s.body.order_id as number
  const cookie = await signIn(EMAIL.ana)
  expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie })).status).toBe(200)
  return { id, cookie }
}

async function abandonedPayment(orderId: number): Promise<void> {
  const w = app.world()
  await q(
    "insert into payment_attempts (order_id, idempotency_key, amount_cents, created_at) values ($1, $2, 3600, now() - interval '2 minutes 10 seconds')",
    [orderId, newKey()],
  )
  await q('update products set units_in_stock = 8 where id = $1', [w.vitaminD3])
  await q("insert into stock_movements (product_id, change, kind, reason, order_id, units_after) values ($1, -2, 'sale', $2, $3, 8)", [
    w.vitaminD3,
    `Order ${orderId}`,
    orderId,
  ])
}

const moves = (orderId: number) => q('select kind, change from stock_movements where order_id = $1 order by id', [orderId])
const stock = async (productId: number) => (await q('select units_in_stock from products where id = $1', [productId]))[0].units_in_stock

describe('M5 close-out: an abandoned payment never blocks the patient', () => {
  it('M5_AT_039 Pay over a payment abandoned 2 minutes 10 seconds ago reconciles it (409, payment_failed, 2 units back); starting checkout again then paying succeeds (FM-7, FR-027, FR-006, M5-pass4 R4)', async () => {
    const w = app.world()
    const ana = await inCheckoutForTwo()
    await abandonedPayment(ana.id)
    const first = await call(`/api/orders/${ana.id}/payments`, { method: 'POST', cookie: ana.cookie, key: newKey() })
    expectProblem(first, 409, 'invalid-transition')
    expect((await q('select status from orders where id = $1', [ana.id]))[0].status).toBe('payment_failed')
    expect(await q('select status, failure_reason from payment_attempts where order_id = $1', [ana.id])).toEqual([{ status: 'failed', failure_reason: 'no_answer' }])
    expect(await stock(w.vitaminD3)).toBe(10)
    expect((await call(`/api/orders/${ana.id}/checkout`, { method: 'POST', cookie: ana.cookie })).status).toBe(200)
    const paid = await call(`/api/orders/${ana.id}/payments`, { method: 'POST', cookie: ana.cookie, key: newKey() })
    expect(paid.status).toBe(201)
    expect(await moves(ana.id)).toEqual([
      { kind: 'sale', change: -2 },
      { kind: 'sale_release', change: 2 },
      { kind: 'sale', change: -2 },
    ])
    expect(await stock(w.vitaminD3)).toBe(8)
  })

  it('M5_AT_040 starting checkout over a payment abandoned 2 minutes 10 seconds ago reconciles it first, so the new checkout can be paid (FM-7, FR-023, M5-pass4 R4)', async () => {
    const w = app.world()
    const ana = await inCheckoutForTwo()
    await abandonedPayment(ana.id)
    await q("update orders set prices_held_until = now() - interval '1 minute' where id = $1", [ana.id])
    const c = await call(`/api/orders/${ana.id}/checkout`, { method: 'POST', cookie: ana.cookie })
    expect(c.status).toBe(200)
    expect(await q('select status, failure_reason from payment_attempts where order_id = $1', [ana.id])).toEqual([{ status: 'failed', failure_reason: 'no_answer' }])
    const paid = await call(`/api/orders/${ana.id}/payments`, { method: 'POST', cookie: ana.cookie, key: newKey() })
    expect(paid.status).toBe(201)
    expect(await moves(ana.id)).toEqual([
      { kind: 'sale', change: -2 },
      { kind: 'sale_release', change: 2 },
      { kind: 'sale', change: -2 },
    ])
    expect(await stock(w.vitaminD3)).toBe(8)
  })

  it('M5_AT_041 after Ana\'s hold ends unpaid her order says hold_ended true; Ben\'s order that was never checked out and Ana\'s live hold say false (S2, FR-037, M5-pass2 R4)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const b = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ben, lines: [{ product_id: w.magnesium, quantity: 1 }] } })
    expect(b.status).toBe(201)
    const ben = await call(`/api/orders/${b.body.order_id}`, { cookie: await signIn(EMAIL.ben) })
    expect(ben.body.status).toBe('sent')
    expect(ben.body.hold_ended).toBe(false)
    const ana = await inCheckoutForTwo()
    const live = await call(`/api/orders/${ana.id}`, { cookie: ana.cookie })
    expect(live.body.status).toBe('in_checkout')
    expect(live.body.hold_ended).toBe(false)
    await q("update orders set prices_held_until = now() - interval '1 minute' where id = $1", [ana.id])
    const ended = await call(`/api/orders/${ana.id}`, { cookie: ana.cookie })
    expect(ended.body.status).toBe('sent')
    expect(ended.body.hold_ended).toBe(true)
  })

  it('M5_AT_042 Pay pressed after the 30-minute hold ended answers 409 checkout-expired, not invalid-transition; nothing is charged or reserved (lld.md /problems/checkout-expired, SM-1, FR-037)', async () => {
    const w = app.world()
    const ana = await inCheckoutForTwo()
    await q("update orders set prices_held_until = now() - interval '1 minute' where id = $1", [ana.id])
    const r = await call(`/api/orders/${ana.id}/payments`, { method: 'POST', cookie: ana.cookie, key: newKey() })
    expectProblem(r, 409, 'checkout-expired')
    expect((await q('select count(*)::int as n from payment_attempts where order_id = $1', [ana.id]))[0].n).toBe(0)
    expect(await moves(ana.id)).toEqual([])
    expect(await stock(w.vitaminD3)).toBe(10)
    // live twin: starting checkout again and paying succeeds
    expect((await call(`/api/orders/${ana.id}/checkout`, { method: 'POST', cookie: ana.cookie })).status).toBe(200)
    expect((await call(`/api/orders/${ana.id}/payments`, { method: 'POST', cookie: ana.cookie, key: newKey() })).status).toBe(201)
  })

  it('M5_AT_043 the signed-in session names the viewer\'s practice: Dr. Chen "Willow Creek Wellness", Dr. Lee "Maple Grove Clinic", Omar (platform staff) null (EP-17 Me.practice_name; screens.md S5, S6 titles; M5-pass7 R4)', async () => {
    const me = async (email: string) => {
      const r = await call('/api/session', { cookie: await signIn(email) })
      expect(r.status).toBe(200)
      return r.body.practice_name
    }
    expect(await me(EMAIL.drChen)).toBe('Willow Creek Wellness')
    expect(await me(EMAIL.drLee)).toBe('Maple Grove Clinic')
    expect(await me(EMAIL.omar)).toBeNull()
  })
})
