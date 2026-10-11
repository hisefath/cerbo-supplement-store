// QA-owned by define-acceptance (specs/M5-prices-and-stock/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-5 Stock is reserved when a payment starts and returned when it fails (lld.md stock_movements.kind, BE-13
// releaseForOrder). The payment stand-in answers "decline" for this file (LLD SEAM-3).
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'decline' })

describe('US-5 a failed payment returns its stock', () => {
  it('M5_AT_034 a declined payment for 2 Vitamin D3 reserves them, then returns them: stock 10, one sale and one sale_release (FR-026, FR-027, INV-5, FM-1)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const s = await call('/api/orders', {
      method: 'POST',
      cookie: chen,
      key: newKey(),
      body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }] },
    })
    expect(s.status).toBe(201)
    const id = s.body.order_id as number
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const r = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expectProblem(r, 502, 'payment-failed')
    const moves = await q('select kind, change from stock_movements where order_id = $1 order by id', [id])
    expect(moves).toEqual([
      { kind: 'sale', change: -2 },
      { kind: 'sale_release', change: 2 },
    ])
    expect((await q('select units_in_stock from products where id = $1', [w.vitaminD3]))[0].units_in_stock).toBe(10)
  })
})

// A payment in flight (lld.md SM-2 processing) and one abandoned for 2 minutes (lld.md FM-7). The attempt and its
// reservation are arranged in the LLD-named tables, as BE-10.pay's transaction 1 leaves them: an attempt still
// processing and a `sale` movement of the order's units (M5-pass2 R3, M5-pass4 R1, R2).
async function inCheckoutForTwo(patientId: number, email: string): Promise<{ id: number; cookie: string }> {
  const w = app.world()
  const chen = await signIn(EMAIL.drChen)
  const s = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: patientId, lines: [{ product_id: w.vitaminD3, quantity: 2 }] } })
  expect(s.status).toBe(201)
  const id = s.body.order_id as number
  const cookie = await signIn(email)
  expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie })).status).toBe(200)
  return { id, cookie }
}

async function paymentStartedAgo(orderId: number, age: string): Promise<void> {
  const w = app.world()
  await q(
    `insert into payment_attempts (order_id, idempotency_key, amount_cents, created_at) values ($1, $2, 3600, now() - $3::interval)`,
    [orderId, newKey(), age],
  )
  const [p] = await q('update products set units_in_stock = units_in_stock - 2 where id = $1 returning units_in_stock', [w.vitaminD3])
  await q(`insert into stock_movements (product_id, change, kind, reason, order_id, units_after) values ($1, -2, 'sale', $2, $3, $4)`, [
    w.vitaminD3,
    `Order ${orderId}`,
    orderId,
    p.units_in_stock,
  ])
}

const holdEnded = (orderId: number) => q("update orders set prices_held_until = now() - interval '1 minute' where id = $1", [orderId])

describe('US-5 a payment in flight keeps its hold; an abandoned one returns its stock', () => {
  it('M5_AT_035 a payment started 1 minute 50 seconds ago keeps the ended hold and its 2 reserved units; an order with no payment returns to sent (SM-2, FR-037, M5-pass2 R3)', async () => {
    const w = app.world()
    const ana = await inCheckoutForTwo(w.ana, EMAIL.ana)
    const ben = await inCheckoutForTwo(w.ben, EMAIL.ben)
    await paymentStartedAgo(ana.id, '1 minute 50 seconds')
    await holdEnded(ana.id)
    await holdEnded(ben.id)
    // live twin: Ben's ended hold with no payment goes back to sent when he reads his order (FR-037)
    const b = await call(`/api/orders/${ben.id}`, { cookie: ben.cookie })
    expect(b.status).toBe(200)
    expect(b.body.status).toBe('sent')
    const a = await call(`/api/orders/${ana.id}`, { cookie: ana.cookie })
    expect(a.status).toBe(200)
    expect(a.body.status).toBe('in_checkout')
    const [o] = await q('select status, prices_held_until is not null as held from orders where id = $1', [ana.id])
    expect(o).toEqual({ status: 'in_checkout', held: true })
    expect((await q('select held_unit_price_cents from order_lines where order_id = $1', [ana.id]))[0].held_unit_price_cents).toBe(1800)
    expect((await q('select status from payment_attempts where order_id = $1', [ana.id]))[0].status).toBe('processing')
    expect((await q('select units_in_stock from products where id = $1', [w.vitaminD3]))[0].units_in_stock).toBe(8)
  })

  it('M5_AT_036 a payment processing for 2 minutes 10 seconds is reconciled on the next read: attempt failed no_answer, 2 units returned once, order payment_failed (FM-7, FR-027, INV-5, M5-pass4 R1, R2)', async () => {
    const w = app.world()
    const ana = await inCheckoutForTwo(w.ana, EMAIL.ana)
    await paymentStartedAgo(ana.id, '2 minutes 10 seconds')
    await holdEnded(ana.id)
    // read twice at the same moment, then once more: the units come back exactly once
    const [r1, r2] = await Promise.all([
      call(`/api/orders/${ana.id}`, { cookie: ana.cookie }),
      call(`/api/orders/${ana.id}`, { cookie: ana.cookie }),
    ])
    expect([r1.status, r2.status]).toEqual([200, 200])
    const r3 = await call(`/api/orders/${ana.id}`, { cookie: ana.cookie })
    expect(r3.body.status).toBe('payment_failed')
    expect(await q('select status, failure_reason, finished_at is not null as finished from payment_attempts where order_id = $1', [ana.id])).toEqual([
      { status: 'failed', failure_reason: 'no_answer', finished: true },
    ])
    expect(await q('select kind, change, units_after from stock_movements where order_id = $1 order by id', [ana.id])).toEqual([
      { kind: 'sale', change: -2, units_after: 8 },
      { kind: 'sale_release', change: 2, units_after: 10 },
    ])
    expect((await q('select units_in_stock from products where id = $1', [w.vitaminD3]))[0].units_in_stock).toBe(10)
    expect((await q('select status from orders where id = $1', [ana.id]))[0].status).toBe('payment_failed')
  })
})
