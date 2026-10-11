// QA-owned by define-acceptance (specs/M5-prices-and-stock/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-5 Stock limits, stock adjustments by platform staff, and the practice dashboard.
// Seeded stock: Vitamin D3 10, Magnesium Glycinate 5, Omega-3 Fish Oil 3 (tests/acceptance/support/people.ts).
// Tests marked "green: pins" in acceptance.md guard behaviour M4 already built (Q-1).
import pg from 'pg'
import { describe, expect, it } from 'vitest'
import { allocateFee } from '../../../server/services/money'
import { useApp } from '../support/app'
import { APP_URL, OWNER_URL, q, withClient } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

const thisMonth = () => new Date().toISOString().slice(0, 7)

async function send(patientId: number, lines: { product_id: number; quantity: number }[], email: string = EMAIL.drChen) {
  const cookie = await signIn(email)
  const r = await call('/api/orders', { method: 'POST', cookie, key: newKey(), body: { patient_id: patientId, lines } })
  if (r.status !== 201) throw new Error(`send returned ${r.status}: ${r.text.slice(0, 200)}`)
  return r.body.order_id as number
}

async function checkoutAndPay(email: string, orderId: number) {
  const cookie = await signIn(email)
  const c = await call(`/api/orders/${orderId}/checkout`, { method: 'POST', cookie })
  if (c.status !== 200) throw new Error(`checkout returned ${c.status}: ${c.text.slice(0, 200)}`)
  return call(`/api/orders/${orderId}/payments`, { method: 'POST', cookie, key: newKey() })
}

const stock = async (productId: number) =>
  (await q('select units_in_stock from products where id = $1', [productId]))[0].units_in_stock as number
const setStock = (productId: number, n: number) => q('update products set units_in_stock = $2 where id = $1', [productId, n])

function adjust(cookie: string, productId: number, body: { change: number; reason: string; expected_units_in_stock: number }, key = newKey()) {
  return call(`/api/ops/stock/${productId}/adjustments`, { method: 'POST', cookie, key, body })
}

describe('US-5 stock limits', () => {
  it('M5_AT_014 a quantity of 3 Vitamin D3 with 2 in stock is refused and shows 2 available (AE-022, FR-025)', async () => {
    const w = app.world()
    await setStock(w.vitaminD3, 2)
    const chen = await signIn(EMAIL.drChen)
    const ok = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }] } })
    expect(ok.status).toBe(201)
    const r = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ben, lines: [{ product_id: w.vitaminD3, quantity: 3 }] } })
    expectProblem(r, 422, 'insufficient-stock')
    expect(r.body.productIds).toEqual([w.vitaminD3])
    expect(r.body.unitsAvailable).toEqual([2])
    expect((await q('select count(*)::int as n from orders where patient_id = $1', [w.ben]))[0].n).toBe(0)
  })

  it('M5_AT_015 paying for 2 Vitamin D3 with 1 in stock is refused, nothing is charged, Vitamin D3 is named (AE-023, FR-026, INV-5)', async () => {
    const w = app.world()
    const id = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    await setStock(w.vitaminD3, 1)
    const r = await checkoutAndPay(EMAIL.ana, id)
    expectProblem(r, 422, 'insufficient-stock')
    expect(r.body.productIds).toEqual([w.vitaminD3])
    expect((await q("select count(*)::int as n from payment_attempts where order_id = $1 and status = 'succeeded'", [id]))[0].n).toBe(0)
    expect((await q('select count(*)::int as n from ledger_entries where order_id = $1', [id]))[0].n).toBe(0)
    expect(await stock(w.vitaminD3)).toBe(1)
  })

  it('M5_AT_016 Ana and Ben pay for the last Omega-3 at the same moment: exactly one succeeds, the other is refused uncharged (AE-024, FR-026, INV-5, EC-7)', async () => {
    const w = app.world()
    const a = await send(w.ana, [{ product_id: w.omega3, quantity: 1 }])
    const b = await send(w.ben, [{ product_id: w.omega3, quantity: 1 }])
    await setStock(w.omega3, 1)
    const anaCookie = await signIn(EMAIL.ana)
    const benCookie = await signIn(EMAIL.ben)
    for (const [cookie, id] of [[anaCookie, a], [benCookie, b]] as const) {
      const c = await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie })
      expect(c.status).toBe(200)
    }
    const [ra, rb] = await Promise.all([
      call(`/api/orders/${a}/payments`, { method: 'POST', cookie: anaCookie, key: newKey() }),
      call(`/api/orders/${b}/payments`, { method: 'POST', cookie: benCookie, key: newKey() }),
    ])
    expect([ra.status, rb.status].sort()).toEqual([201, 422])
    const refused = ra.status === 422 ? ra : rb
    expectProblem(refused, 422, 'insufficient-stock')
    expect(await stock(w.omega3)).toBe(0)
    const paid = await q("select count(*)::int as n from payment_attempts where order_id in ($1, $2) and status = 'succeeded'", [a, b])
    expect(paid[0].n).toBe(1)
  })
})

