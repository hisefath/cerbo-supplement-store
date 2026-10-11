// BE-17 FinanceReportService (lld.md §2, SEQ-9): a period's financial report and export from ledger entries alone.
// Entries count by occurred_at in UTC. The report and the export each read inside one repeatable-read transaction, so
// totals, payouts, gap orders and order lines all come from the same moment (EDGE-039).
import { sql, type Transaction } from 'kysely'
import { useDb } from '../utils/db'
import type { Database } from '../utils/db-types'
import type { Period } from '../utils/paging'
import { assertRole, FINANCE_ROLES } from './access-policy'
import type { Viewer } from './session'

type Category = 'patient_payment' | 'item_cost' | 'provider_payout' | 'platform_fee'
export type Totals = Record<Category, number>
export type OrderLine = Totals & { order_id: number }

export interface ProviderPayout {
  provider_display_name: string
  practice_name: string
  payout_cents: number
}

export interface FinancialReport {
  from: string
  to: string
  patient_payments_cents: number
  item_cost_cents: number
  provider_payouts_cents: number
  platform_fees_cents: number
  balanced: boolean
  gap_cents: number
  gap_order_ids: number[]
  gross_revenue_cents: number
  net_revenue_cents: number
  payouts_by_provider: ProviderPayout[]
}

const CATEGORIES: Category[] = ['patient_payment', 'item_cost', 'provider_payout', 'platform_fee']
const DAY_MS = 86_400_000
const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** Pure: the equation (payments = cost + payouts + fees), gross (all payments) and net (fees only). */
export function buildReport(period: Period, t: Totals, payouts: ProviderPayout[], gapOrderIds: number[]): FinancialReport {
  const gap = t.patient_payment - t.item_cost - t.provider_payout - t.platform_fee
  return {
    from: ymd(period.from),
    to: ymd(new Date(period.toExclusive.getTime() - DAY_MS)),
    patient_payments_cents: t.patient_payment,
    item_cost_cents: t.item_cost,
    provider_payouts_cents: t.provider_payout,
    platform_fees_cents: t.platform_fee,
    balanced: gap === 0, // FR-061: the totals, to the cent
    gap_cents: gap, // > 0: the parts are short of the payments; < 0: over
    gap_order_ids: gapOrderIds,
    gross_revenue_cents: t.patient_payment,
    net_revenue_cents: t.platform_fee,
    payouts_by_provider: payouts,
  }
}

const HEADER = 'order,patient_payment_cents,item_cost_cents,provider_payout_cents,platform_fee_cents'
const row = (first: string | number, t: Totals) => `${[first, ...CATEGORIES.map((c) => t[c])].join(',')}\r\n`

/** Pure: Q-6's CSV. A header, the four totals, then one line per paid order by number; whole cents as integers.
 *  Every cell is a number or the word "total"/a column name, so none can start with "=" (no formula injection). */
export function csvLines(t: Totals, orders: OrderLine[]): string[] {
  return [`${HEADER}\r\n`, row('total', t), ...[...orders].sort((a, b) => a.order_id - b.order_id).map((o) => row(o.order_id, o))]
}

type Tx = Transaction<Database>
const inPeriod = (p: Period) => sql<boolean>`"occurred_at" >= ${p.from} and "occurred_at" < ${p.toExclusive}`
const centsOf = (category: Category) => sql<string>`coalesce(sum(case when "category" = ${category} then "amount_cents" else 0 end), 0)`

async function totals(tx: Tx, p: Period): Promise<Totals> {
  const rows = await tx
    .selectFrom('ledger_entries')
    .select(['category', sql<string>`sum("amount_cents")`.as('cents')])
    .where(inPeriod(p))
    .groupBy('category')
    .execute()
  const t: Totals = { patient_payment: 0, item_cost: 0, provider_payout: 0, platform_fee: 0 }
  for (const r of rows) t[r.category] = Number(r.cents)
  return t
}

async function payoutsByProvider(tx: Tx, p: Period): Promise<ProviderPayout[]> {
  const rows = await tx
    .selectFrom('ledger_entries')
    .innerJoin('users', 'users.id', 'ledger_entries.provider_id')
    .innerJoin('practices', 'practices.id', 'ledger_entries.practice_id')
    .select([
      'users.display_name as provider_display_name',
      'practices.name as practice_name',
      sql<string>`sum("ledger_entries"."amount_cents")`.as('payout_cents'),
    ])
    .where('ledger_entries.category', '=', 'provider_payout')
    .where(sql<boolean>`"ledger_entries"."occurred_at" >= ${p.from} and "ledger_entries"."occurred_at" < ${p.toExclusive}`)
    .groupBy(['users.id', 'users.display_name', 'practices.id', 'practices.name'])
    .orderBy('users.display_name')
    .orderBy('users.id')
    .execute()
  return rows.map((r) => ({ provider_display_name: r.provider_display_name, practice_name: r.practice_name, payout_cents: Number(r.payout_cents) }))
}

/** FR-065: paid orders whose own four entries don't satisfy payment = cost + payout + fee (only a direct write can). */
async function gapOrderIds(tx: Tx, p: Period): Promise<number[]> {
  const rows = await tx
    .selectFrom('ledger_entries')
    .select('order_id')
    .where(inPeriod(p))
    .groupBy('order_id')
    .having(sql<boolean>`sum(case when "category" = 'patient_payment' then "amount_cents" else -"amount_cents" end) <> 0`)
    .orderBy('order_id')
    .execute()
  return rows.map((r) => Number(r.order_id))
}

async function orderLines(tx: Tx, p: Period): Promise<OrderLine[]> {
  const rows = await tx
    .selectFrom('ledger_entries')
    .select(['order_id', ...CATEGORIES.map((c) => centsOf(c).as(c))])
    .where(inPeriod(p))
    .groupBy('order_id')
    .orderBy('order_id')
    .execute()
  return rows.map((r) => {
    const o = r as unknown as Record<string, string>
    return { order_id: Number(o.order_id), ...(Object.fromEntries(CATEGORIES.map((c) => [c, Number(o[c])])) as Totals) }
  })
}

const readOnce = <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => useDb().transaction().setIsolationLevel('repeatable read').execute(fn)

/** EP-34: totals, the balance, gross and net, and every provider's payout for the period (FR-060 to FR-065). */
export async function report(viewer: Viewer | null, period: Period): Promise<FinancialReport> {
  assertRole(viewer, FINANCE_ROLES)
  return readOnce(async (tx) => buildReport(period, await totals(tx, period), await payoutsByProvider(tx, period), await gapOrderIds(tx, period)))
}

/** EP-35: the CSV lines (FR-063). Read whole inside one transaction, then yielded.
 *  ponytail: buffers the period's order lines (~10,000 rows at the S11 edge); stream with a cursor if periods grow. */
export async function* exportCsv(viewer: Viewer | null, period: Period): AsyncIterable<string> {
  assertRole(viewer, FINANCE_ROLES)
  const lines = await readOnce(async (tx) => csvLines(await totals(tx, period), await orderLines(tx, period)))
  yield* lines
}
