// BE-14 OpsOrderQueries (lld.md §2, SEQ-3): operations staff see orders and breakdowns by order number only. No
// query here selects a patient column or joins the patient's user row (FR-050, NFR-012).
import { z } from 'zod'
import { useDb } from '../utils/db'
import { ProblemError, validationProblem } from '../utils/problem'
import { assertRole, ORDER_REVIEWER_ROLES } from './access-policy'
import type { Viewer } from './session'

export interface OpsOrderFilter {
  status: 'paid' | 'needs_review'
  number?: bigint
  cursor?: string
  limit: number
}

export interface OpsOrderSummary {
  order_id: number
  practice_name: string
  provider_display_name: string
  amount_paid_cents: number
  status: string
  paid_at: string | null
}

export interface OpsOrderPage {
  data: OpsOrderSummary[]
  needs_review_count: number
  next_cursor: string | null
}

export interface BreakdownLine {
  name: string
  quantity: number
  unit_price_cents: number
  unit_cost_cents: number
  line_cost_cents: number
  fee_share_cents: number
}

export interface OrderBreakdown {
  order_id: number
  practice_name: string
  provider_display_name: string
  paid_at: string
  amount_paid_cents: number
  item_cost_cents: number
  provider_payout_cents: number
  platform_fee_cents: number
  adds_up: boolean
  lines: BreakdownLine[]
}

// ponytail: the cursor is the last order number only, since the list is "by number, newest first" (SEQ-3 step 1);
// add the time to it if the list ever sorts by paid_at.
export const encodeCursor = (lastId: bigint): string => Buffer.from(`o:${lastId}`).toString('base64url')

export function decodeCursor(cursor: string): bigint | null {
  const m = /^o:(\d{1,18})$/.exec(Buffer.from(cursor, 'base64url').toString())
  return m ? BigInt(m[1]!) : null
}

const FilterQuery = z.object({
  status: z.enum(['paid', 'needs_review']).default('paid'),
  number: z.string().regex(/^\d{1,18}$/, 'Order numbers are digits only, like 1042.').optional(),
  cursor: z.string().refine((c) => decodeCursor(c) !== null, 'Not a cursor from this list.').optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.int().min(1).max(100)).default(25),
})

/** EP-25's query string, or 422 /problems/validation. */
export function parseOpsOrderFilter(query: Record<string, unknown>): OpsOrderFilter {
  const parsed = FilterQuery.safeParse(query)
  if (!parsed.success) throw validationProblem(parsed.error)
  const { status, number, cursor, limit } = parsed.data
  return { status, limit, ...(number === undefined ? {} : { number: BigInt(number) }), ...(cursor === undefined ? {} : { cursor }) }
}

/** EP-25: paid orders (or the review list) by number, newest first, plus the review count. */
export async function listOrders(viewer: Viewer, filter: OpsOrderFilter): Promise<OpsOrderPage> {
  assertRole(viewer, ORDER_REVIEWER_ROLES)
  const db = useDb()
  let q = db
    .selectFrom('orders')
    .innerJoin('practices', 'practices.id', 'orders.practice_id')
    .innerJoin('users as provider', 'provider.id', 'orders.provider_id')
    .select([
      'orders.id',
      'orders.status',
      'orders.paid_at',
      'orders.amount_paid_cents',
      'practices.name as practice_name',
      'provider.display_name as provider_display_name',
    ])
    .where('orders.status', '=', filter.status)
  if (filter.number !== undefined) q = q.where('orders.id', '=', filter.number.toString())
  if (filter.cursor !== undefined) q = q.where('orders.id', '<', decodeCursor(filter.cursor)!.toString())
  const rows = await q.orderBy('orders.id', 'desc').limit(filter.limit + 1).execute()
  const page = rows.slice(0, filter.limit)

  const review = await db
    .selectFrom('orders')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('status', '=', 'needs_review')
    .executeTakeFirstOrThrow()

  return {
    data: page.map((r) => ({
      order_id: Number(r.id),
      practice_name: r.practice_name,
      provider_display_name: r.provider_display_name,
      amount_paid_cents: r.amount_paid_cents ?? 0,
      status: r.status,
      paid_at: r.paid_at ? r.paid_at.toISOString() : null,
    })),
    needs_review_count: Number(review.n),
    next_cursor: rows.length > filter.limit ? encodeCursor(BigInt(page[page.length - 1]!.id)) : null,
  }
}