describe('US-5 stock adjustments by platform staff', () => {
  it('M5_AT_017 Omar adds 12 Vitamin D3 with "delivery received": stock 20, history shows who, when, +12 and the reason (AE-027, FR-030, NFR-003, NFR-014)', async () => {
    const w = app.world()
    await setStock(w.vitaminD3, 8)
    const omar = await signIn(EMAIL.omar)
    const r = await adjust(omar, w.vitaminD3, { change: 12, reason: 'delivery received', expected_units_in_stock: 8 })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ change: 12, kind: 'adjustment', reason: 'delivery received', actor_display_name: 'Omar Ortega', units_in_stock_after: 20 })
    expect(await stock(w.vitaminD3)).toBe(20)
    const list = await call('/api/ops/stock', { cookie: omar })
    expect(list.status).toBe(200)
    expect(list.body.products.find((p: any) => p.product_id === w.vitaminD3).units_in_stock).toBe(20)
    expect(list.body.history[0]).toMatchObject({ product_name: 'Vitamin D3 2000 IU', change: 12, reason: 'delivery received', actor_display_name: 'Omar Ortega' })
    expect(Math.abs(Date.parse(list.body.history[0].created_at) - Date.now())).toBeLessThan(60_000)
  })

  it('M5_AT_018 Dr. Chen cannot record an adjustment; stock is unchanged (AE-036, FR-038)', async () => {
    const w = app.world()
    await setStock(w.vitaminD3, 8)
    const omar = await signIn(EMAIL.omar)
    const allowed = await adjust(omar, w.vitaminD3, { change: 1, reason: 'allowed twin', expected_units_in_stock: 8 })
    expect(allowed.status).toBe(201)
    const chen = await signIn(EMAIL.drChen)
    const r = await adjust(chen, w.vitaminD3, { change: 5, reason: 'not allowed', expected_units_in_stock: 9 })
    expectProblem(r, 403, 'forbidden')
    expect(await stock(w.vitaminD3)).toBe(9)
    expect((await q("select count(*)::int as n from stock_movements where kind = 'adjustment'"))[0].n).toBe(1)
  })

  it('M5_AT_019 an adjustment from a stale count, or one that would go below zero, is refused and changes nothing (EDGE-031, EDGE-032, FR-030, INV-5)', async () => {
    const w = app.world()
    await setStock(w.vitaminD3, 8)
    const omar = await signIn(EMAIL.omar)
    const ok = await adjust(omar, w.vitaminD3, { change: 1, reason: 'count fix', expected_units_in_stock: 8 })
    expect(ok.status).toBe(201)
    const stale = await adjust(omar, w.vitaminD3, { change: 2, reason: 'old screen', expected_units_in_stock: 8 })
    expectProblem(stale, 409, 'stale-stock')
    expect(stale.body.unitsInStock).toBe(9)
    const below = await adjust(omar, w.vitaminD3, { change: -10, reason: 'too many', expected_units_in_stock: 9 })
    expectProblem(below, 422, 'insufficient-stock')
    expect(await stock(w.vitaminD3)).toBe(9)
  })

  it('M5_AT_020 the same adjustment sent twice with one key is recorded once (EDGE-033, FR-030)', async () => {
    const w = app.world()
    await setStock(w.vitaminD3, 8)
    const omar = await signIn(EMAIL.omar)
    const key = newKey()
    const body = { change: 12, reason: 'delivery received', expected_units_in_stock: 8 }
    const one = await adjust(omar, w.vitaminD3, body, key)
    const two = await adjust(omar, w.vitaminD3, body, key)
    expect(one.status).toBe(201)
    expect(two.status).toBe(201)
    expect(two.body).toEqual(one.body)
    expect(await stock(w.vitaminD3)).toBe(20)
  })
})

