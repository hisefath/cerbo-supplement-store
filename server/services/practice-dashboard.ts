// BE-15 PracticeDashboardQueries (lld.md §2, SEQ-5): one practice's attention items, orders, sales and stock for a
// month. A month is a UTC calendar month (acceptance.md Q-3). Read only; every query is scoped to the viewer's practice.
import { sql } from 'kysely'
import { z } from 'zod'
import { useDb } from '../utils/db'
import { ProblemError, validationProblem } from '../utils/problem'
import { assertRole } from './access-policy'
import { currentPrices } from './catalog'
import { orderViewLines, type OrderLineRow } from './orders'
import type { Viewer } from './session'

export interface AttentionItem {
  kind: 'awaiting_payment' | 'low_stock' | 'out_of_stock'
  label: string
  order_id: number | null
  product_id: number | null
}

export interface ProductSales {
  product_id: number
  name: string
  units_sold: number
  patients_paid_cents: number
  provider_payout_cents: number
  units_in_stock: number
}

export interface PracticeDashboard {
  month: string
  attention: AttentionItem[]
  sales: ProductSales[]
}

export interface PracticeOrderSummary {
  order_id: number
  patient_display_name: string
  total_cents: number
  status: string
  sent_at: string
  paid_at: string | null
}

export interface PracticeOrderPage {
  data: PracticeOrderSummary[]
  next_cursor: string | null
}

export interface OrdersQuery {
  month: string
  cursor?: string
  limit: number
}

const DAY_MS = 86_400_000
const AWAITING_AFTER_MS = 3 * DAY_MS // FR-046: more than 3 days
const LOW_STOCK_AT = 3 // FR-047: 3 or fewer
const UNPAID = ['sent', 'in_checkout', 'payment_failed']

const MonthText = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Pick a month like 2026-10.')

/** The month asked for, or the current UTC month when none is given; else 422 /problems/validation. */
export function parseMonth(raw: unknown, today: Date): string {
  if (raw === undefined || raw === '') return today.toISOString().slice(0, 7)
  const parsed = MonthText.safeParse(raw)
  if (!parsed.success) throw validationProblem(parsed.error)
  return parsed.data
}

/** [start, end) of a YYYY-MM month in UTC. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) }
}

export function awaitingPaymentItem(order: { id: string; sent_at: Date }, at: Date): AttentionItem | null {
  const age = at.getTime() - order.sent_at.getTime()
  if (age <= AWAITING_AFTER_MS) return null
  const days = Math.floor(age / DAY_MS) // elapsed 24-hour periods (EDGE-040, AE-043)
  return { kind: 'awaiting_payment', label: `Awaiting payment for ${days} days`, order_id: Number(order.id), product_id: null }
}

export function stockItem(p: { id: string; name: string; units_in_stock: number }): AttentionItem | null {
  if (p.units_in_stock > LOW_STOCK_AT) return null
  if (p.units_in_stock <= 0) return { kind: 'out_of_stock', label: `${p.name} · out of stock`, order_id: null, product_id: Number(p.id) }
  return { kind: 'low_stock', label: `Low stock: ${p.units_in_stock} left`, order_id: null, product_id: Number(p.id) }
}

// The cursor carries PostgreSQL's own text of sent_at, so microseconds survive the round trip (a JS Date would cut
// them to milliseconds and skip rows on a tie).
export const encodeCursor = (sentAt: string, id: string): string => Buffer.from(`s:${sentAt}|${id}`).toString('base64url')

export function decodeCursor(cursor: string): { sentAt: string; id: string } | null {
  const m = /^s:([0-9 :.+-]{10,40})\|(\d{1,18})$/.exec(Buffer.from(cursor, 'base64url').toString())
  return m ? { sentAt: m[1]!, id: m[2]! } : null
}

const OrdersQueryShape = z.object({
  cursor: z.string().refine((c) => decodeCursor(c) !== null, 'Not a cursor from this list.').optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.int().min(1).max(100)).default(25),
})

/** EP-30's query string (month, cursor, limit), or 422 /problems/validation. */
export function parseOrdersQuery(query: Record<string, unknown>, today: Date): OrdersQuery {
  const month = parseMonth(query.month, today)
  const parsed = OrdersQueryShape.safeParse(query)
  if (!parsed.success) throw validationProblem(parsed.error)
  return { month, limit: parsed.data.limit, ...(parsed.data.cursor === undefined ? {} : { cursor: parsed.data.cursor }) }
}

function practiceOf(viewer: Viewer | null): string {
  assertRole(viewer, ['provider'])
  if (viewer.practiceId === null) throw new ProblemError('forbidden')
  return viewer.practiceId.toString()
}

