// QA-owned by define-acceptance (specs/M5-prices-and-stock/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-4 The provider sets prices; patients see changes before checkout and pay the held price during it.
// Prices change only through EP-28 (PUT /api/practice/prices/{productId}); the default price is 2 x cost (FR-017):
// Vitamin D3 $18.00 (cost $9.00), Magnesium Glycinate $24.00 (cost $12.00), Omega-3 Fish Oil $30.00 (cost $15.00).
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { APP_URL, q, withClient } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

type Change = { price_cents?: number; margin_basis_points?: number; reason: string; expected_current_price_cents: number }

function changePrice(cookie: string, productId: number, body: Change, key: string | null = newKey()) {
  return call(`/api/practice/prices/${productId}`, { method: 'PUT', cookie, key, body })
}

async function sendAs(email: string, patientId: number, lines: { product_id: number; quantity: number }[]) {
  const cookie = await signIn(email)
  const r = await call('/api/orders', { method: 'POST', cookie, key: newKey(), body: { patient_id: patientId, lines } })
  if (r.status !== 201) throw new Error(`send returned ${r.status}: ${r.text.slice(0, 200)}`)
  return r.body.order_id as number
}

const priceRow = async (practiceId: number, productId: number) =>
  (await q('select price_cents from practice_prices where practice_id = $1 and product_id = $2', [practiceId, productId]))[0]
const historyCount = async (practiceId: number) =>
  (await q('select count(*)::int as n from price_changes where practice_id = $1', [practiceId]))[0].n as number

describe('US-4 the provider changes a price', () => {
  it('M5_AT_001 a 60% margin on Omega-3 sets $37.50 and records who, when, $30.00, $37.50 and the reason (AE-016, FR-018, FR-019)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.omega3, {
      margin_basis_points: 6000,
      reason: 'new protocol pricing',
      expected_current_price_cents: 3000,
    })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ product_id: w.omega3, price_cents: 3750, is_default: false, set_by_display_name: 'Dr. Maya Chen' })
    const list = await call('/api/practice/prices', { cookie: chen })
    expect(list.status).toBe(200)
    expect(list.body.prices.find((p: any) => p.product_id === w.omega3).price_cents).toBe(3750)
    expect(list.body.history[0]).toMatchObject({
      product_name: 'Omega-3 Fish Oil',
      changed_by_display_name: 'Dr. Maya Chen',
      old_price_cents: 3000,
      new_price_cents: 3750,
      reason: 'new protocol pricing',
    })
    expect(Math.abs(Date.parse(list.body.history[0].changed_at) - Date.now())).toBeLessThan(60_000)
    expect(await historyCount(w.willowCreek)).toBe(1)
  })

  it('M5_AT_002 a new price of $19.50 on Vitamin D3 becomes its price (AE-017, FR-018)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.vitaminD3, { price_cents: 1950, reason: 'supplier rise', expected_current_price_cents: 1800 })
    expect(r.status).toBe(200)
    expect(r.body.price_cents).toBe(1950)
    expect((await priceRow(w.willowCreek, w.vitaminD3)).price_cents).toBe(1950)
  })

  it('M5_AT_003 $12.00 for Magnesium Glycinate (cost $12.00) is refused and $12.09 is shown as the lowest allowed (AE-018, FR-020, INV-6)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.magnesium, { price_cents: 1200, reason: 'test', expected_current_price_cents: 2400 })
    expectProblem(r, 422, 'below-price-floor')
    expect(r.body.lowestAllowedPriceCents).toBe(1209)
    expect(await historyCount(w.willowCreek)).toBe(0)
    const ok = await changePrice(chen, w.magnesium, { price_cents: 1209, reason: 'at the floor', expected_current_price_cents: 2400 })
    expect(ok.status).toBe(200)
    expect(ok.body.price_cents).toBe(1209)
  })

  it('M5_AT_004 the app user cannot edit or delete a price history entry; it still shows $30.00 to $37.50 (AE-019, FR-021, INV-4)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.omega3, { margin_basis_points: 6000, reason: 'new protocol pricing', expected_current_price_cents: 3000 })
    expect(r.status).toBe(200)
    const errors = await withClient(APP_URL, async (c) => {
      const codes: string[] = []
      const seen = await c.query('select count(*)::int as n from price_changes')
      codes.push(`select:${seen.rows[0].n}`)
      for (const sql of ['update price_changes set new_price_cents = 1', 'delete from price_changes']) {
        try {
          await c.query(sql)
          codes.push('allowed')
        } catch (e) {
          codes.push((e as { code?: string }).code ?? 'unknown')
        }
      }
      return codes
    })
    expect(errors).toEqual(['select:1', '42501', '42501'])
    const row = (await q('select old_price_cents, new_price_cents from price_changes'))[0]
    expect(row).toEqual({ old_price_cents: 3000, new_price_cents: 3750 })
  })
})