describe('US-5 the practice dashboard', () => {
  it('M5_AT_021 after Ana pays for 2 of 10 Vitamin D3 the dashboard shows 8 in stock (AE-025, FR-027, FR-029)', async () => {
    const w = app.world()
    const id = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    const pay = await checkoutAndPay(EMAIL.ana, id)
    expect(pay.status).toBe(201)
    const chen = await signIn(EMAIL.drChen)
    const d = await call(`/api/practice/dashboard?month=${thisMonth()}`, { cookie: chen })
    expect(d.status).toBe(200)
    expect(d.body.sales.find((s: any) => s.product_id === w.vitaminD3).units_in_stock).toBe(8)
    expect(await stock(w.vitaminD3)).toBe(8)
  })

  it('M5_AT_022 two paid orders totalling 3 Vitamin D3 show 3 sold, $54.00 paid and $26.59 payout for the month (AE-026, FR-028, FR-069, LINV-1)', async () => {
    const w = app.world()
    const a = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    const b = await send(w.ben, [{ product_id: w.vitaminD3, quantity: 1 }])
    expect((await checkoutAndPay(EMAIL.ana, a)).status).toBe(201)
    expect((await checkoutAndPay(EMAIL.ben, b)).status).toBe(201)
    await send(w.ana, [{ product_id: w.vitaminD3, quantity: 1 }]) // sent, unpaid: not a sale (EDGE-018)
    const chen = await signIn(EMAIL.drChen)
    const d = await call(`/api/practice/dashboard?month=${thisMonth()}`, { cookie: chen })
    expect(d.status).toBe(200)
    // $36.00 order: fee 27c, payout 3600 - 1800 - 27 = 1773; $18.00 order: fee 14c, payout 1800 - 900 - 14 = 886.
    expect(d.body.sales.find((s: any) => s.product_id === w.vitaminD3)).toMatchObject({
      name: 'Vitamin D3 2000 IU',
      units_sold: 3,
      patients_paid_cents: 5400,
      provider_payout_cents: 2659,
    })
    expect(d.body.sales.find((s: any) => s.product_id === w.omega3)).toMatchObject({ units_sold: 0, patients_paid_cents: 0, provider_payout_cents: 0 })
  })

  it('M5_AT_023 the orders list shows Ana paid $60.00 and Ben sent $30.00 with their times (AE-042, FR-045)', async () => {
    const w = app.world()
    const a = await send(w.ana, [
      { product_id: w.vitaminD3, quantity: 2 },
      { product_id: w.magnesium, quantity: 1 },
    ])
    const b = await send(w.ben, [{ product_id: w.omega3, quantity: 1 }])
    expect((await checkoutAndPay(EMAIL.ana, a)).status).toBe(201)
    const chen = await signIn(EMAIL.drChen)
    const r = await call(`/api/practice/orders?month=${thisMonth()}`, { cookie: chen })
    expect(r.status).toBe(200)
    const byId = new Map(r.body.data.map((o: any) => [o.order_id, o]))
    expect(byId.get(a)).toMatchObject({ patient_display_name: 'Ana Ruiz', total_cents: 6000, status: 'paid' })
    expect(byId.get(b)).toMatchObject({ patient_display_name: 'Ben Ortiz', total_cents: 3000, status: 'sent', paid_at: null })
    expect((byId.get(a) as any).paid_at).toBeTruthy()
    expect((byId.get(b) as any).sent_at).toBeTruthy()
    expect(r.body.data.length).toBe(2)
  })

  it('M5_AT_024 an order unpaid for 4 days is flagged "Awaiting payment for 4 days"; one unpaid for 2 days is not (AE-043, FR-046)', async () => {
    const w = app.world()
    const old = await send(w.ben, [{ product_id: w.omega3, quantity: 1 }])
    const recent = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    await q("update orders set sent_at = now() - interval '4 days' where id = $1", [old])
    await q("update orders set sent_at = now() - interval '2 days 23 hours' where id = $1", [recent])
    const chen = await signIn(EMAIL.drChen)
    const d = await call(`/api/practice/dashboard?month=${thisMonth()}`, { cookie: chen })
    expect(d.status).toBe(200)
    const awaiting = d.body.attention.filter((a: any) => a.kind === 'awaiting_payment')
    expect(awaiting).toEqual([{ kind: 'awaiting_payment', label: 'Awaiting payment for 4 days', order_id: old, product_id: null }])
  })

  it('M5_AT_025 Omega-3 with 3 left is flagged "Low stock: 3 left"; Magnesium with 4 left is not (AE-044, FR-047)', async () => {
    const w = app.world()
    await setStock(w.magnesium, 4)
    const chen = await signIn(EMAIL.drChen)
    const d = await call(`/api/practice/dashboard?month=${thisMonth()}`, { cookie: chen })
    expect(d.status).toBe(200)
    const low = d.body.attention.filter((a: any) => a.kind === 'low_stock')
    expect(low).toEqual([{ kind: 'low_stock', label: 'Low stock: 3 left', order_id: null, product_id: w.omega3 }])
  })

  it('M5_AT_026 a patient cannot open the dashboard, and Dr. Lee does not see Willow Creek orders (EDGE-040, EDGE-041, FR-028, FR-045)', async () => {
    const w = app.world()
    const a = await send(w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    expect((await checkoutAndPay(EMAIL.ana, a)).status).toBe(201)
    const chen = await signIn(EMAIL.drChen)
    const mine = await call(`/api/practice/orders?month=${thisMonth()}`, { cookie: chen })
    expect(mine.status).toBe(200)
    expect(mine.body.data.map((o: any) => o.order_id)).toEqual([a])
    const ana = await signIn(EMAIL.ana)
    expectProblem(await call(`/api/practice/dashboard?month=${thisMonth()}`, { cookie: ana }), 403, 'forbidden')
    const lee = await signIn(EMAIL.drLee)
    const theirs = await call(`/api/practice/orders?month=${thisMonth()}`, { cookie: lee })
    expect(theirs.status).toBe(200)
    expect(theirs.body.data).toEqual([])
    const leeDash = await call(`/api/practice/dashboard?month=${thisMonth()}`, { cookie: lee })
    expect(leeDash.body.sales.find((s: any) => s.product_id === w.vitaminD3).units_sold).toBe(0)
  })

  it('M5_AT_027 a $3.00 order of three $1.00 lines with a $0.02 fee shares it as $0.01, $0.01, $0.00 (AE-066, FR-069, LINV-1)', () => {
    expect(allocateFee([100, 100, 100], 2)).toEqual([1, 1, 0])
    // triangulation: $72.00 of $18.00, $24.00 and $30.00 with a 54c fee -> 13.5, 18, 22.5 -> 14, 18, 22 (ties: earlier line)
    expect(allocateFee([1800, 2400, 3000], 54)).toEqual([14, 18, 22])
  })

  it('M5_AT_028 a paid order of all three products stores fee shares that add up to its 54c fee (FR-069, LINV-1)', async () => {
    const w = app.world()
    const id = await send(w.ana, [
      { product_id: w.vitaminD3, quantity: 1 },
      { product_id: w.magnesium, quantity: 1 },
      { product_id: w.omega3, quantity: 1 },
    ])
    expect((await checkoutAndPay(EMAIL.ana, id)).status).toBe(201)
    const rows = await q('select product_id, fee_share_cents from order_lines where order_id = $1 order by id', [id])
    const shares = new Map(rows.map((r: any) => [Number(r.product_id), r.fee_share_cents]))
    expect([shares.get(w.vitaminD3), shares.get(w.magnesium), shares.get(w.omega3)]).toEqual([14, 18, 22])
    expect((await q('select platform_fee_cents from orders where id = $1', [id]))[0].platform_fee_cents).toBe(54)
  })
})

describe('US-5 review pins (M5-pass3 R1, M5-pass6 R5)', () => {
  it('M5_AT_037 awaiting-payment items stay inside the viewer\'s practice: Dr. Chen sees Ben\'s 4-day order, Dr. Lee sees Carla\'s, neither sees the other\'s (FR-046, FR-045)', async () => {
    const w = app.world()
    const bens = await send(w.ben, [{ product_id: w.vitaminD3, quantity: 1 }])
    const carlas = await send(w.carla, [{ product_id: w.vitaminD3, quantity: 1 }], EMAIL.drLee)
    await q("update orders set sent_at = now() - interval '4 days' where id in ($1, $2)", [bens, carlas])
    const awaiting = async (email: string) => {
      const d = await call(`/api/practice/dashboard?month=${thisMonth()}`, { cookie: await signIn(email) })
      expect(d.status).toBe(200)
      return d.body.attention.filter((a: any) => a.kind === 'awaiting_payment')
    }
    expect(await awaiting(EMAIL.drChen)).toEqual([{ kind: 'awaiting_payment', label: 'Awaiting payment for 4 days', order_id: bens, product_id: null }])
    expect(await awaiting(EMAIL.drLee)).toEqual([{ kind: 'awaiting_payment', label: 'Awaiting payment for 4 days', order_id: carlas, product_id: null }])
  })

  it('M5_AT_038 with the last Omega-3 row held by another transaction, Ana and Ben both pay and wait; once it is let go exactly one succeeds and the other gets 422 naming Omega-3 with 0 available (AE-024, FR-026, INV-5, M5-pass3 R1)', async () => {
    const w = app.world()
    const a = await send(w.ana, [{ product_id: w.omega3, quantity: 1 }])
    const b = await send(w.ben, [{ product_id: w.omega3, quantity: 1 }])
    await setStock(w.omega3, 1)
    const anaCookie = await signIn(EMAIL.ana)
    const benCookie = await signIn(EMAIL.ben)
    for (const [cookie, id] of [[anaCookie, a], [benCookie, b]] as const)
      expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie })).status).toBe(200)
    // Hold the Omega-3 row from a side connection, so both payments are queued behind it before either reads stock.
    const side = new pg.Client({ connectionString: OWNER_URL })
    await side.connect()
    let pays: Promise<Awaited<ReturnType<typeof call>>[]> | undefined
    try {
      await side.query('begin')
      await side.query('select 1 from products where id = $1 for update', [w.omega3])
      pays = Promise.all([
        call(`/api/orders/${a}/payments`, { method: 'POST', cookie: anaCookie, key: newKey() }),
        call(`/api/orders/${b}/payments`, { method: 'POST', cookie: benCookie, key: newKey() }),
      ])
      let waiting = 0
      for (let i = 0; i < 200 && waiting < 2; i++) {
        waiting = (await side.query("select count(distinct pid)::int as n from pg_locks where not granted and locktype in ('tuple', 'transactionid')")).rows[0].n
        if (waiting < 2) await new Promise((r) => setTimeout(r, 50))
      }
      expect(waiting).toBe(2)
    } finally {
      await side.query('rollback')
      await side.end()
    }
    const [ra, rb] = await pays!
    expect([ra.status, rb.status].sort()).toEqual([201, 422])
    const refused = ra.status === 422 ? ra : rb
    expectProblem(refused, 422, 'insufficient-stock')
    expect(refused.body.productIds).toEqual([w.omega3])
    expect(refused.body.unitsAvailable).toEqual([0])
    expect(await stock(w.omega3)).toBe(0)
    expect(await q("select kind, change from stock_movements where product_id = $1 order by id", [w.omega3])).toEqual([{ kind: 'sale', change: -1 }])
    const paid = await q("select count(*)::int as n from payment_attempts where order_id in ($1, $2) and status = 'succeeded'", [a, b])
    expect(paid[0].n).toBe(1)
  })
})

describe('US-5 stock history is append-only (check-security SEC-14)', () => {
  it('M5_AT_044 the app user cannot edit or delete a stock history entry; Omar\'s +12 "delivery received" still shows (FR-030, INV-4, SEC-14)', async () => {
    const w = app.world()
    const omar = await signIn(EMAIL.omar)
    expect((await adjust(omar, w.vitaminD3, { change: 12, reason: 'delivery received', expected_units_in_stock: 10 })).status).toBe(201)
    const codes = await withClient(APP_URL, async (c) => {
      const out: string[] = [`select:${(await c.query('select count(*)::int as n from stock_movements')).rows[0].n}`]
      for (const sql of ['update stock_movements set change = 1', 'delete from stock_movements']) {
        try {
          await c.query(sql)
          out.push('allowed')
        } catch (e) {
          out.push((e as { code?: string }).code ?? 'unknown')
        }
      }
      return out
    })
    expect(codes).toEqual(['select:1', '42501', '42501'])
    expect(await q('select change, reason from stock_movements')).toEqual([{ change: 12, reason: 'delivery received' }])
  })
})
