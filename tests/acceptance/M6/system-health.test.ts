// QA-owned by define-acceptance (specs/M6-measurement-and-operations/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-10 Check system health (FR-058, FR-059; D87): EP-39 GET /api/ops/system-health, EP-40 /healthz, S14 /ops/system,
// and the SRE refused an order breakdown (AE-061). The uptime monitor is faked by inserting health_pings slots
// (lld.md SEAM-7); October 2025 has 31 × 288 = 8,928 five-minute slots.
import { describe, expect, it } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { expectProblem } from '../support/http'
import { copy, eventually, get, homeLink, page, paidOrder, utc } from './support'

const app = useApp({ paymentStubMode: 'succeed' })
const T = 120_000

const pings = (from: string, to: string, skipFrom?: string, skipTo?: string) =>
  q(
    `insert into health_pings (slot)
     select s from generate_series($1::timestamptz, $2::timestamptz, interval '5 minutes') s
     where $3::timestamptz is null or s < $3::timestamptz or s > $4::timestamptz`,
    [from, to, skipFrom ?? null, skipTo ?? null],
  )
const stats = (hour: string, group: string, requests: number, errors: number, slow: number) =>
  q('insert into request_stats (hour, route_group, requests, errors, slow, stock_refusals) values ($1, $2, $3, $4, $5, 0)', [hour, group, requests, errors, slow])

describe('US-10 system health', () => {
  it('M6_AT_034 October with 27 of 8,928 slots unpinged, 4 errors in 1,000 requests and 10 of 500 page responses slow shows 99.7 %, 0.4 % and 2 % (AE-062, FR-059, D87)', async () => {
    await pings('2025-10-01T00:00:00Z', '2025-10-31T23:55:00Z', '2025-10-15T03:00:00Z', '2025-10-15T05:10:00Z')
    expect((await q('select count(*)::int as n from health_pings'))[0].n).toBe(8901)
    await stats('2025-10-10T10:00:00Z', 'page.S10', 500, 0, 10)
    await stats('2025-10-10T10:00:00Z', 'api.orders', 500, 4, 100) // api slowness is not page slowness
    const r = await get('/api/ops/system-health?month=2025-10', 'sam')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ month: '2025-10', partial_month: false, availability_target_percent: 99.5, slow_page_target_percent: 5 })
    expect(r.body.availability_percent).toBeCloseTo(99.7, 1)
    expect(r.body.error_rate_percent).toBeCloseTo(0.4, 2)
    expect(r.body.slow_page_percent).toBeCloseTo(2, 2)
    const s14 = await page('/ops/system?month=2025-10', 'sam')
    expect(s14.status).toBe(200)
    expect(s14.html).toContain('System health')
    expect(s14.html).toContain('99.7%')
  }, T)

  it('M6_AT_035 availability counts from the first ping ever: pinged from 16 October on reads 100 %, an unpinged November 0 %, a month before any ping or traffic reads no data (FR-059, D87)', async () => {
    await pings('2025-10-16T00:00:00Z', '2025-10-31T23:55:00Z')
    await stats('2025-11-03T08:00:00Z', 'api.orders', 100, 0, 0)
    const oct = await get('/api/ops/system-health?month=2025-10', 'sam')
    expect(oct.status).toBe(200)
    expect(oct.body.availability_percent).toBeCloseTo(100, 2)
    const nov = await get('/api/ops/system-health?month=2025-11', 'sam')
    expect(nov.body.availability_percent).toBeCloseTo(0, 2)
    expect(nov.body.error_rate_percent).toBeCloseTo(0, 2)
    expect(nov.body.slow_page_percent).toBeNull()
    const sept = await get('/api/ops/system-health?month=2025-09', 'sam')
    expect(sept.body).toMatchObject({ availability_percent: null, error_rate_percent: null, slow_page_percent: null })
  }, T)

  it('M6_AT_036 /healthz answers "ok" and records its 5-minute slot once (FR-059, EP-40, D87)', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await fetch('/healthz')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('ok')
    }
    const rows = await eventually(() => q("select extract(epoch from slot)::bigint as s from health_pings"), (r) => r.length > 0)
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows.length).toBeLessThanOrEqual(2) // two calls can straddle a slot edge, never more
    for (const r of rows) expect(Number(r.s) % 300).toBe(0)
    const nowSlot = Math.floor(Date.now() / 300_000) * 300
    expect(rows.map((r: any) => Number(r.s))).toContain(nowSlot)
  }, T)

  it('M6_AT_037 requests are counted per hour by route group, never by id, and /healthz is not counted (FR-059, NFR-010, BE-19.routeGroup)', async () => {
    const w = app.world()
    const id = await paidOrder('drChen', w.ana, 'ana', [{ product_id: w.vitaminD3, quantity: 1 }], { sentAt: utc(2025, 10, 2, 10), paidAt: utc(2025, 10, 2, 12) })
    await get(`/api/orders/${id}`, 'ana')
    await fetch('/healthz')
    const groups = await eventually(
      async () => (await q('select route_group, requests from request_stats')).map((r: any) => r.route_group as string),
      (g) => g.includes('api.orders') && g.includes('api.session'),
    )
    expect(groups).toContain('api.orders')
    expect(groups).toContain('api.session')
    for (const g of groups) {
      expect(g).not.toContain(String(id))
      expect(g).not.toMatch(/healthz|version|_nuxt/)
    }
  }, T)

  it('M6_AT_038 only the SRE opens system health and the staff list: Fran, Omar and Dana get 403, and S14 tells Fran "Only the SRE can see system health." (FR-059, FR-058)', async () => {
    expect((await get('/api/ops/system-health?month=2025-10', 'sam')).status).toBe(200)
    for (const who of ['fran', 'omar', 'dana'] as const) expectProblem(await get('/api/ops/system-health?month=2025-10', who), 403, 'forbidden')
    expectProblem(await get('/api/ops/system-health?month=2025-13', 'sam'), 422, 'validation')
    const s14 = await page('/ops/system', 'fran')
    expect(s14.status).toBe(200)
    expect(s14.html).toMatch(copy('Only the SRE can see system health.'))
    expect(s14.html).toMatch(homeLink)
  }, T)

  it('M6_AT_039 Sam, the SRE, opening Order <n>\'s breakdown is refused with no amounts, and S4 says "Your role can\'t open order breakdowns." (AE-061, FR-058, INV-7)', async () => {
    const w = app.world()
    const id = await paidOrder('drChen', w.ana, 'ana', [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }], { sentAt: utc(2025, 10, 2, 10), paidAt: utc(2025, 10, 3, 9) })
    const omar = await get(`/api/ops/orders/${id}`, 'omar')
    expect(omar.status).toBe(200)
    expect((await page(`/ops/orders/${id}`, 'omar')).html).toContain('$60.00')
    const r = await get(`/api/ops/orders/${id}`, 'sam')
    expectProblem(r, 403, 'forbidden')
    expect(r.text).not.toContain('6000')
    const s4 = await page(`/ops/orders/${id}`, 'sam')
    expect(s4.html).toMatch(copy("Your role can't open order breakdowns."))
    expect(s4.html).not.toContain('$60.00')
  }, T)
})
