// BE-19 RequestMetrics (lld.md §2, SEQ-12): counts requests, errors, slow responses and stock refusals per hour and
// route group (request_stats), records uptime pings in 5-minute slots (health_pings, D87), and reports system health.
// Writes are best effort: a failed write logs errorFacts and never fails the request (FM-8).
import { sql } from 'kysely'
import { useDb } from '../utils/db'
import type { YearMonth } from '../utils/paging'
import { errorFacts } from '../utils/problem'
import { now } from './clock'
import type { Viewer } from './session'

const SLOT_MS = 300_000
const HOUR_MS = 3_600_000

export interface SystemHealth {
  month: YearMonth
  partial_month: boolean
  availability_percent: number | null
  availability_target_percent: 99.5
  error_rate_percent: number | null
  slow_page_percent: number | null
  slow_page_target_percent: 5
}

// Screen paths S1 to S14 (lld.md §4 EP-1 to EP-14); S15 `/` and anything else is not counted.
const PAGES: [RegExp, string][] = [
  [/^\/patients\/[^/]+\/supplements$/, 'S1'],
  [/^\/orders\/[^/]+$/, 'S2'],
  [/^\/ops\/orders$/, 'S3'],
  [/^\/ops\/orders\/[^/]+$/, 'S4'],
  [/^\/practice\/prices$/, 'S5'],
  [/^\/practice\/dashboard$/, 'S6'],
  [/^\/ops\/stock$/, 'S7'],
  [/^\/sign-in$/, 'S8'],
  [/^\/notices\/[^/]+$/, 'S9'],
  [/^\/ops\/health$/, 'S10'],
  [/^\/ops\/finance$/, 'S11'],
  [/^\/ops\/access$/, 'S12'],
  [/^\/ops\/access-log$/, 'S13'],
  [/^\/ops\/system$/, 'S14'],
]
// ponytail: the first segments server/api/** has today; a new top-level API folder is uncounted until added here.
// A fixed list, so a typed URL can never put an id or a name into route_group (NFR-010).
const API_SEGMENTS = new Set(['notices', 'ops', 'orders', 'patients', 'practice', 'session'])

/** `api.<first segment>` or `page.S1` to `page.S14`; null (not counted) for /healthz, /version, /_nuxt/** and the rest. */
export function routeGroup(path: string): string | null {
  const p = path.split('?')[0]!.replace(/(.)\/+$/, '$1')
  const api = /^\/api\/([^/]+)/.exec(p)
  if (api) return API_SEGMENTS.has(api[1]!) ? `api.${api[1]}` : null
  const page = PAGES.find(([re]) => re.test(p))
  return page ? `page.${page[1]}` : null
}

export async function record(routeGroup: string, status: number, durationMs: number, stockRefusal: boolean): Promise<void> {
  try {
    const hour = new Date(Math.floor(now().getTime() / HOUR_MS) * HOUR_MS)
    const errors = status >= 500 ? 1 : 0
    const slow = durationMs > 2000 ? 1 : 0
    const refusals = stockRefusal ? 1 : 0
    await useDb()
      .insertInto('request_stats')
      .values({ hour, route_group: routeGroup, requests: 1, errors, slow, stock_refusals: refusals })
      .onConflict((oc) =>
        oc.columns(['hour', 'route_group']).doUpdateSet({
          requests: sql`request_stats.requests + 1`,
          errors: sql`request_stats.errors + ${errors}`,
          slow: sql`request_stats.slow + ${slow}`,
          stock_refusals: sql`request_stats.stock_refusals + ${refusals}`,
        }),
      )
      .execute()
  } catch (err) {
    console.warn('request stats write failed', errorFacts(err))
  }
}

export const slotOf = (t: Date): Date => new Date(Math.floor(t.getTime() / SLOT_MS) * SLOT_MS)

export async function recordPing(): Promise<void> {
  try {
    await useDb().insertInto('health_pings').values({ slot: slotOf(now()) }).onConflict((oc) => oc.column('slot').doNothing()).execute()
  } catch (err) {
    console.warn('health ping write failed', errorFacts(err))
  }
}

/** The month's measured slots [from, to): from the later of the month start and the first ping ever, to the earlier
 *  of the month end and the start of the current (unfinished) slot. `slots` is 0 when nothing has elapsed (D87). */
export function slotWindow(month: YearMonth, at: Date, firstPing: Date | null): { from: Date; to: Date; slots: number } {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const start = Date.UTC(y, m - 1, 1)
  const end = Date.UTC(y, m, 1)
  const from = Math.max(start, firstPing ? slotOf(firstPing).getTime() : end)
  const to = Math.min(end, slotOf(at).getTime())
  return { from: new Date(from), to: new Date(to), slots: to > from ? Math.ceil((to - from) / SLOT_MS) : 0 }
}

/** n ÷ d as a percent, unrounded (the page rounds, acceptance Q-7); null when d is 0. */
export const percent = (n: number, d: number): number | null => (d > 0 ? (n / d) * 100 : null)

export async function systemHealth(_viewer: Viewer, month: YearMonth): Promise<SystemHealth> {
  const db = useDb()
  const at = now()
  const first = await db.selectFrom('health_pings').select((eb) => eb.fn.min('slot').as('first')).executeTakeFirst()
  const w = slotWindow(month, at, first?.first ? new Date(first.first as string | Date) : null)
  const pinged = w.slots
    ? Number((await db.selectFrom('health_pings').select((eb) => eb.fn.countAll().as('n')).where('slot', '>=', w.from).where('slot', '<', w.to).executeTakeFirstOrThrow()).n)
    : 0
  const [y, m] = month.split('-').map(Number) as [number, number]
  const t = await db
    .selectFrom('request_stats')
    .select([
      sql<string>`coalesce(sum(requests), 0)`.as('requests'),
      sql<string>`coalesce(sum(errors), 0)`.as('errors'),
      sql<string>`coalesce(sum(requests) filter (where route_group like 'page.%'), 0)`.as('pages'),
      sql<string>`coalesce(sum(slow) filter (where route_group like 'page.%'), 0)`.as('slow_pages'),
    ])
    .where('hour', '>=', new Date(Date.UTC(y, m - 1, 1)))
    .where('hour', '<', new Date(Date.UTC(y, m, 1)))
    .executeTakeFirstOrThrow()
  return {
    month,
    partial_month: month === at.toISOString().slice(0, 7),
    availability_percent: percent(pinged, w.slots),
    availability_target_percent: 99.5,
    error_rate_percent: percent(Number(t.errors), Number(t.requests)),
    slow_page_percent: percent(Number(t.slow_pages), Number(t.pages)),
    slow_page_target_percent: 5,
  }
}