interface PaidOrderRow {
  id: string
  practice_name: string
  provider_display_name: string
  paid_at: Date
  amount_paid_cents: number
  item_cost_cents: number
  provider_payout_cents: number
  platform_fee_cents: number
}

interface PaidLineRow {
  product_name: string
  quantity: number
  paid_unit_price_cents: number
  unit_cost_cents_at_payment: number
  fee_share_cents: number
}

/** The breakdown from the order's paid snapshot: each line's cost is the cost when it was paid (FR-036). */
export function toBreakdown(o: PaidOrderRow, lines: PaidLineRow[]): OrderBreakdown {
  return {
    order_id: Number(o.id),
    practice_name: o.practice_name,
    provider_display_name: o.provider_display_name,
    paid_at: o.paid_at.toISOString(),
    amount_paid_cents: o.amount_paid_cents,
    item_cost_cents: o.item_cost_cents,
    provider_payout_cents: o.provider_payout_cents,
    platform_fee_cents: o.platform_fee_cents,
    adds_up: o.amount_paid_cents === o.item_cost_cents + o.provider_payout_cents + o.platform_fee_cents,
    lines: lines.map((l) => ({
      name: l.product_name,
      quantity: l.quantity,
      unit_price_cents: l.paid_unit_price_cents,
      unit_cost_cents: l.unit_cost_cents_at_payment,
      line_cost_cents: l.unit_cost_cents_at_payment * l.quantity,
      fee_share_cents: l.fee_share_cents,
    })),
  }
}

/** EP-26: where every cent of one paid order went. An unknown or unpaid order is not-found. */
export async function getBreakdown(viewer: Viewer, orderId: bigint): Promise<OrderBreakdown> {
  assertRole(viewer, ORDER_REVIEWER_ROLES)
  const db = useDb()
  const o = await db
    .selectFrom('orders')
    .innerJoin('practices', 'practices.id', 'orders.practice_id')
    .innerJoin('users as provider', 'provider.id', 'orders.provider_id')
    .select([
      'orders.id',
      'orders.paid_at',
      'orders.amount_paid_cents',
      'orders.item_cost_cents',
      'orders.provider_payout_cents',
      'orders.platform_fee_cents',
      'practices.name as practice_name',
      'provider.display_name as provider_display_name',
    ])
    .where('orders.id', '=', orderId.toString())
    .where('orders.status', '=', 'paid')
    .executeTakeFirst()
  // ponytail: needs_review orders (no recorded split) are not shown here; the review list's breakdown is M6.
  if (!o || !o.paid_at || o.amount_paid_cents === null || o.item_cost_cents === null || o.provider_payout_cents === null || o.platform_fee_cents === null) {
    throw new ProblemError('not-found')
  }
  const lines = await db
    .selectFrom('order_lines')
    .select(['product_name', 'quantity', 'paid_unit_price_cents', 'unit_cost_cents_at_payment', 'fee_share_cents'])
    .where('order_id', '=', o.id)
    .orderBy('id')
    .execute()
  return toBreakdown(
    { ...o, paid_at: o.paid_at, amount_paid_cents: o.amount_paid_cents, item_cost_cents: o.item_cost_cents, provider_payout_cents: o.provider_payout_cents, platform_fee_cents: o.platform_fee_cents },
    lines.map((l) => ({
      product_name: l.product_name,
      quantity: l.quantity,
      paid_unit_price_cents: l.paid_unit_price_cents ?? 0,
      unit_cost_cents_at_payment: l.unit_cost_cents_at_payment ?? 0,
      fee_share_cents: l.fee_share_cents ?? 0,
    })),
  )
}