describe('US-4 patients see price changes before checkout and pay the held price during it', () => {
  it('M5_AT_005 a change before checkout shows "Magnesium Glycinate: $24.00 → $26.00" and a $62.00 total (AE-020, FR-022)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    const ana = await signIn(EMAIL.ana)
    const before = await call(`/api/orders/${id}`, { cookie: ana })
    expect(before.status).toBe(200)
    expect(before.body.total_cents).toBe(6000)
    expect(before.body.price_changes).toEqual([])
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.magnesium, { price_cents: 2600, reason: 'supplier rise', expected_current_price_cents: 2400 })
    expect(r.status).toBe(200)
    const after = await call(`/api/orders/${id}`, { cookie: ana })
    expect(after.body.total_cents).toBe(6200)
    expect(after.body.price_changes).toEqual([
      { product_id: w.magnesium, name: 'Magnesium Glycinate', old_price_cents: 2400, new_price_cents: 2600 },
    ])
  })

  it('M5_AT_006 a change during checkout does not change what Ana pays: $60.00 (AE-021, FR-023, FR-024, INV-8)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    const ana = await signIn(EMAIL.ana)
    const c = await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })
    expect(c.status).toBe(200)
    expect(c.body.total_cents).toBe(6000)
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.vitaminD3, { price_cents: 2000, reason: 'supplier rise', expected_current_price_cents: 1800 })
    expect(r.status).toBe(200)
    expect((await priceRow(w.willowCreek, w.vitaminD3)).price_cents).toBe(2000)
    const pay = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expect(pay.status).toBe(201)
    expect(pay.body.amount_paid_cents).toBe(6000)
    expect(pay.body.lines.find((l: any) => l.product_id === w.vitaminD3).unit_price_cents).toBe(1800)
  })

  it('M5_AT_007 after the 30-minute hold ends the order shows $26.00 with the notice (AE-035, FR-037, FR-022)', async () => {
    const w = app.world()
    const id = await sendAs(EMAIL.drChen, w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    const ana = await signIn(EMAIL.ana)
    const c = await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })
    expect(c.status).toBe(200)
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.magnesium, { price_cents: 2600, reason: 'supplier rise', expected_current_price_cents: 2400 })
    expect(r.status).toBe(200)
    const held = await call(`/api/orders/${id}`, { cookie: ana })
    expect(held.body.status).toBe('in_checkout')
    expect(held.body.total_cents).toBe(6000)
    // 31 minutes later: the hold started 30 minutes and one second ago (FR-037).
    await q("update orders set prices_held_until = now() - interval '1 minute' where id = $1", [id])
    const back = await call(`/api/orders/${id}`, { cookie: ana })
    expect(back.body.status).toBe('sent')
    expect(back.body.total_cents).toBe(6200)
    expect(back.body.prices_held_until).toBeNull()
    expect(back.body.price_changes).toEqual([
      { product_id: w.magnesium, name: 'Magnesium Glycinate', old_price_cents: 2400, new_price_cents: 2600 },
    ])
  })
})

