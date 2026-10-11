// BE-16 PlatformHealthQueries (lld.md §2, SEQ-8): the de-identified order funnel, measures with alert lines, and
// volume per practice for one UTC calendar month. Totals only: never an order id, a patient or a contact (FR-053,
// INV-7). Read only.
import { sql } from 'kysely'
import { useDb } from '../utils/db'
import type { YearMonth } from '../utils/paging'
import type { Viewer } from './session'

export interface Funnel {
  sent: number
  checkout_started: number
  paid: number
  payment_failed: number
  checkout_expired: number
}

export interface Measure {
  name: string
  value: number
  alert_line: number | null
  needs_attention: boolean
}

export interface PracticeVolume {
  practice_name: string
  paid_cents: number
  fees_cents: number
  orders_sent: number
  orders_paid: number
}

export interface PlatformHealth {
  month: YearMonth
  funnel: Funnel
  median_minutes_to_pay: number | null
  out_of_stock_refusals: number
  orders_needing_review: number
  measures: Measure[]
  practices: PracticeVolume[]
}

type Figures = Pick<PlatformHealth, 'funnel' | 'median_minutes_to_pay' | 'out_of_stock_refusals' | 'orders_needing_review'>

const measure = (name: string, value: number, alert_line: number | null = null): Measure => ({
  name,
  value,
  alert_line,
  needs_attention: alert_line !== null && value >= alert_line,
})

/** A-11: only orders needing review has an alert line (1); the rest are set after 30 days of orders. A measure with
 *  no value this month (no rate with nothing sent, no median with nothing paid) is left out. */
export function measures(f: Figures): Measure[] {
  return [
    ...(f.funnel.sent > 0 ? [measure('sent-to-paid rate', (f.funnel.paid / f.funnel.sent) * 100)] : []), // Q-4: a percent
    ...(f.median_minutes_to_pay === null ? [] : [measure('median minutes to pay', f.median_minutes_to_pay)]),
    measure('failed payments', f.funnel.payment_failed),
    measure('expired checkouts', f.funnel.checkout_expired),
    measure('out-of-stock refusals', f.out_of_stock_refusals),
    measure('orders needing review', f.orders_needing_review, 1),
  ]
}

/** EP-33, after BE-4.assertRole(PLATFORM_HEALTH_ROLES) in the route. */
export async function health(_viewer: Viewer, month: YearMonth): Promise<PlatformHealth> {
  const db = useDb()
  const [y, m] = month.split('-').map(Number) as [number, number]
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))

  // lld.md BE-16 Definitions: the month's sent orders by their current state; median over the paid ones (Q-5:
  // percentile_cont, so an even count averages the middle two), in whole minutes.
  const f = await db
    .selectFrom('orders')
    .select([
      sql<string>`count(*)`.as('sent'),
      sql<string>`count(*) filter (where checkout_started_at is not null)`.as('checkout_started'),
      sql<string>`count(*) filter (where status = 'paid')`.as('paid'),
      sql<string>`count(*) filter (where status = 'payment_failed')`.as('payment_failed'),
      sql<string>`count(*) filter (where status = 'sent' and checkout_started_at is not null)`.as('checkout_expired'),
      sql<string | null>`round(percentile_cont(0.5) within group (order by extract(epoch from paid_at - sent_at)) filter (where status = 'paid') / 60)`.as('median'),
    ])
    .where('sent_at', '>=', start)
    .where('sent_at', '<', end)
    .executeTakeFirstOrThrow()

  const review = await db.selectFrom('orders').select(sql<string>`count(*)`.as('n')).where('status', '=', 'needs_review').executeTakeFirstOrThrow()
  const refusals = await db
    .selectFrom('request_stats')
    .select(sql<string>`coalesce(sum(stock_refusals), 0)`.as('n'))
    .where('hour', '>=', start)
    .where('hour', '<', end)
    .executeTakeFirstOrThrow()

  // Every practice, zeros included, by id. Paid and fees from the month's ledger entries; sent and paid counts by
  // each order's own sent_at and paid_at.
  const practices = await db
    .selectFrom('practices as p')
    .select([
      'p.name as practice_name',
      sql<string>`coalesce((select sum(amount_cents) from ledger_entries l where l.practice_id = p.id and l.category = 'patient_payment' and l.occurred_at >= ${start} and l.occurred_at < ${end}), 0)`.as('paid_cents'),
      sql<string>`coalesce((select sum(amount_cents) from ledger_entries l where l.practice_id = p.id and l.category = 'platform_fee' and l.occurred_at >= ${start} and l.occurred_at < ${end}), 0)`.as('fees_cents'),
      sql<string>`(select count(*) from orders o where o.practice_id = p.id and o.sent_at >= ${start} and o.sent_at < ${end})`.as('orders_sent'),
      sql<string>`(select count(*) from orders o where o.practice_id = p.id and o.paid_at >= ${start} and o.paid_at < ${end})`.as('orders_paid'),
    ])
    .orderBy('p.id')
    .execute()

  const figures: Figures = {
    funnel: {
      sent: Number(f.sent),
      checkout_started: Number(f.checkout_started),
      paid: Number(f.paid),
      payment_failed: Number(f.payment_failed),
      checkout_expired: Number(f.checkout_expired),
    },
    median_minutes_to_pay: f.median === null ? null : Number(f.median),
    out_of_stock_refusals: Number(refusals.n),
    orders_needing_review: Number(review.n),
  }
  return {
    month,
    ...figures,
    measures: measures(figures),
    practices: practices.map((p) => ({
      practice_name: p.practice_name,
      paid_cents: Number(p.paid_cents),
      fees_cents: Number(p.fees_cents),
      orders_sent: Number(p.orders_sent),
      orders_paid: Number(p.orders_paid),
    })),
  }
}
