// BE-9 OrderService (lld.md §2, SEQ-1, SEQ-2, SM-1): send an order and start its checkout. Later tasks add show and
// cancel here.
import { sql } from 'kysely'
import { useDb } from '../utils/db'
import { ProblemError } from '../utils/problem'
import { assertCanActOnPatient, assertIsOrderPatient } from './access-policy'
import { currentPrices, loadPatient } from './catalog'
import { sendOrderNotice } from './messaging'
import { belowFloorProductIds, lowestAllowedPriceCents, payoutCents, platformFeeCents } from './money'
import type { Viewer } from './session'

export interface SendOrderInput {
  patientId: bigint
  lines: { productId: bigint; quantity: number }[]
}

export interface OrderLine {
  product_id: number
  name: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}

export interface Order {
  order_id: number
  status: string
  lines: OrderLine[]
  total_cents: number
  platform_fee_cents: number
  provider_payout_cents: number
  sent_at: string
}

export async function sendOrder(viewer: Viewer, input: SendOrderInput): Promise<Order> {
  const patient = await loadPatient(input.patientId)
  assertCanActOnPatient(viewer, patient)
  const practiceId = patient.practiceId!

  // One line per product, quantities added (LINV-4).
  const quantities = new Map<bigint, number>()
  for (const l of input.lines) quantities.set(l.productId, (quantities.get(l.productId) ?? 0) + l.quantity)
  if (quantities.size === 0) throw new ProblemError('validation', { errors: [{ pointer: '#/lines', detail: 'This order has no items. Add at least one supplement.' }] })
  const productIds = [...quantities.keys()]

  const db = useDb()
  const products = await db
    .selectFrom('products')
    .select(['id', 'name', 'unit_cost_cents', 'units_in_stock'])
    .where('id', 'in', productIds.map(String))
    .execute()
  const byId = new Map(products.map((p) => [BigInt(p.id), p]))
  const unknown = productIds.filter((id) => !byId.has(id))
  if (unknown.length > 0) {
    throw new ProblemError('validation', {
      errors: unknown.map((id) => ({ pointer: '#/lines', detail: `Product ${id} does not exist.` })),
    })
  }
  const short = productIds.filter((id) => quantities.get(id)! > byId.get(id)!.units_in_stock)
  if (short.length > 0) {
    throw new ProblemError('insufficient-stock', {
      productIds: short.map(Number),
      unitsAvailable: short.map((id) => byId.get(id)!.units_in_stock),
    })
  }
  const prices = await currentPrices(practiceId, productIds)

  const lines = productIds.map((id) => {
    const p = byId.get(id)!
    const quantity = quantities.get(id)!
    const unit = prices.get(id)!
    return { id, name: p.name, quantity, unit, total: unit * quantity, cost: p.unit_cost_cents * quantity }
  })
  // FR-004: no order whose payout after the fee would be below $0.00; no transaction is opened (SEQ-1).
  const belowFloor = belowFloorProductIds(lines.map((l) => ({ id: l.id, unitPriceCents: l.unit, unitCostCents: byId.get(l.id)!.unit_cost_cents, quantity: l.quantity })))
  if (belowFloor.length > 0) {
    throw new ProblemError('below-price-floor', {
      productIds: belowFloor.map(Number),
      lowestAllowedPriceCents: lowestAllowedPriceCents(byId.get(belowFloor[0]!)!.unit_cost_cents),
    })
  }
  const total = lines.reduce((s, l) => s + l.total, 0)
  const cost = lines.reduce((s, l) => s + l.cost, 0)
  const fee = platformFeeCents(total)

  const order = await db.transaction().execute(async (trx) => {
    const o = await trx
      .insertInto('orders')
      .values({ practice_id: practiceId, provider_id: viewer.userId, patient_id: input.patientId, status: 'sent' })
      .returning(['id', 'status', 'sent_at'])
      .executeTakeFirstOrThrow()
    await trx
      .insertInto('order_lines')
      .values(
        lines.map((l) => ({
          order_id: o.id,
          product_id: l.id,
          product_name: l.name,
          quantity: l.quantity,
          sent_unit_price_cents: l.unit,
        })),
      )
      .execute()
    await sendOrderNotice({ orderId: BigInt(o.id), patientId: input.patientId, practiceId }, trx)
    return o
  })

  return {
    order_id: Number(order.id),
    status: order.status,
    lines: lines.map((l) => ({
      product_id: Number(l.id),
      name: l.name,
      quantity: l.quantity,
      unit_price_cents: l.unit,
      line_total_cents: l.total,
    })),
    total_cents: total,
    platform_fee_cents: fee,
    provider_payout_cents: payoutCents(total, cost, fee),
    sent_at: order.sent_at.toISOString(),
  }
}

export interface Checkout {
  order_id: number
  total_cents: number
  prices_held_until: string
}

/** SM-1: sent or payment_failed (or a hold that has ended) -> in_checkout, holding today's prices for 30 minutes
 *  (FR-023, FR-037, INV-8). Pressed again while the hold is live, it returns the same hold. */
export async function startCheckout(viewer: Viewer, orderId: bigint): Promise<Checkout> {
  return useDb()
    .transaction()
    .execute(async (trx) => {
      const o = await trx
        .selectFrom('orders')
        .select(['id', 'patient_id', 'practice_id', 'status', 'prices_held_until', sql<boolean>`prices_held_until > now()`.as('hold_live')])
        .where('id', '=', orderId.toString())
        .forUpdate()
        .executeTakeFirst()
      if (!o) throw new ProblemError('not-found')
      assertIsOrderPatient(viewer, { patientId: BigInt(o.patient_id), practiceId: BigInt(o.practice_id) })
      const lines = await trx
        .selectFrom('order_lines')
        .select(['id', 'product_id', 'quantity', 'held_unit_price_cents'])
        .where('order_id', '=', o.id)
        .execute()

      if (o.status === 'in_checkout' && o.hold_live) {
        return {
          order_id: Number(o.id),
          total_cents: lines.reduce((s, l) => s + l.held_unit_price_cents! * l.quantity, 0),
          prices_held_until: o.prices_held_until!.toISOString(),
        }
      }
      if (!['sent', 'payment_failed', 'in_checkout'].includes(o.status)) throw new ProblemError('invalid-transition')

      const prices = await currentPrices(BigInt(o.practice_id), lines.map((l) => BigInt(l.product_id)))
      let total = 0
      for (const l of lines) {
        const held = prices.get(BigInt(l.product_id))!
        total += held * l.quantity
        await trx.updateTable('order_lines').set({ held_unit_price_cents: held }).where('id', '=', l.id).execute()
      }
      const held = await trx
        .updateTable('orders')
        .set({ status: 'in_checkout', checkout_started_at: sql`now()`, prices_held_until: sql`now() + interval '30 minutes'` })
        .where('id', '=', o.id)
        .returning('prices_held_until')
        .executeTakeFirstOrThrow()
      return { order_id: Number(o.id), total_cents: total, prices_held_until: held.prices_held_until!.toISOString() }
    })
}
