// QA-owned by define-acceptance (specs/M5-prices-and-stock/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// M5-R02 (FINDINGS F21, Q-1): regression pins for M4 behaviours its review fixed, so an M5 change cannot quietly undo
// them. They pass today (status "green: pins"); each one fails if the rule it names is broken.
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL, setPracticePrice } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

async function send(patientId: number, lines: { product_id: number; quantity: number }[]) {
  const cookie = await signIn(EMAIL.drChen)
  const r = await call('/api/orders', { method: 'POST', cookie, key: newKey(), body: { patient_id: patientId, lines } })
  if (r.status !== 201) throw new Error(`send returned ${r.status}: ${r.text.slice(0, 200)}`)
  return r.body.order_id as number
}

describe('M5-R02 regression pins for M4 review fixes', () => {
  it('M5_AT_029 a key whose request answered a problem is released, so the same key pays once the cause is fixed (M4-pass3 R1, FR-006, FR-008, D41)', async () => {
    const w = app.world()
    const id = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    const ana = await signIn(EMAIL.ana)
    const key = newKey()
    const early = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key })
    expectProblem(early, 409, 'invalid-transition')
    const c = await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })
    expect(c.status).toBe(200)
    const paid = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key })
    expect(paid.status).toBe(201)
    expect(paid.body.amount_paid_cents).toBe(1800)
  })

  it('M5_AT_030 eleven wrong passwords for one email at the same moment: ten are refused as wrong, one as too many (M4-pass5 R3, FR-039)', async () => {
    const tries = Array.from({ length: 11 }, () =>
      call('/api/session', { method: 'POST', body: { email: EMAIL.ben, password: 'not the password' } }),
    )
    const statuses = (await Promise.all(tries)).map((r) => r.status)
    expect(statuses.filter((s) => s === 401).length).toBe(10)
    expect(statuses.filter((s) => s === 429).length).toBe(1)
  })

  it('M5_AT_031 eleven Pay presses by one patient at the same moment: ten reach the order, one is limited (M4-pass7 R2, SEC-9, FR-006)', async () => {
    const w = app.world()
    const id = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    const ana = await signIn(EMAIL.ana)
    const presses = Array.from({ length: 11 }, () => call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() }))
    const replies = await Promise.all(presses)
    expect(replies.filter((r) => r.status === 409 && r.body?.type === '/problems/invalid-transition').length).toBe(10)
    expect(replies.filter((r) => r.status === 429 && r.body?.type === '/problems/rate-limited').length).toBe(1)
  })

  it('M5_AT_032 a provider cannot cancel an order while its checkout hold is live (M4-pass6 R2, FR-066, FR-067)', async () => {
    const w = app.world()
    const sent = await send(w.ben, [{ product_id: w.omega3, quantity: 1 }])
    const held = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    const chen = await signIn(EMAIL.drChen)
    const allowed = await call(`/api/orders/${sent}/cancel`, { method: 'POST', cookie: chen })
    expect(allowed.status).toBe(200)
    expect(allowed.body.status).toBe('cancelled')
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${held}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const refused = await call(`/api/orders/${held}/cancel`, { method: 'POST', cookie: chen })
    expectProblem(refused, 409, 'invalid-transition')
    expect((await q('select status from orders where id = $1', [held]))[0].status).toBe('in_checkout')
  })

  it('M5_AT_033 a balanced split whose payout would be negative goes to review before any charge (D47, M4-pass2 R2, FR-013, INV-6)', async () => {
    const w = app.world()
    // A fixed practice price of $18.00 (the default would follow the cost: 2 x cost, FR-017).
    await setPracticePrice(w, w.vitaminD3, 1800)
    const ok = await send(w.ben, [{ product_id: w.magnesium, quantity: 1 }])
    const id = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    const ben = await signIn(EMAIL.ben)
    expect((await call(`/api/orders/${ok}/checkout`, { method: 'POST', cookie: ben })).status).toBe(200)
    expect((await call(`/api/orders/${ok}/payments`, { method: 'POST', cookie: ben, key: newKey() })).status).toBe(201)
    // The cost of Vitamin D3 rises from $9.00 to $18.00 after the $18.00 order was sent: payout 1800 - 1800 - 14 < 0.
    await q('update products set unit_cost_cents = 1800 where id = $1', [w.vitaminD3])
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const r = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expectProblem(r, 422, 'order-under-review')
    expect((await q('select status from orders where id = $1', [id]))[0].status).toBe('needs_review')
    expect((await q('select count(*)::int as n from payment_attempts where order_id = $1', [id]))[0].n).toBe(0)
  })
})
