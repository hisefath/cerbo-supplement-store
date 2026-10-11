// QA-owned by define-acceptance (specs/M6-measurement-and-operations/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// M6 helpers. Orders are built and paid through the real API (EP-19, EP-22, EP-23), then moved into a fixed past month
// by the test superuser with triggers off (session_replication_role = replica), so reports read stable months
// (October 2025, not "now"). Only the throwaway supplements_test database is touched (../support/db.ts).
import { beforeEach } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { ADMIN_URL, q, withClient } from '../support/db'
import { call, newKey, signIn, type Reply } from '../support/http'
import { EMAIL } from '../support/people'

export type Who = keyof typeof EMAIL

// One sign-in per person per test: EP-15 allows 10 tries per 15 minutes per address, and every test signs in from 127.0.0.1.
const cookies = new Map<Who, string>()
beforeEach(() => cookies.clear())
export async function as(who: Who): Promise<string> {
  let c = cookies.get(who)
  if (!c) {
    c = await signIn(EMAIL[who])
    cookies.set(who, c)
  }
  return c
}

export const get = async (path: string, who: Who): Promise<Reply> => call(path, { cookie: await as(who) })

export type Line = { product_id: number; quantity: number }

export async function sendOrder(provider: Who, patientId: number, lines: Line[]): Promise<number> {
  const r = await call('/api/orders', { method: 'POST', cookie: await as(provider), key: newKey(), body: { patient_id: patientId, lines } })
  if (r.status !== 201) throw new Error(`send returned ${r.status}: ${r.text.slice(0, 200)}`)
  return Number(r.body.order_id)
}

export async function startCheckout(patient: Who, orderId: number): Promise<void> {
  const r = await call(`/api/orders/${orderId}/checkout`, { method: 'POST', cookie: await as(patient) })
  if (r.status !== 200) throw new Error(`checkout returned ${r.status}: ${r.text.slice(0, 200)}`)
}

export async function pay(patient: Who, orderId: number): Promise<Reply> {
  await startCheckout(patient, orderId)
  return call(`/api/orders/${orderId}/payments`, { method: 'POST', cookie: await as(patient), key: newKey() })
}

/** Runs SQL as the test superuser with triggers off, so a paid order's times can move into a past month. */
export async function asAdminNoTriggers(sql: string, params: unknown[] = []): Promise<void> {
  await withClient(ADMIN_URL, async (c) => {
    await c.query('begin')
    await c.query('set local session_replication_role = replica')
    await c.query(sql, params)
    await c.query('commit')
  })
}

/** Moves an order (and its ledger entries) to the given instants. */
export async function backdate(orderId: number, t: { sentAt: Date; paidAt?: Date }): Promise<void> {
  await asAdminNoTriggers(
    `update orders set sent_at = $2,
       checkout_started_at = case when checkout_started_at is null then null else $2::timestamptz + interval '30 minutes' end,
       paid_at = case when paid_at is null then null else $3::timestamptz end
     where id = $1`,
    [orderId, t.sentAt, t.paidAt ?? t.sentAt],
  )
  if (t.paidAt) await asAdminNoTriggers('update ledger_entries set occurred_at = $2 where order_id = $1', [orderId, t.paidAt])
}

/** Sends, pays through the API, then moves the order to the given past instants. */
export async function paidOrder(provider: Who, patientId: number, patient: Who, lines: Line[], t: { sentAt: Date; paidAt: Date }): Promise<number> {
  const id = await sendOrder(provider, patientId, lines)
  const r = await pay(patient, id)
  if (r.status !== 201) throw new Error(`pay returned ${r.status}: ${r.text.slice(0, 200)}`)
  await backdate(id, t)
  return id
}

export const utc = (y: number, m: number, d: number, h = 0, min = 0, s = 0): Date => new Date(Date.UTC(y, m - 1, d, h, min, s))
export const thisMonth = (): string => new Date().toISOString().slice(0, 7)

/** Fetches a page as a browser does (HTML). */
export async function page(path: string, who?: Who): Promise<{ status: number; html: string; location: string | null }> {
  const headers: Record<string, string> = { accept: 'text/html' }
  if (who) headers.cookie = await as(who)
  const res = await fetch(path, { headers, redirect: 'manual' })
  return { status: res.status, html: await res.text(), location: res.headers.get('location') }
}

/** A regex for exact screens.md copy as server-rendered HTML may escape it (apostrophes as &#39;). */
export function copy(text: string): RegExp {
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "(?:'|&#39;|&apos;|&#x27;)")
  return new RegExp(esc)
}

export const homeLink = /<a[^>]+href="\/"[^>]*>\s*Go to your home\s*<\/a>/

/** Polls until `pred` holds or `ms` pass, and returns the last value (for counters written after the response, BE-19). */
export async function eventually<T>(read: () => Promise<T>, pred: (v: T) => boolean, ms = 4000): Promise<T> {
  const end = Date.now() + ms
  let v = await read()
  while (!pred(v) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 150))
    v = await read()
  }
  return v
}

export const accessLog = () =>
  q('select actor_id::int, target_user_id::int, from_role, to_role, reason, outcome from access_log order by id')
export const roleOf = async (userId: number) =>
  (await q('select role, role_changed_at from users where id = $1', [userId]))[0] as { role: string; role_changed_at: Date | null }
