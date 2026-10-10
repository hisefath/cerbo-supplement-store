// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-3 See where every cent went, and the database guards behind it (INV-1, INV-4, LINV-2; answers Q-2 and Q-3).
import { describe, expect, it } from 'vitest'
import pg from 'pg'
import { useApp } from '../support/app'
import { APP_URL, OWNER_URL, q, withClient } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

async function paidSixtyDollarOrder(w: ReturnType<typeof app.world>): Promise<number> {
  const chen = await signIn(EMAIL.drChen)
  const sent = await call('/api/orders', {
    method: 'POST',
    cookie: chen,
    key: newKey(),
    body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }] },
  })
  if (sent.status !== 201) throw new Error(`send returned ${sent.status}: ${sent.text.slice(0, 200)}`)
  const ana = await signIn(EMAIL.ana)
  const c = await call(`/api/orders/${sent.body.order_id}/checkout`, { method: 'POST', cookie: ana })
  if (c.status !== 200) throw new Error(`checkout returned ${c.status}`)
  const p = await call(`/api/orders/${sent.body.order_id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
  if (p.status !== 201) throw new Error(`pay returned ${p.status}: ${p.text.slice(0, 200)}`)
  return sent.body.order_id
}

async function sqlError(url: string, sql: string, params: unknown[] = []): Promise<pg.DatabaseError | null> {
  return withClient(url, async (c) => {
    try {
      await c.query(sql, params)
      return null
    } catch (e) {
      return e as pg.DatabaseError
    }
  })
}

describe('US-3 where every cent went', () => {
  it('M4_AT_014 a reviewer sees the $60.00 = $30.00 + $29.55 + $0.45 breakdown with each line (AE-013, FR-014, FR-036)', async () => {
    const w = app.world()
    const id = await paidSixtyDollarOrder(w)
    const omar = await signIn(EMAIL.omar)
    const r = await call(`/api/ops/orders/${id}`, { cookie: omar })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      order_id: id,
      practice_name: 'Willow Creek Wellness',
      provider_display_name: 'Dr. Maya Chen',
      amount_paid_cents: 6000,
      item_cost_cents: 3000,
      provider_payout_cents: 2955,
      platform_fee_cents: 45,
      adds_up: true,
    })
    const lines = r.body.lines.map((l: any) => [l.name, l.quantity, l.unit_price_cents, l.unit_cost_cents, l.line_cost_cents])
    expect(lines).toEqual(
      expect.arrayContaining([
        ['Vitamin D3 2000 IU', 2, 1800, 900, 1800],
        ['Magnesium Glycinate', 1, 2400, 1200, 1200],
      ]),
    )
    const list = await call('/api/ops/orders?status=paid', { cookie: omar })
    expect(list.status).toBe(200)
    expect(list.body.data.map((o: any) => o.order_id)).toEqual([id])
  })

  it('M4_AT_023 operations views and the order breakdown never show the patient\'s name or email (AE-047, FR-050, NFR-012)', async () => {
    const w = app.world()
    const id = await paidSixtyDollarOrder(w)
    const omar = await signIn(EMAIL.omar)
    const breakdown = await call(`/api/ops/orders/${id}`, { cookie: omar })
    const list = await call('/api/ops/orders?status=paid', { cookie: omar })
    expect(breakdown.status).toBe(200)
    expect(list.status).toBe(200)
    expect(breakdown.body.order_id).toBe(id)
    for (const r of [breakdown, list]) {
      expect(r.text).not.toContain('Ana Ruiz')
      expect(r.text).not.toContain('ana.ruiz@example.test')
    }
  })

  it('M4_AT_024 a later change to a product\'s cost does not change a paid order\'s recorded cost (AE-032, FR-036)', async () => {
    const w = app.world()
    const id = await paidSixtyDollarOrder(w)
    await q('update products set unit_cost_cents = 1000 where id = $1', [w.vitaminD3])
    const omar = await signIn(EMAIL.omar)
    const r = await call(`/api/ops/orders/${id}`, { cookie: omar })
    expect(r.status).toBe(200)
    const d3 = r.body.lines.find((l: any) => l.name === 'Vitamin D3 2000 IU')
    expect(d3.unit_cost_cents).toBe(900)
    expect(r.body.item_cost_cents).toBe(3000)
  })

  it('M4_AT_025 the SRE and the data analyst cannot open an order breakdown (FR-050, INV-7)', async () => {
    const w = app.world()
    const id = await paidSixtyDollarOrder(w)
    const omar = await signIn(EMAIL.omar)
    expect((await call(`/api/ops/orders/${id}`, { cookie: omar })).status).toBe(200)
    for (const email of [EMAIL.sam, EMAIL.dana, EMAIL.ana]) {
      const r = await call(`/api/ops/orders/${id}`, { cookie: await signIn(email) })
      expectProblem(r, 403, 'forbidden')
      expect(r.text).not.toContain('2955')
    }
  })
})

describe('US-3 the database refuses bad money (Q-2, Q-3)', () => {
  it('M4_AT_026 a paid order\'s fee cannot be changed afterwards (AE-014, FR-015, INV-4: tg_orders_paid_frozen)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const unpaid = await call('/api/orders', {
      method: 'POST',
      cookie: chen,
      key: newKey(),
      body: { patient_id: w.ben, lines: [{ product_id: w.omega3, quantity: 1 }] },
    })
    expect(unpaid.status).toBe(201)
    expect(await sqlError(OWNER_URL, 'update orders set checkout_started_at = now() where id = $1', [unpaid.body.order_id])).toBeNull()
    const id = await paidSixtyDollarOrder(w)
    const err = await sqlError(OWNER_URL, 'update orders set platform_fee_cents = 0, provider_payout_cents = 3000 where id = $1', [id])
    expect(err).not.toBeNull()
    const after = await q('select platform_fee_cents from orders where id = $1', [id])
    expect(after[0].platform_fee_cents).toBe(45)
  })

  it('M4_AT_027 the app\'s database user can read but never change or delete ledger lines (Q-3, INV-4, NFR-014)', async () => {
    const w = app.world()
    const id = await paidSixtyDollarOrder(w)
    const read = await withClient(APP_URL, async (c) => (await c.query('select count(*)::int as n from ledger_entries where order_id = $1', [id])).rows)
    expect(read[0].n).toBe(4)
    const upd = await sqlError(APP_URL, 'update ledger_entries set amount_cents = 0 where order_id = $1', [id])
    expect(upd?.code).toBe('42501')
    const del = await sqlError(APP_URL, 'delete from ledger_entries where order_id = $1', [id])
    expect(del?.code).toBe('42501')
    const delOrder = await sqlError(APP_URL, 'delete from orders where id = $1', [id])
    expect(delOrder?.code).toBe('42501')
    const delLines = await sqlError(APP_URL, 'delete from order_lines where order_id = $1', [id])
    expect(delLines?.code).toBe('42501')
  })

  it('M4_AT_029 a paid order whose parts are one cent short of the amount paid is refused (Q-2, FR-013, INV-1: ck_orders_split_balances)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const a = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }] } })
    const b = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ben, lines: [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }] } })
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    const set = (cost: number) =>
      `update orders set status = 'paid', paid_at = now(), amount_paid_cents = 6000, item_cost_cents = ${cost}, provider_payout_cents = 2955, platform_fee_cents = 45 where id = $1`
    expect(await sqlError(OWNER_URL, set(3000), [a.body.order_id])).toBeNull()
    const err = await sqlError(OWNER_URL, set(2999), [b.body.order_id])
    expect(err?.constraint).toBe('ck_orders_split_balances')
    const still = await q('select status from orders where id = $1', [b.body.order_id])
    expect(still[0].status).toBe('sent')
  })

  it('M4_AT_030 an order\'s four ledger lines must balance when the transaction commits (Q-2, LINV-2: ct_ledger_entries_balance)', async () => {
    const w = app.world()
    const id = await paidSixtyDollarOrder(w)
    const existing = await q('select payment_attempt_id from ledger_entries where order_id = $1 limit 1', [id])
    expect(existing).toHaveLength(1)
    const err = await withClient(OWNER_URL, async (c) => {
      try {
        await c.query('begin')
        await c.query("delete from ledger_entries where order_id = $1 and category = 'platform_fee'", [id])
        await c.query(
          "insert into ledger_entries (order_id, payment_attempt_id, practice_id, provider_id, category, amount_cents, occurred_at) values ($1, $2, $3, $4, 'platform_fee', 44, now())",
          [id, existing[0].payment_attempt_id, w.willowCreek, w.drChen],
        )
        await c.query('commit')
        return null
      } catch (e) {
        await c.query('rollback').catch(() => undefined)
        return e as pg.DatabaseError
      }
    })
    expect(err).not.toBeNull()
    const fee = await q("select amount_cents from ledger_entries where order_id = $1 and category = 'platform_fee'", [id])
    expect(fee.map((r: any) => r.amount_cents)).toEqual([45])
  })
})
