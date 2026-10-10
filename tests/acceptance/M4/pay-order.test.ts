// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-2 Patient pays once, and US-3's recorded split (the payment stand-in answers "succeed", LLD SEAM-3).
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL, setPracticePrice } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

async function sendAs(email: string, patientId: number, lines: { product_id: number; quantity: number }[]) {
  const cookie = await signIn(email)
  const r = await call('/api/orders', { method: 'POST', cookie, key: newKey(), body: { patient_id: patientId, lines } })
  if (r.status !== 201) throw new Error(`send returned ${r.status}: ${r.text.slice(0, 200)}`)
  return r.body.order_id as number
}

async function checkoutAndPay(cookie: string, orderId: number, key = newKey()) {
  const c = await call(`/api/orders/${orderId}/checkout`, { method: 'POST', cookie })
  if (c.status !== 200) throw new Error(`checkout returned ${c.status}: ${c.text.slice(0, 200)}`)
  return call(`/api/orders/${orderId}/payments`, { method: 'POST', cookie, key })
}

describe('US-2 the patient pays once', () => {
  it('M4_AT_005 Ana pays $60.00 with the test payment and gets a receipt (AE-005, FR-006, FR-007)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    const ana = await signIn(EMAIL.ana)
    const r = await checkoutAndPay(ana, id)
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ order_id: id, amount_paid_cents: 6000, is_test_payment: true })
    expect(r.body.paid_at).toBeTruthy()
    const rows = await q('select status from orders where id = $1', [id])
    expect(rows[0].status).toBe('paid')
  })

  it('M4_AT_006 pressing Pay twice with the same key charges once and shows the first result (AE-006, FR-008, INV-2)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    const ana = await signIn(EMAIL.ana)
    const key = newKey()
    const first = await checkoutAndPay(ana, id, key)
    const second = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key })
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(second.body).toEqual(first.body)
    const ok = await q("select count(*)::int as n from payment_attempts where order_id = $1 and status = 'succeeded'", [id])
    expect(ok[0].n).toBe(1)
    const ledger = await q('select count(*)::int as n from ledger_entries where order_id = $1', [id])
    expect(ledger[0].n).toBe(4)
    const again = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expectProblem(again, 409, 'invalid-transition')
    const stillOne = await q("select count(*)::int as n from payment_attempts where order_id = $1 and status = 'succeeded'", [id])
    expect(stillOne[0].n).toBe(1)
  })

  it('M4_AT_013 a payment without an Idempotency-Key is refused (FR-008, D41)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const r = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: null })
    expectProblem(r, 400, 'idempotency-key-missing')
    const paid = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expect(paid.status).toBe(201)
  })

  it('M4_AT_012 paying before checkout has started is refused (SM-1)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    const ana = await signIn(EMAIL.ana)
    const early = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expectProblem(early, 409, 'invalid-transition')
    const r = await checkoutAndPay(ana, id)
    expect(r.status).toBe(201)
  })

  it('M4_AT_007 another patient cannot see Ana\'s order (AE-007, FR-009, INV-7)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    const ana = await signIn(EMAIL.ana)
    const own = await call(`/api/orders/${id}`, { cookie: ana })
    expect(own.status).toBe(200)
    expect(own.body.order_id).toBe(id)
    const ben = await signIn(EMAIL.ben)
    const other = await call(`/api/orders/${id}`, { cookie: ben })
    expectProblem(other, 404, 'not-found')
    expect(other.text).not.toMatch(/Vitamin|3600|Ana/)
  })

  it('M4_AT_008 a provider from another practice cannot see Ana\'s order (AE-008, FR-009, LINV-3)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    const chen = await signIn(EMAIL.drChen)
    expect((await call(`/api/orders/${id}`, { cookie: chen })).status).toBe(200)
    const lee = await signIn(EMAIL.drLee)
    const r = await call(`/api/orders/${id}`, { cookie: lee })
    expectProblem(r, 404, 'not-found')
  })
  it('M4_AT_043 another patient cannot start checkout on or pay Ana\'s order (FR-006, FR-009, INV-7)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    const ben = await signIn(EMAIL.ben)
    expectProblem(await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ben }), 404, 'not-found')
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    expectProblem(await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ben, key: newKey() }), 404, 'not-found')
    const attempts = await q('select count(*)::int as n from payment_attempts where order_id = $1', [id])
    expect(attempts[0].n).toBe(0)
    expect((await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })).status).toBe(201)
  })

  it('M4_AT_038 two payments with different keys pressed at the same moment charge once (LINV-6, INV-2)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const [a, b] = await Promise.all([
      call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() }),
      call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() }),
    ])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    const ok = await q("select count(*)::int as n from payment_attempts where order_id = $1 and status = 'succeeded'", [id])
    expect(ok[0].n).toBe(1)
    const ledger = await q("select count(*)::int as n from ledger_entries where order_id = $1 and category = 'patient_payment'", [id])
    expect(ledger[0].n).toBe(1)
  })
})

