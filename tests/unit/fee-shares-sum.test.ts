// M7-J05 LINV-1: ct_order_lines_fee_shares_sum refuses, at commit, a paid order whose line fee shares do not add up to
// its platform fee. Runs against the throwaway supplements_test database (make db-test-up), via the acceptance helpers.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { lockDatabase, OWNER_URL, rebuildSchema, unlockDatabase, withClient } from '../acceptance/support/db'

// Pays a fresh two-line order with a $0.45 platform fee in one transaction; shares are written before the order is paid
// (the pay path's order: lines are frozen once the order is paid).
async function payWithShares(shares: [number, number]): Promise<{ order: number; error: Error | null }> {
  return withClient(OWNER_URL, async (c) => {
    await c.query('begin')
    const pr = (await c.query("insert into practices (name) values ('Unit Test Practice') returning id")).rows[0].id
    const user = async (role: string) =>
      (
        await c.query(
          "insert into users (email, password_hash, display_name, role, practice_id) values ($1, 'x', 'Unit Test', $2, $3) returning id",
          [`${role}.${Date.now()}.${Math.random()}@example.test`, role, pr],
        )
      ).rows[0].id
    const provider = await user('provider')
    const patient = await user('patient')
    const product = async () =>
      (
        await c.query(
          "insert into products (sku, name, unit_cost_cents) values ($1, 'Unit Test Product', 1000) returning id",
          [`SKU-${Date.now()}-${Math.random()}`],
        )
      ).rows[0].id
    const order = (
      await c.query('insert into orders (practice_id, provider_id, patient_id) values ($1, $2, $3) returning id', [
        pr,
        provider,
        patient,
      ])
    ).rows[0].id
    for (const share of shares)
      await c.query(
        "insert into order_lines (order_id, product_id, product_name, quantity, sent_unit_price_cents, paid_unit_price_cents, unit_cost_cents_at_payment, fee_share_cents) values ($1, $2, 'Unit Test Product', 1, 3000, 3000, 1000, $3)",
        [order, await product(), share],
      )
    await c.query(
      "update orders set status = 'paid', paid_at = now(), amount_paid_cents = 6000, item_cost_cents = 2000, provider_payout_cents = 3955, platform_fee_cents = 45 where id = $1",
      [order],
    )
    try {
      await c.query('commit')
      return { order, error: null }
    } catch (e) {
      return { order, error: e as Error }
    }
  })
}

describe('LINV-1 ct_order_lines_fee_shares_sum', () => {
  beforeAll(async () => {
    await lockDatabase()
    await rebuildSchema()
  }, 120_000)
  afterAll(unlockDatabase)

  it('commits a paid order whose shares sum to its platform fee', async () => {
    const { order, error } = await payWithShares([23, 22])
    expect(error).toBeNull()
    const rows = await withClient(OWNER_URL, (c) => c.query('select status from orders where id = $1', [order]))
    expect(rows.rows[0].status).toBe('paid')
  })

  it('refuses at commit a paid order whose shares are one cent off, naming the order', async () => {
    const { order, error } = await payWithShares([23, 21])
    expect(error).not.toBeNull()
    expect((error as Error & { code?: string }).code).toBe('23514')
    expect(error!.message).toBe(`fee shares of order ${order} do not add up to its platform fee`)
    const rows = await withClient(OWNER_URL, (c) => c.query('select count(*)::int as n from orders where id = $1', [order]))
    expect(rows.rows[0].n).toBe(0)
  })

  it('refuses at commit a paid order with a line that has no fee share', async () => {
    const { error } = await payWithShares([45, null as unknown as number])
    expect(error?.message).toMatch(/^fee shares of order \d+ do not add up to its platform fee$/)
  })
})