/** EP-29: attention items, then per-product sales of the month's paid orders and today's stock. */
export async function dashboard(viewer: Viewer, month: string): Promise<PracticeDashboard> {
  const practiceId = practiceOf(viewer)
  const { start, end } = monthRange(month)
  const db = useDb()

  // Age is measured on the database clock, the one that stamped sent_at (default now()): mixing in the app's clock
  // lets a few milliseconds of skew turn "4 days" into "3 days".
  const unpaid = await db
    .selectFrom('orders')
    .select(['id', 'sent_at', sql<Date>`now()`.as('db_now')])
    .where('practice_id', '=', practiceId)
    .where('status', 'in', UNPAID)
    .where(sql<boolean>`sent_at < now() - interval '3 days'`)
    .orderBy('sent_at')
    .orderBy('id')
    .execute()

  // SEQ-5 step 2: payout per line = paid price × quantity − unit cost × quantity − the line's fee share (FR-028, FR-069).
  const sales = await db
    .selectFrom('products')
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('order_lines')
          .innerJoin('orders', 'orders.id', 'order_lines.order_id')
          .select([
            'order_lines.product_id',
            sql<string>`sum(order_lines.quantity)`.as('units'),
            sql<string>`sum(order_lines.paid_unit_price_cents * order_lines.quantity)`.as('paid'),
            sql<string>`sum((order_lines.paid_unit_price_cents - order_lines.unit_cost_cents_at_payment) * order_lines.quantity - order_lines.fee_share_cents)`.as(
              'payout',
            ),
          ])
          .where('orders.practice_id', '=', practiceId)
          .where('orders.status', '=', 'paid')
          .where('orders.paid_at', '>=', start)
          .where('orders.paid_at', '<', end)
          .groupBy('order_lines.product_id')
          .as('s'),
      (join) => join.onRef('s.product_id', '=', 'products.id'),
    )
    .select(['products.id', 'products.name', 'products.units_in_stock', 's.units', 's.paid', 's.payout'])
    .orderBy('products.id')
    .execute()

  const attention = [
    ...unpaid.map((o) => awaitingPaymentItem(o, o.db_now)),
    ...sales.map((p) => stockItem(p)),
  ].filter((a): a is AttentionItem => a !== null)

  return {
    month,
    attention,
    sales: sales.map((p) => ({
      product_id: Number(p.id),
      name: p.name,
      units_sold: Number(p.units ?? 0),
      patients_paid_cents: Number(p.paid ?? 0),
      provider_payout_cents: Number(p.payout ?? 0),
      units_in_stock: p.units_in_stock,
    })),
  }
}

/** EP-30 total = what the patient sees on EP-21: paid -> the amount paid; otherwise EP-21's line prices (a live hold
 *  -> held prices, else today's practice prices). */
export function orderTotalCents(
  o: { status: string; hold_live: boolean; amount_paid_cents: number | null },
  rows: OrderLineRow[],
  current: Map<bigint, number>,
): number {
  if (o.status === 'paid' && o.amount_paid_cents !== null) return o.amount_paid_cents
  return orderViewLines(o.status, o.hold_live, rows, current).lines.reduce((s, l) => s + l.line_total_cents, 0)
}

/** EP-30: the practice's orders sent in the month, newest first (sent_at DESC, id DESC), keyset-paged. */
export async function orders(viewer: Viewer, query: OrdersQuery): Promise<PracticeOrderPage> {
  const practiceId = practiceOf(viewer)
  const { start, end } = monthRange(query.month)
  let q = useDb()
    .selectFrom('orders')
    .innerJoin('users as patient', 'patient.id', 'orders.patient_id')
    .select([
      'orders.id',
      'orders.status',
      'orders.sent_at',
      'orders.paid_at',
      'patient.display_name as patient_display_name',
      sql<string>`orders.sent_at::text`.as('sent_at_text'),
      'orders.amount_paid_cents',
      sql<boolean>`coalesce(orders.prices_held_until > now(), false)`.as('hold_live'),
    ])
    .where('orders.practice_id', '=', practiceId)
    .where('orders.sent_at', '>=', start)
    .where('orders.sent_at', '<', end)
  if (query.cursor !== undefined) {
    const c = decodeCursor(query.cursor)!
    q = q.where(sql<boolean>`(orders.sent_at, orders.id) < (${c.sentAt}::timestamptz, ${c.id}::bigint)`)
  }
  const rows = await q.orderBy('orders.sent_at', 'desc').orderBy('orders.id', 'desc').limit(query.limit + 1).execute()
  const page = rows.slice(0, query.limit)
  const last = page[page.length - 1]
  const lines =
    page.length === 0
      ? []
      : await useDb()
          .selectFrom('order_lines')
          .select(['order_id', 'product_id', 'product_name', 'quantity', 'sent_unit_price_cents', 'held_unit_price_cents', 'paid_unit_price_cents'])
          .where('order_id', 'in', page.map((r) => r.id))
          .orderBy('id')
          .execute()
  const current = await currentPrices(BigInt(practiceId), [...new Set(lines.map((l) => l.product_id))].map(BigInt))
  return {
    data: page.map((r) => ({
      order_id: Number(r.id),
      patient_display_name: r.patient_display_name,
      total_cents: orderTotalCents(
        { status: r.status, hold_live: r.hold_live, amount_paid_cents: r.amount_paid_cents === null ? null : Number(r.amount_paid_cents) },
        lines.filter((l) => l.order_id === r.id),
        current,
      ),
      status: r.status,
      sent_at: r.sent_at.toISOString(),
      paid_at: r.paid_at ? r.paid_at.toISOString() : null,
    })),
    next_cursor: rows.length > query.limit && last ? encodeCursor(last.sent_at_text, last.id) : null,
  }
}
