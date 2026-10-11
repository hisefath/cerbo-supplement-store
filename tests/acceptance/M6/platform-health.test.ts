// QA-owned by define-acceptance (specs/M6-measurement-and-operations/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-6 Measure in-house volume and platform health (FR-032, FR-048, FR-049, FR-053): EP-33 GET /api/ops/health and
// S10 /ops/health. A month is a UTC calendar month (lld.md BE-16 Definitions). Orders are paid through the API, then
// moved into October 2025 so the figures do not depend on today's date.
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem } from '../support/http'
import { as, asAdminNoTriggers, backdate, copy, eventually, get, homeLink, page, paidOrder, pay, sendOrder, thisMonth, utc } from './support'

const app = useApp({ paymentStubMode: 'succeed' })
const T = 120_000
const patientNames = ['Ana Ruiz', 'Ben Ortiz', 'Carla Diaz', 'ana.ruiz@example.test', 'ben.ortiz@example.test', 'carla.diaz@example.test']

describe('US-6 platform health and volume report', () => {
  it('M6_AT_001 the October volume report shows Willow Creek $240.00 paid, $1.80 fees, 5 sent, 4 paid, and Maple Grove its own figures (AE-029, FR-032, SC-001)', async () => {
    const w = app.world()
    for (let i = 0; i < 4; i++) {
      await paidOrder('drChen', w.ana, 'ana', [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }], { sentAt: utc(2025, 10, 2 + i, 10), paidAt: utc(2025, 10, 3 + i, 9) })
    }
    const unpaid = await sendOrder('drChen', w.ben, [{ product_id: w.vitaminD3, quantity: 1 }])
    await backdate(unpaid, { sentAt: utc(2025, 10, 20, 10) })
    await paidOrder('drLee', w.carla, 'carla', [{ product_id: w.omega3, quantity: 1 }], { sentAt: utc(2025, 10, 8, 10), paidAt: utc(2025, 10, 8, 12) })
    const r = await get('/api/ops/health?month=2025-10', 'omar')
    expect(r.status).toBe(200)
    expect(r.body.month).toBe('2025-10')
    expect(r.body.practices).toMatchObject([
      { practice_name: 'Willow Creek Wellness', paid_cents: 24000, fees_cents: 180, orders_sent: 5, orders_paid: 4 },
      { practice_name: 'Maple Grove Clinic', paid_cents: 3000, fees_cents: 23, orders_sent: 1, orders_paid: 1 },
    ])
  }, T)

  it('M6_AT_002 October with 10 sent, 8 paid (median 20 h), 1 failed and 1 expired shows those counts and 1,200 minutes (AE-045, FR-048, SC-003)', async () => {
    const w = app.world()
    const hours = [10, 12, 18, 20, 20, 22, 40, 50] // median 20 h; mean 24 h, so a mean cannot pass
    const ids: number[] = []
    for (let i = 0; i < 10; i++) ids.push(await sendOrder('drChen', w.ana, [{ product_id: w.vitaminD3, quantity: 1 }]))
    for (let i = 0; i < 8; i++) {
      const r = await pay('ana', ids[i])
      expect(r.status).toBe(201)
      const sent = utc(2025, 10, 1 + i, 8)
      await backdate(ids[i], { sentAt: sent, paidAt: new Date(sent.getTime() + hours[i] * 3_600_000) })
    }
    // order 9: payment failed; order 10: checkout started, the hold ended and it was not restarted (expired)
    await asAdminNoTriggers("update orders set status = 'payment_failed', sent_at = $2, checkout_started_at = $3 where id = $1", [ids[8], utc(2025, 10, 12, 8), utc(2025, 10, 12, 9)])
    await asAdminNoTriggers("update orders set status = 'sent', sent_at = $2, checkout_started_at = $3, prices_held_until = null where id = $1", [ids[9], utc(2025, 10, 13, 8), utc(2025, 10, 13, 9)])
    const r = await get('/api/ops/health?month=2025-10', 'fran')
    expect(r.status).toBe(200)
    expect(r.body.funnel).toMatchObject({ sent: 10, checkout_started: 10, paid: 8, payment_failed: 1, checkout_expired: 1 })
    expect(r.body.median_minutes_to_pay).toBe(1200)
    expect(r.body.out_of_stock_refusals).toBe(0)
    // the sent-to-paid rate is a measure in percent (⚠ Q-4): 8 of 10 → 80
    expect(r.body.measures.filter((m: any) => m.value === 80)).toHaveLength(1)
    const sept = await get('/api/ops/health?month=2025-09', 'fran')
    expect(sept.body.funnel).toMatchObject({ sent: 0, checkout_started: 0, paid: 0, payment_failed: 0, checkout_expired: 0 })
    expect(sept.body.median_minutes_to_pay).toBeNull()
  }, T)

  it('M6_AT_003 with 1 order needing review and its alert line at 1, that measure needs attention and S10 says so on top; at 0 nothing does (AE-046, FR-049)', async () => {
    const w = app.world()
    const before = await get('/api/ops/health', 'omar')
    expect(before.status).toBe(200)
    expect(before.body.orders_needing_review).toBe(0)
    expect(before.body.measures.filter((m: any) => m.needs_attention)).toHaveLength(0)
    const id = await sendOrder('drChen', w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
    await asAdminNoTriggers("update orders set status = 'needs_review' where id = $1", [id])
    const r = await get('/api/ops/health', 'omar')
    expect(r.body.orders_needing_review).toBe(1)
    const flagged = r.body.measures.filter((m: any) => m.needs_attention)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]).toMatchObject({ value: 1, alert_line: 1, needs_attention: true })
    const s10 = await page('/ops/health', 'omar')
    expect(s10.status).toBe(200)
    expect(s10.html).toMatch(copy('1 measure needs attention: orders needing review (1)'))
    // triangulation: a second order needing review
    const id2 = await sendOrder('drChen', w.ben, [{ product_id: w.vitaminD3, quantity: 1 }])
    await asAdminNoTriggers("update orders set status = 'needs_review' where id = $1", [id2])
    const r2 = await get('/api/ops/health', 'omar')
    expect(r2.body.orders_needing_review).toBe(2)
    expect(r2.body.measures.filter((m: any) => m.needs_attention)[0]).toMatchObject({ value: 2, alert_line: 1 })
  }, T)

  it('M6_AT_004 Dana, the data analyst, sees October\'s totals per practice and cannot open Order <n>: API 403 and S4 "Your role shows totals only." (AE-050, FR-053, INV-7)', async () => {
    const w = app.world()
    const id = await paidOrder('drChen', w.ana, 'ana', [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }], { sentAt: utc(2025, 10, 2, 10), paidAt: utc(2025, 10, 3, 9) })
    const r = await get('/api/ops/health?month=2025-10', 'dana')
    expect(r.status).toBe(200)
    expect(r.body.practices[0]).toMatchObject({ practice_name: 'Willow Creek Wellness', paid_cents: 6000, fees_cents: 45, orders_sent: 1, orders_paid: 1 })
    expect(r.text).not.toContain('order_id')
    expect(r.text).not.toMatch(new RegExp(`\\b${id}\\b`))
    // allowed twin: the operations specialist opens the same breakdown
    expect((await get(`/api/ops/orders/${id}`, 'omar')).status).toBe(200)
    const refused = await get(`/api/ops/orders/${id}`, 'dana')
    expectProblem(refused, 403, 'forbidden')
    expect(refused.text).not.toContain('6000')
    const s4 = await page(`/ops/orders/${id}`, 'dana')
    expect(s4.html).toMatch(copy('Your role shows totals only.'))
    expect(s4.html).not.toContain('$60.00')
    const s10 = await page('/ops/health?month=2025-10', 'dana')
    expect(s10.status).toBe(200)
    expect(s10.html).toContain('Willow Creek Wellness')
    expect(s10.html).not.toMatch(/href="\/ops\/orders\/\d+"/)
  }, T)

  it('M6_AT_005 a Pay refused for stock counts as one out-of-stock refusal; a refused send and a successful Pay do not (FR-048, D86)', async () => {
    const w = app.world()
    const id = await sendOrder('drChen', w.ana, [{ product_id: w.vitaminD3, quantity: 2 }])
    await q('update products set units_in_stock = 1 where id = $1', [w.vitaminD3])
    const refused = await pay('ana', id)
    expectProblem(refused, 422, 'insufficient-stock')
    const month = thisMonth()
    expect((await get(`/api/ops/health?month=${month}`, 'omar')).status).toBe(200)
    const read = async () => (await get(`/api/ops/health?month=${month}`, 'omar')).body?.out_of_stock_refusals
    expect(await eventually(read, (v) => v === 1)).toBe(1)
    // a refused send in the order builder is not a payment refusal
    const send = await call('/api/orders', { method: 'POST', cookie: await as('drChen'), key: crypto.randomUUID(), body: { patient_id: w.ben, lines: [{ product_id: w.vitaminD3, quantity: 5 }] } })
    expectProblem(send, 422, 'insufficient-stock')
    // a successful Pay is not a refusal
    await q('update products set units_in_stock = 10 where id = $1', [w.vitaminD3])
    const ok = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: await as('ana'), key: crypto.randomUUID() })
    expect(ok.status).toBe(201)
    const total = async () => Number((await q('select coalesce(sum(requests), 0)::int as n from request_stats'))[0].n)
    const seen = await total()
    await eventually(total, (n) => n > seen)
    expect(await read()).toBe(1)
  }, T)

  it('M6_AT_006 a month with no orders lists every practice with zeros, a zero funnel and no median; S10 says "No orders were sent in September 2025." (FR-032, FR-048)', async () => {
    const w = app.world()
    await paidOrder('drChen', w.ana, 'ana', [{ product_id: w.vitaminD3, quantity: 1 }], { sentAt: utc(2025, 10, 2, 10), paidAt: utc(2025, 10, 2, 12) })
    const oct = await get('/api/ops/health?month=2025-10', 'omar')
    expect(oct.status).toBe(200)
    expect(oct.body.practices[0].orders_paid).toBe(1)
    const r = await get('/api/ops/health?month=2025-09', 'omar')
    expect(r.status).toBe(200)
    expect(r.body.practices).toMatchObject([
      { practice_name: 'Willow Creek Wellness', paid_cents: 0, fees_cents: 0, orders_sent: 0, orders_paid: 0 },
      { practice_name: 'Maple Grove Clinic', paid_cents: 0, fees_cents: 0, orders_sent: 0, orders_paid: 0 },
    ])
    expect(r.body.median_minutes_to_pay).toBeNull()
    const s10 = await page('/ops/health?month=2025-09', 'omar')
    expect(s10.html).toMatch(copy('No orders were sent in September 2025.'))
  }, T)

  it('M6_AT_007 no patient name or email reaches platform staff on the health, report, export or access-log answers or pages (NFR-012, INV-7, FR-050)', async () => {
    const w = app.world()
    await paidOrder('drChen', w.ana, 'ana', [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }], { sentAt: utc(2025, 10, 2, 10), paidAt: utc(2025, 10, 3, 9) })
    await paidOrder('drLee', w.carla, 'carla', [{ product_id: w.omega3, quantity: 1 }], { sentAt: utc(2025, 10, 4, 10), paidAt: utc(2025, 10, 4, 12) })
    const answers = [
      await get('/api/ops/health?month=2025-10', 'omar'),
      await get('/api/ops/finance/report?month=2025-10', 'fran'),
      await get('/api/ops/finance/export?month=2025-10', 'fran'),
      await get('/api/ops/access-log?month=2025-10', 'fran'),
    ]
    for (const a of answers) expect(a.status).toBe(200)
    expect(answers[0].body.practices[0].paid_cents).toBe(6000)
    expect(answers[1].body.patient_payments_cents).toBe(9000)
    const pages = [await page('/ops/health?month=2025-10', 'omar'), await page('/ops/finance?month=2025-10', 'fran')]
    for (const p of pages) expect(p.status).toBe(200)
    const all = answers.map((a) => a.text).concat(pages.map((p) => p.html)).join('\n')
    for (const n of patientNames) expect(all).not.toContain(n)
  }, T)

  it('M6_AT_008 only the finance lead, operations specialist and data analyst open platform health; the SRE, a provider and a patient get 403, a stranger 401, a bad month 422 (FR-053, FR-058)', async () => {
    for (const who of ['fran', 'omar', 'dana'] as const) expect((await get('/api/ops/health?month=2025-10', who)).status, who).toBe(200)
    for (const who of ['sam', 'drChen', 'ana'] as const) expectProblem(await get('/api/ops/health?month=2025-10', who), 403, 'forbidden')
    expectProblem(await call('/api/ops/health?month=2025-10'), 401, 'unauthenticated')
    expectProblem(await get('/api/ops/health?month=2025-13', 'omar'), 422, 'validation')
    const ok = await page('/ops/health', 'omar')
    expect(ok.html).toContain('Platform health')
    expect(ok.html).not.toMatch(homeLink)
    const chen = await page('/ops/health', 'drChen')
    expect(chen.status).toBe(200)
    expect(chen.html).toMatch(copy('Only operations staff can see platform health.'))
    expect(chen.html).toMatch(homeLink)
    const stranger = await page('/ops/health')
    expect(stranger.status).toBe(303)
    expect(stranger.location).toMatch(/^\/sign-in\?next=/)
  }, T)

  it('M6_AT_009 the month edge is UTC: paid 2025-10-31 23:59:59Z counts in October, paid 2025-11-01 00:00:00Z in November (FR-032)', async () => {
    const w = app.world()
    await paidOrder('drChen', w.ana, 'ana', [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }], { sentAt: utc(2025, 10, 31, 20), paidAt: utc(2025, 10, 31, 23, 59, 59) })
    await paidOrder('drChen', w.ben, 'ben', [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }], { sentAt: utc(2025, 10, 31, 23, 59, 59), paidAt: utc(2025, 11, 1, 0, 0, 0) })
    const oct = await get('/api/ops/health?month=2025-10', 'omar')
    expect(oct.status).toBe(200)
    expect(oct.body.practices[0]).toMatchObject({ paid_cents: 6000, fees_cents: 45, orders_sent: 2, orders_paid: 1 })
    const nov = await get('/api/ops/health?month=2025-11', 'omar')
    expect(nov.body.practices[0]).toMatchObject({ paid_cents: 6000, fees_cents: 45, orders_sent: 0, orders_paid: 1 })
  }, T)
})
