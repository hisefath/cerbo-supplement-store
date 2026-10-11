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