describe('US-3 the split is recorded to the cent', () => {
  it('M4_AT_009 a $60.00 payment records item cost $30.00, fee $0.45 and payout $29.55, with four ledger lines (AE-009, FR-010 to FR-012, LINV-2)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    const ana = await signIn(EMAIL.ana)
    expect((await checkoutAndPay(ana, id)).status).toBe(201)
    const o = await q(
      'select amount_paid_cents, item_cost_cents, platform_fee_cents, provider_payout_cents, paid_at from orders where id = $1',
      [id],
    )
    expect(o[0]).toMatchObject({ amount_paid_cents: 6000, item_cost_cents: 3000, platform_fee_cents: 45, provider_payout_cents: 2955 })
    const ledger = await q('select category, amount_cents from ledger_entries where order_id = $1', [id])
    const byCat = Object.fromEntries(ledger.map((r: any) => [r.category, r.amount_cents]))
    expect(byCat).toEqual({ patient_payment: 6000, item_cost: 3000, provider_payout: 2955, platform_fee: 45 })
  })

  it('M4_AT_010 a $33.34 order pays a fee of $0.25, rounded once per order (AE-010, FR-011)', async () => {
    const w = app.world()
    await setPracticePrice(w, w.omega3, 3334)
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.omega3, quantity: 1 }])
    const ana = await signIn(EMAIL.ana)
    expect((await checkoutAndPay(ana, id)).status).toBe(201)
    const o = await q('select amount_paid_cents, platform_fee_cents, provider_payout_cents from orders where id = $1', [id])
    expect(o[0]).toMatchObject({ amount_paid_cents: 3334, platform_fee_cents: 25, provider_payout_cents: 1809 })
  })

  it('M4_AT_011 a $14.00 order with $10.00 of cost pays a $0.11 fee (half-up) and a $3.89 payout (AE-011, FR-011, FR-012)', async () => {
    const w = app.world()
    await q('update products set unit_cost_cents = 1000 where id = $1', [w.magnesium])
    await setPracticePrice(w, w.magnesium, 1400)
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.magnesium, quantity: 1 }])
    const ana = await signIn(EMAIL.ana)
    expect((await checkoutAndPay(ana, id)).status).toBe(201)
    const o = await q('select amount_paid_cents, item_cost_cents, platform_fee_cents, provider_payout_cents from orders where id = $1', [id])
    expect(o[0]).toMatchObject({ amount_paid_cents: 1400, item_cost_cents: 1000, platform_fee_cents: 11, provider_payout_cents: 389 })
  })

  it('M4_AT_028 the order records when it was sent and when it was paid (AE-028, FR-031)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    const sent = await q('select sent_at, paid_at, practice_id, provider_id from orders where id = $1', [id])
    expect(sent[0].sent_at).not.toBeNull()
    expect(sent[0].paid_at).toBeNull()
    expect(Number(sent[0].practice_id)).toBe(w.willowCreek)
    expect(Number(sent[0].provider_id)).toBe(w.drChen)
    const ana = await signIn(EMAIL.ana)
    expect((await checkoutAndPay(ana, id)).status).toBe(201)
    const paid = await q('select sent_at, paid_at from orders where id = $1', [id])
    expect(paid[0].paid_at).not.toBeNull()
    expect(new Date(paid[0].paid_at).getTime()).toBeGreaterThanOrEqual(new Date(paid[0].sent_at).getTime())
  })
})
