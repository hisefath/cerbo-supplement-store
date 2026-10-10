// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-1 Build and send a supplement order (plus the default price of US-4 and cancel, FR-066/FR-067).
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL, setPracticePrice } from '../support/people'

const app = useApp()

async function sendOrder(cookie: string, patientId: number, lines: { product_id: number; quantity: number }[], key = newKey()) {
  return call('/api/orders', { method: 'POST', cookie, key, body: { patient_id: patientId, lines } })
}

describe('US-1 build and send a supplement order', () => {
  it('M4_AT_001 catalog shows practice prices and stock, and a sent order carries total, fee and payout (AE-001)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const cat = await call(`/api/patients/${w.ana}/catalog`, { cookie: chen })
    expect(cat.status).toBe(200)
    const d3 = cat.body.items.find((i: any) => i.product_id === w.vitaminD3)
    const mg = cat.body.items.find((i: any) => i.product_id === w.magnesium)
    expect(d3).toMatchObject({ price_cents: 1800, units_in_stock: 10 })
    expect(mg).toMatchObject({ price_cents: 2400, units_in_stock: 5 })
    const r = await sendOrder(chen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ status: 'sent', total_cents: 6000, platform_fee_cents: 45, provider_payout_cents: 2955 })
    const lines = r.body.lines.map((l: any) => [l.product_id, l.quantity, l.unit_price_cents, l.line_total_cents])
    expect(lines).toEqual(expect.arrayContaining([[w.vitaminD3, 2, 1800, 3600], [w.magnesium, 1, 2400, 2400]]))
    const rows = await q('select status, sent_at from orders where id = $1', [r.body.order_id])
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('sent')
    expect(rows[0].sent_at).not.toBeNull()
  })

  it('M4_AT_020 a second order gives different totals: 3 Omega-3 at $30.00 is $90.00, fee $0.68, payout $44.32 (triangulation)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const r = await sendOrder(chen, w.ben, [{ product_id: w.omega3, quantity: 3 }])
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ total_cents: 9000, platform_fee_cents: 68, provider_payout_cents: 4432 })
  })

  it('M4_AT_002 an order with no items is not sent (AE-002, FR-003)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const ok = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    expect(ok.status).toBe(201)
    const before = Number((await q('select count(*)::int as n from orders'))[0].n)
    const empty = await sendOrder(chen, w.ana, [])
    expectProblem(empty, 422, 'validation')
    const zero = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 0 }])
    expectProblem(zero, 422, 'validation')
    expect(Number((await q('select count(*)::int as n from orders'))[0].n)).toBe(before)
  })

  it('M4_AT_003 a product priced at its cost is below the floor and the order is not sent (AE-003, FR-004)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const ok = await sendOrder(chen, w.ana, [{ product_id: w.magnesium, quantity: 1 }])
    expect(ok.status).toBe(201)
    await setPracticePrice(w, w.magnesium, 1200)
    const before = Number((await q('select count(*)::int as n from orders'))[0].n)
    const r = await sendOrder(chen, w.ana, [{ product_id: w.magnesium, quantity: 1 }])
    expectProblem(r, 422, 'below-price-floor')
    expect(r.body.productIds).toEqual([w.magnesium])
    expect(Number((await q('select count(*)::int as n from orders'))[0].n)).toBe(before)
  })

  it('M4_AT_004 the patient sees every item, quantity, price and the total due (AE-004, FR-005)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await sendOrder(chen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    expect(sent.status).toBe(201)
    const ana = await signIn(EMAIL.ana)
    const r = await call(`/api/orders/${sent.body.order_id}`, { cookie: ana })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ status: 'sent', total_cents: 6000, practice_name: 'Willow Creek Wellness', is_test_payment: true })
    const lines = r.body.lines.map((l: any) => [l.name, l.quantity, l.unit_price_cents])
    expect(lines).toEqual(expect.arrayContaining([['Vitamin D3 2000 IU', 2, 1800], ['Magnesium Glycinate', 1, 2400]]))
  })

  it('M4_AT_015 a product the practice never priced shows at cost plus a 50% margin (AE-015, FR-017)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    await setPracticePrice(w, w.vitaminD3, 1950)
    const cat = await call(`/api/patients/${w.ana}/catalog`, { cookie: chen })
    expect(cat.status).toBe(200)
    const o3 = cat.body.items.find((i: any) => i.product_id === w.omega3)
    const d3 = cat.body.items.find((i: any) => i.product_id === w.vitaminD3)
    expect(o3.price_cents).toBe(3000)
    expect(d3.price_cents).toBe(1950)
  })

  it('M4_AT_017 sending creates one notice that names only the practice (AE-040, AE-041, FR-043, FR-044)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    expect(sent.status).toBe(201)
    const notices = await q('select token, patient_id from notices where order_id = $1', [sent.body.order_id])
    expect(notices).toHaveLength(1)
    expect(Number(notices[0].patient_id)).toBe(w.ana)
    const r = await call(`/api/notices/${notices[0].token}`)
    expect(r.status).toBe(200)
    expect(Object.keys(r.body).sort()).toEqual(['practice_name', 'sign_in_path'])
    expect(r.body.practice_name).toBe('Willow Creek Wellness')
    expect(r.text).not.toMatch(/Vitamin|1800|3600|\$36|Ana/)
  })

  it('M4_AT_021 pressing Send twice with the same key creates one order (FR-008 rule applied to EP-19, D41)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const key = newKey()
    const a = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }], key)
    const b = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }], key)
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(b.body.order_id).toBe(a.body.order_id)
    expect(Number((await q('select count(*)::int as n from orders'))[0].n)).toBe(1)
    const c = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 3 }], key)
    expectProblem(c, 422, 'idempotency-mismatch')
    const missing = await call('/api/orders', { method: 'POST', cookie: chen, key: null, body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 1 }] } })
    expectProblem(missing, 400, 'idempotency-key-missing')
  })

  it('M4_AT_022 a provider cannot send an order for another practice\'s patient (FR-009, LINV-3)', async () => {
    const w = app.world()
    const lee = await signIn(EMAIL.drLee)
    const own = await sendOrder(lee, w.carla, [{ product_id: w.vitaminD3, quantity: 1 }])
    expect(own.status).toBe(201)
    expect((await call(`/api/patients/${w.carla}/catalog`, { cookie: lee })).status).toBe(200)
    expectProblem(await call(`/api/patients/${w.ana}/catalog`, { cookie: lee }), 404, 'not-found')
    const other = await sendOrder(lee, w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    expectProblem(other, 404, 'not-found')
    const anaOrders = await q('select count(*)::int as n from orders where patient_id = $1', [w.ana])
    expect(anaOrders[0].n).toBe(0)
  })

  it('M4_AT_018 a provider cancels a sent, unpaid order and the patient sees it cancelled (AE-063, FR-066)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await sendOrder(chen, w.ben, [{ product_id: w.omega3, quantity: 1 }])
    expect(sent.status).toBe(201)
    const r = await call(`/api/orders/${sent.body.order_id}/cancel`, { method: 'POST', cookie: chen })
    expect(r.status).toBe(200)
    expect(r.body.status).toBe('cancelled')
    const rows = await q('select status, cancelled_at from orders where id = $1', [sent.body.order_id])
    expect(rows[0].status).toBe('cancelled')
    expect(rows[0].cancelled_at).not.toBeNull()
    const ben = await signIn(EMAIL.ben)
    const view = await call(`/api/orders/${sent.body.order_id}`, { cookie: ben })
    expect(view.status).toBe(200)
    expect(view.body.status).toBe('cancelled')
  })

  it('M4_AT_019 an order whose checkout has started cannot be cancelled (AE-064, FR-067)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const twin = await sendOrder(chen, w.ben, [{ product_id: w.omega3, quantity: 1 }])
    expect((await call(`/api/orders/${twin.body.order_id}/cancel`, { method: 'POST', cookie: chen })).status).toBe(200)
    const sent = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${sent.body.order_id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const r = await call(`/api/orders/${sent.body.order_id}/cancel`, { method: 'POST', cookie: chen })
    expectProblem(r, 409, 'invalid-transition')
    const rows = await q('select status from orders where id = $1', [sent.body.order_id])
    expect(rows[0].status).toBe('in_checkout')
  })

  it('M4_AT_037 the same product listed twice becomes one line with the quantities added (LINV-4, FR-002)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const r = await sendOrder(chen, w.ana, [
      { product_id: w.vitaminD3, quantity: 1 },
      { product_id: w.vitaminD3, quantity: 1 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    expect(r.status).toBe(201)
    expect(r.body.total_cents).toBe(6000)
    const lines = await q('select product_id, quantity from order_lines where order_id = $1', [r.body.order_id])
    expect(lines).toHaveLength(2)
    const d3 = lines.find((l: any) => Number(l.product_id) === w.vitaminD3)
    expect(d3.quantity).toBe(2)
  })

  it('M4_AT_039 a sent order\'s items and quantities cannot be changed through the app (AE-065, FR-068)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    expect(sent.status).toBe(201)
    const id = sent.body.order_id
    expect((await call(`/api/orders/${id}`, { cookie: chen })).status).toBe(200)
    const body = { lines: [{ product_id: w.vitaminD3, quantity: 3 }] }
    for (const method of ['PATCH', 'PUT']) {
      const r = await call(`/api/orders/${id}`, { method, cookie: chen, key: newKey(), body })
      expect([404, 405]).toContain(r.status)
    }
    const lines = await q('select quantity from order_lines where order_id = $1', [id])
    expect(lines.map((l: any) => l.quantity)).toEqual([2])
  })

  it('M4_AT_041 the floor is a $0.00 payout: $12.08 for a $12.00-cost item is refused, $12.09 is sent with a $0.00 payout (FR-004, FR-011, FR-012)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    await setPracticePrice(w, w.magnesium, 1209)
    const ok = await sendOrder(chen, w.ana, [{ product_id: w.magnesium, quantity: 1 }])
    expect(ok.status).toBe(201)
    expect(ok.body).toMatchObject({ total_cents: 1209, platform_fee_cents: 9, provider_payout_cents: 0 })
    await setPracticePrice(w, w.magnesium, 1208)
    const r = await sendOrder(chen, w.ana, [{ product_id: w.magnesium, quantity: 1 }])
    expectProblem(r, 422, 'below-price-floor')
    expect(r.body.productIds).toEqual([w.magnesium])
    expect(Number((await q('select count(*)::int as n from orders'))[0].n)).toBe(1)
  })

  it('M4_AT_044 a provider from another practice cannot cancel Ana\'s order (FR-066, FR-009, LINV-3)', async () => {
    const w = app.world()
    const lee = await signIn(EMAIL.drLee)
    const own = await sendOrder(lee, w.carla, [{ product_id: w.vitaminD3, quantity: 1 }])
    expect((await call(`/api/orders/${own.body.order_id}/cancel`, { method: 'POST', cookie: lee })).status).toBe(200)
    const chen = await signIn(EMAIL.drChen)
    const sent = await sendOrder(chen, w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    expect(sent.status).toBe(201)
    expectProblem(await call(`/api/orders/${sent.body.order_id}/cancel`, { method: 'POST', cookie: lee }), 404, 'not-found')
    const rows = await q('select status from orders where id = $1', [sent.body.order_id])
    expect(rows[0].status).toBe('sent')
  })
})