describe('US-4 price changes: edges', () => {
  it('M5_AT_008 a change made from a stale form is refused with the current price, and nothing is recorded (EDGE-012, FR-018, FR-019)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const first = await changePrice(chen, w.vitaminD3, { price_cents: 1950, reason: 'first', expected_current_price_cents: 1800 })
    expect(first.status).toBe(200)
    const stale = await changePrice(chen, w.vitaminD3, { price_cents: 2100, reason: 'from an old form', expected_current_price_cents: 1800 })
    expectProblem(stale, 409, 'stale-price')
    expect(stale.body.currentPriceCents).toBe(1950)
    expect((await priceRow(w.willowCreek, w.vitaminD3)).price_cents).toBe(1950)
    expect(await historyCount(w.willowCreek)).toBe(1)
  })

  it('M5_AT_009 a patient cannot change a price, and Dr. Lee changes only Maple Grove prices (EDGE-016, EDGE-017, FR-018)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const allowed = await changePrice(chen, w.omega3, { price_cents: 3200, reason: 'allowed twin', expected_current_price_cents: 3000 })
    expect(allowed.status).toBe(200)
    const ana = await signIn(EMAIL.ana)
    const refused = await changePrice(ana, w.omega3, { price_cents: 3300, reason: 'not mine', expected_current_price_cents: 3200 })
    expectProblem(refused, 403, 'forbidden')
    expect((await priceRow(w.willowCreek, w.omega3)).price_cents).toBe(3200)
    const lee = await signIn(EMAIL.drLee)
    const theirs = await changePrice(lee, w.omega3, { price_cents: 3400, reason: 'Maple Grove only', expected_current_price_cents: 3000 })
    expect(theirs.status).toBe(200)
    expect((await priceRow(w.mapleGrove, w.omega3)).price_cents).toBe(3400)
    expect((await priceRow(w.willowCreek, w.omega3)).price_cents).toBe(3200)
    expect(await historyCount(w.willowCreek)).toBe(1)
  })

  it('M5_AT_010 the same change sent twice with one key is recorded once (EDGE-014, FR-019)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const key = newKey()
    const body = { price_cents: 1950, reason: 'double click', expected_current_price_cents: 1800 }
    const one = await changePrice(chen, w.vitaminD3, body, key)
    const two = await changePrice(chen, w.vitaminD3, body, key)
    expect(one.status).toBe(200)
    expect(two.status).toBe(200)
    expect(two.body).toEqual(one.body)
    expect(await historyCount(w.willowCreek)).toBe(1)
    const noKey = await changePrice(chen, w.vitaminD3, { ...body, expected_current_price_cents: 1950 }, null)
    expectProblem(noKey, 400, 'idempotency-key-missing')
  })

  it('M5_AT_011 both a price and a margin, or no reason, is a validation problem and changes nothing (EDGE-001, EDGE-002, FR-018)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const both = await changePrice(chen, w.vitaminD3, {
      price_cents: 1950,
      margin_basis_points: 5000,
      reason: 'both',
      expected_current_price_cents: 1800,
    })
    expectProblem(both, 422, 'validation')
    const noReason = await call(`/api/practice/prices/${w.vitaminD3}`, {
      method: 'PUT',
      cookie: chen,
      key: newKey(),
      body: { price_cents: 1950, expected_current_price_cents: 1800 },
    })
    expectProblem(noReason, 422, 'validation')
    expect(await historyCount(w.willowCreek)).toBe(0)
  })

  it('M5_AT_012 a 99% margin gives $1,200.00 for Magnesium Glycinate; a 0% margin is below the floor (EDGE-004, EDGE-005, FR-018, FR-020)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const zero = await changePrice(chen, w.magnesium, { margin_basis_points: 0, reason: 'zero', expected_current_price_cents: 2400 })
    expectProblem(zero, 422, 'below-price-floor')
    expect(zero.body.lowestAllowedPriceCents).toBe(1209)
    const top = await changePrice(chen, w.magnesium, { margin_basis_points: 9900, reason: 'top', expected_current_price_cents: 2400 })
    expect(top.status).toBe(200)
    expect(top.body.price_cents).toBe(120000)
  })

  it('M5_AT_013 a 33.33% margin on Vitamin D3 (cost $9.00) rounds half-up to $13.50 (EDGE-022, FR-018)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const r = await changePrice(chen, w.vitaminD3, { margin_basis_points: 3333, reason: 'rounding', expected_current_price_cents: 1800 })
    expect(r.status).toBe(200)
    expect(r.body.price_cents).toBe(1350)
    expect(r.body.margin_basis_points).toBe(3333)
  })
})
