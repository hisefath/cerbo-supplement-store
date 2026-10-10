// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-2 when the payment provider does not answer (LLD SEAM-3: PAYMENT_STUB_MODE=no_answer; FM-2).
import { describe, expect, it } from 'vitest'
import { startServer, stopServer } from '@nuxt/test-utils/e2e'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'no_answer' })

describe('US-2 the payment step does not answer', () => {
  it('M4_AT_031 the order stays unpaid, no money is recorded and the patient is told no money was taken (AE-031, FR-035)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await call('/api/orders', {
      method: 'POST',
      cookie: chen,
      key: newKey(),
      body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }] },
    })
    expect(sent.status).toBe(201)
    const id = sent.body.order_id
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const r = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expectProblem(r, 502, 'payment-failed')
    const o = await q('select status, paid_at, amount_paid_cents from orders where id = $1', [id])
    expect(o[0]).toMatchObject({ status: 'payment_failed', paid_at: null, amount_paid_cents: null })
    const ledger = await q('select count(*)::int as n from ledger_entries where order_id = $1', [id])
    expect(ledger[0].n).toBe(0)
    const attempts = await q('select status from payment_attempts where order_id = $1', [id])
    expect(attempts.map((a: any) => a.status)).toEqual(['failed'])
  }, 60_000)

  it('M4_AT_042 the provider can cancel an order whose payment failed (FR-066, SM-1)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 1 }] } })
    expect(sent.status).toBe(201)
    const id = sent.body.order_id
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    expectProblem(await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() }), 502, 'payment-failed')
    const r = await call(`/api/orders/${id}/cancel`, { method: 'POST', cookie: chen })
    expect(r.status).toBe(200)
    expect(r.body.status).toBe('cancelled')
    const rows = await q('select status, amount_paid_cents from orders where id = $1', [id])
    expect(rows[0]).toMatchObject({ status: 'cancelled', amount_paid_cents: null })
  }, 60_000)

  it('M4_AT_040 a declined card leaves the order unpaid with nothing recorded, the same as no answer (FM-1, FR-035)', async () => {
    const w = app.world()
    await stopServer()
    await startServer({ env: { PAYMENT_STUB_MODE: 'decline' } })
    const chen = await signIn(EMAIL.drChen)
    const sent = await call('/api/orders', {
      method: 'POST',
      cookie: chen,
      key: newKey(),
      body: { patient_id: w.ben, lines: [{ product_id: w.omega3, quantity: 1 }] },
    })
    expect(sent.status).toBe(201)
    const id = sent.body.order_id
    const ben = await signIn(EMAIL.ben)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ben })).status).toBe(200)
    const r = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ben, key: newKey() })
    expectProblem(r, 502, 'payment-failed')
    const o = await q('select status, amount_paid_cents from orders where id = $1', [id])
    expect(o[0]).toMatchObject({ status: 'payment_failed', amount_paid_cents: null })
    const attempts = await q('select status, failure_reason from payment_attempts where order_id = $1', [id])
    expect(attempts).toEqual([{ status: 'failed', failure_reason: 'declined' }])
    expect((await q('select count(*)::int as n from ledger_entries where order_id = $1', [id]))[0].n).toBe(0)
  }, 120_000)
})
