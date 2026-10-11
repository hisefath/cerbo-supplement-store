// QA-owned by define-acceptance (specs/M6.1-patient-orders/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// M6.1 Patient orders (prd.md CQ-9, FR-039, AE-037, AE-067; screens.md S16; lld.md EP-42, FE-27): a patient lands on
// her own orders, newest sent first, each with its practice, total (as the order page shows it) and status.
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

async function send(patientId: number, lines: { product_id: number; quantity: number }[]) {
  const r = await call('/api/orders', { method: 'POST', cookie: await signIn(EMAIL.drChen), key: newKey(), body: { patient_id: patientId, lines } })
  if (r.status !== 201) throw new Error(`send returned ${r.status}: ${r.text.slice(0, 200)}`)
  return r.body.order_id as number
}
async function pay(email: string, orderId: number) {
  const cookie = await signIn(email)
  expect((await call(`/api/orders/${orderId}/checkout`, { method: 'POST', cookie })).status).toBe(200)
  expect((await call(`/api/orders/${orderId}/payments`, { method: 'POST', cookie, key: newKey() })).status).toBe(201)
}
const S16_EMPTY = 'No orders yet. Your practice will send you a message when they order supplements for you.'

describe('M6.1 patient orders', () => {
  it('M6.1_AT_001 Ana signs in to Your orders: her $60.00 sent order then her $30.00 paid order, practice and status each, none of Ben\'s (AE-067, AE-037, FR-039)', async () => {
    const w = app.world()
    const paid = await send(w.ana, [{ product_id: w.omega3, quantity: 1 }])
    await pay(EMAIL.ana, paid)
    const bens = await send(w.ben, [{ product_id: w.magnesium, quantity: 1 }])
    const sent = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }])
    const ana = await signIn(EMAIL.ana)
    const root = await call('/', { cookie: ana, redirect: 'manual' })
    expect([302, 303, 307]).toContain(root.status)
    expect(root.headers.get('location')).toBe('/orders')
    const page = await call('/orders', { cookie: ana, redirect: 'manual' })
    expect(page.status).toBe(200)
    expect(page.text).toMatch(/class="[^"]*\bpage-band\b[^"]*"[^>]*>(?:(?!<\/div>)[\s\S])*?<h1[^>]*>\s*Your orders\s*<\/h1>/)
    const r = await call('/api/orders', { cookie: ana })
    expect(r.status).toBe(200)
    expect(r.body.data.map((o: any) => [o.order_id, o.status, o.practice_name, o.total_cents])).toEqual([
      [sent, 'sent', 'Willow Creek Wellness', 6000],
      [paid, 'paid', 'Willow Creek Wellness', 3000],
    ])
    expect(r.body.data.map((o: any) => o.order_id)).not.toContain(bens)
    expect(r.body.data[1].paid_at).toBeTruthy()
    expect(r.body.data[0].paid_at).toBeNull()
    expect(r.body.next_cursor).toBeNull()
  })

  it('M6.1_AT_002 only a patient has an orders list: Dr. Chen and Omar get 403, a stranger 401, Ana 200 (FR-039, EP-42)', async () => {
    expect((await call('/api/orders', { cookie: await signIn(EMAIL.ana) })).status).toBe(200)
    expectProblem(await call('/api/orders', { cookie: await signIn(EMAIL.drChen) }), 403, 'forbidden')
    expectProblem(await call('/api/orders', { cookie: await signIn(EMAIL.omar) }), 403, 'forbidden')
    expectProblem(await call('/api/orders'), 401, 'unauthenticated')
  })

  it('M6.1_AT_003 Carla, with no orders, sees the S16 empty message and an empty list (S16 Empty)', async () => {
    const carla = await signIn(EMAIL.carla)
    const r = await call('/api/orders', { cookie: carla })
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ data: [], next_cursor: null })
    const page = await call('/orders', { cookie: carla, redirect: 'manual' })
    expect(page.status).toBe(200)
    expect(page.text).toContain(S16_EMPTY)
  })

  it('M6.1_AT_004 26 orders come 25 then 1, newest first with no repeats; a made-up cursor is 422 (EP-42 paging, BE-22)', async () => {
    const w = app.world()
    // one sign-in for all 26 sends: sign-in is rate-limited to 10 tries per 15 minutes (FR-039 limit)
    const chen = await signIn(EMAIL.drChen)
    const ids: number[] = []
    for (let i = 0; i < 26; i++) {
      const r = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 1 }] } })
      expect(r.status).toBe(201)
      ids.push(r.body.order_id)
    }
    const ana = await signIn(EMAIL.ana)
    const first = await call('/api/orders', { cookie: ana })
    expect(first.status).toBe(200)
    expect(first.body.data.length).toBe(25)
    expect(first.body.next_cursor).toBeTruthy()
    const second = await call(`/api/orders?cursor=${encodeURIComponent(first.body.next_cursor)}`, { cookie: ana })
    expect(second.status).toBe(200)
    const all = [...first.body.data, ...second.body.data].map((o: any) => o.order_id)
    expect(all).toEqual([...ids].reverse())
    expect(second.body.next_cursor).toBeNull()
    expectProblem(await call('/api/orders?cursor=not-a-cursor', { cookie: ana }), 422, 'validation')
  })

  it('M6.1_AT_005 each listed total is what the order page shows: after Magnesium goes from $24.00 to $26.00 the list and the order both say $62.00 (AE-067, EP-21 consistency)', async () => {
    const w = app.world()
    const id = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }])
    const chen = await signIn(EMAIL.drChen)
    const ch = await call(`/api/practice/prices/${w.magnesium}`, { method: 'PUT', cookie: chen, key: newKey(), body: { price_cents: 2600, reason: 'supplier rise', expected_current_price_cents: 2400 } })
    expect(ch.status).toBe(200)
    const ana = await signIn(EMAIL.ana)
    const order = await call(`/api/orders/${id}`, { cookie: ana })
    expect(order.body.total_cents).toBe(6200)
    const list = await call('/api/orders', { cookie: ana })
    expect(list.body.data.find((o: any) => o.order_id === id).total_cents).toBe(6200)
  })
})
