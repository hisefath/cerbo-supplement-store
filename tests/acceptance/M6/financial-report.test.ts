// QA-owned by define-acceptance (specs/M6-measurement-and-operations/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-9 Run the financial report (FR-051, FR-060 to FR-065): EP-34 GET /api/ops/finance/report, EP-35 GET
// /api/ops/finance/export and S11 /ops/finance. October 2025 holds the AE-055 orders: Ana's $60.00 (cost $30.00,
// payout $29.55, fee $0.45) and Ben's $30.00 (cost $15.00, payout $14.77, fee $0.23), both with Dr. Chen.
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import type { World } from '../support/people'
import { expectProblem } from '../support/http'
import { asAdminNoTriggers, backdate, copy, get, homeLink, page, paidOrder, sendOrder, utc } from './support'

const app = useApp({ paymentStubMode: 'succeed' })
const T = 120_000
const anaLines = (w: World) => [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }]

// Also one sent, unpaid October order: periods hold only paid orders (EC-16), so it must never count.
async function october(w: World): Promise<{ ana: number; ben: number; unpaid: number }> {
  const ana = await paidOrder('drChen', w.ana, 'ana', anaLines(w), { sentAt: utc(2025, 10, 2, 10), paidAt: utc(2025, 10, 3, 9) })
  const ben = await paidOrder('drChen', w.ben, 'ben', [{ product_id: w.omega3, quantity: 1 }], { sentAt: utc(2025, 10, 5, 10), paidAt: utc(2025, 10, 6, 9) })
  const unpaid = await sendOrder('drChen', w.ana, [{ product_id: w.vitaminD3, quantity: 1 }])
  await backdate(unpaid, { sentAt: utc(2025, 10, 7, 10) })
  return { ana, ben, unpaid }
}

describe('US-9 financial report', () => {
  it('M6_AT_010 October shows payments $90.00, item cost $45.00, payouts $44.32, fees $0.68 and Dr. Chen\'s payout $44.32; November with two providers triangulates (AE-055, FR-060, FR-064, INV-9)', async () => {
    const w = app.world()
    await october(w)
    await paidOrder('drChen', w.ben, 'ben', [{ product_id: w.omega3, quantity: 1 }], { sentAt: utc(2025, 11, 9, 10), paidAt: utc(2025, 11, 10, 9) })
    await paidOrder('drLee', w.carla, 'carla', [{ product_id: w.omega3, quantity: 1 }], { sentAt: utc(2025, 11, 9, 11), paidAt: utc(2025, 11, 10, 10) })
    const r = await get('/api/ops/finance/report?month=2025-10', 'fran')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ from: '2025-10-01', to: '2025-10-31', patient_payments_cents: 9000, item_cost_cents: 4500, provider_payouts_cents: 4432, platform_fees_cents: 68 })
    expect(r.body.payouts_by_provider).toEqual([{ provider_display_name: 'Dr. Maya Chen', practice_name: 'Willow Creek Wellness', payout_cents: 4432 }])
    // November: the fee total is the sum of per-order fees (23 + 23 = 46), not 0.75 % of $60.00 (45)
    const nov = await get('/api/ops/finance/report?month=2025-11', 'fran')
    expect(nov.body).toMatchObject({ patient_payments_cents: 6000, item_cost_cents: 3000, provider_payouts_cents: 2954, platform_fees_cents: 46 })
    const payouts = [...nov.body.payouts_by_provider].sort((a: any, b: any) => a.provider_display_name.localeCompare(b.provider_display_name))
    expect(payouts).toMatchObject([
      { provider_display_name: 'Dr. Maya Chen', practice_name: 'Willow Creek Wellness', payout_cents: 1477 },
      { provider_display_name: 'Dr. Sam Lee', practice_name: 'Maple Grove Clinic', payout_cents: 1477 },
    ])
  }, T)

  it('M6_AT_011 the October report is balanced to the cent and S11 shows "Balanced: yes" with $90.00, $45.00, $44.32 and $0.68 (AE-056, FR-061, INV-1)', async () => {
    const w = app.world()
    await october(w)
    const r = await get('/api/ops/finance/report?month=2025-10', 'fran')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ balanced: true, gap_cents: 0, gap_order_ids: [] })
    const s11 = await page('/ops/finance?month=2025-10', 'fran')
    expect(s11.status).toBe(200)
    expect(s11.html).toMatch(copy('Balanced: yes'))
    for (const amount of ['$90.00', '$45.00', '$44.32', '$0.68']) expect(s11.html).toContain(amount)
  }, T)

  it('M6_AT_012 revenue shows two labelled ways: gross $90.00 (all patient payments) and net $0.68 (platform fees only) (AE-057, FR-062)', async () => {
    const w = app.world()
    await october(w)
    const r = await get('/api/ops/finance/report?month=2025-10', 'fran')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ gross_revenue_cents: 9000, net_revenue_cents: 68 })
    const s11 = await page('/ops/finance?month=2025-10', 'fran')
    expect(s11.html).toMatch(/Gross[\s\S]{0,300}\$90\.00/)
    expect(s11.html).toMatch(/Net[\s\S]{0,300}\$0\.68/)
  }, T)

  it('M6_AT_013 the October export holds the four totals and exactly one line per paid order by number, with no patient identity (AE-058, FR-063, INV-7)', async () => {
    const w = app.world()
    const { ana, ben, unpaid } = await october(w)
    const r = await get('/api/ops/finance/export?month=2025-10', 'fran')
    expect(r.status).toBe(200)
    expect(r.type).toContain('text/csv')
    const lines = r.text.split(/\r?\n/).filter((l) => l.trim() !== '')
    for (const id of [ana, ben]) expect(lines.filter((l) => new RegExp(`\\b${id}\\b`).test(l)), `order ${id}`).toHaveLength(1)
    expect(lines.filter((l) => new RegExp(`\\b${unpaid}\\b`).test(l)), 'the unpaid order').toHaveLength(0)
    // totals, in whole cents or dollars (⚠ Q-6 settles the column format)
    for (const t of ['(9000|90\\.00)', '(4500|45\\.00)', '(4432|44\\.32)', '(68|0\\.68)']) expect(r.text).toMatch(new RegExp(`(^|[^0-9.])${t}([^0-9]|$)`, 'm'))
    for (const n of ['Ana Ruiz', 'Ben Ortiz', 'ana.ruiz@example.test', 'ben.ortiz@example.test']) expect(r.text).not.toContain(n)
  }, T)

  it('M6_AT_014 an order whose parts are one cent short makes October "Not balanced: $0.01 short" and names that order (AE-059, FR-065)', async () => {
    const w = app.world()
    const { ana } = await october(w)
    const before = await get('/api/ops/finance/report?month=2025-10', 'fran')
    expect(before.status).toBe(200)
    expect(before.body.balanced).toBe(true)
    // a direct database write (the only way, LINV-2): Ana's fee entry drops from 45 to 44 cents
    await asAdminNoTriggers("update ledger_entries set amount_cents = 44 where order_id = $1 and category = 'platform_fee'", [ana])
    const r = await get('/api/ops/finance/report?month=2025-10', 'fran')
    expect(r.body).toMatchObject({ balanced: false, gap_cents: 1, gap_order_ids: [ana], patient_payments_cents: 9000, platform_fees_cents: 67 })
    const s11 = await page('/ops/finance?month=2025-10', 'fran')
    expect(s11.html).toMatch(copy('Not balanced: $0.01 short.'))
    expect(s11.html).toContain(`Order ${ana}`)
  }, T)

  it('M6_AT_015 September with no paid orders shows every total $0.00, balanced, no payouts, and S11 says so; October is not empty (AE-060, FR-060)', async () => {
    const w = app.world()
    await paidOrder('drChen', w.ana, 'ana', anaLines(w), { sentAt: utc(2025, 10, 2, 10), paidAt: utc(2025, 10, 3, 9) })
    const oct = await get('/api/ops/finance/report?month=2025-10', 'fran')
    expect(oct.status).toBe(200)
    expect(oct.body.patient_payments_cents).toBe(6000)
    const r = await get('/api/ops/finance/report?month=2025-09', 'fran')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      from: '2025-09-01', to: '2025-09-30', patient_payments_cents: 0, item_cost_cents: 0, provider_payouts_cents: 0, platform_fees_cents: 0,
      balanced: true, gap_cents: 0, gap_order_ids: [], gross_revenue_cents: 0, net_revenue_cents: 0, payouts_by_provider: [],
    })
    const s11 = await page('/ops/finance?month=2025-09', 'fran')
    expect(s11.html).toMatch(copy('No orders were paid in September 2025. Every total is $0.00.'))
  }, T)

  it('M6_AT_016 only Fran runs and exports the report: Omar, Dana and Sam get 403, and S11 tells Omar "Only the finance lead can run financial reports." (AE-048, FR-051, FR-058)', async () => {
    const w = app.world()
    await october(w)
    expect((await get('/api/ops/finance/report?month=2025-10', 'fran')).status).toBe(200)
    expect((await get('/api/ops/finance/export?month=2025-10', 'fran')).status).toBe(200)
    for (const who of ['omar', 'dana', 'sam'] as const) {
      expectProblem(await get('/api/ops/finance/report?month=2025-10', who), 403, 'forbidden')
      const ex = await get('/api/ops/finance/export?month=2025-10', who)
      expectProblem(ex, 403, 'forbidden')
      expect(ex.text).not.toContain('9000')
    }
    const s11 = await page('/ops/finance?month=2025-10', 'omar')
    expect(s11.status).toBe(200)
    expect(s11.html).toMatch(copy('Only the finance lead can run financial reports.'))
    expect(s11.html).toMatch(homeLink)
    expect(s11.html).not.toContain('$90.00')
  }, T)

  it('M6_AT_017 a period is a month or an inclusive from-to of at most 366 days in UTC; both forms, from after to, 367 days or a bad date are 422 (FR-060, FR-063)', async () => {
    const w = app.world()
    await paidOrder('drChen', w.ana, 'ana', anaLines(w), { sentAt: utc(2025, 10, 31, 20), paidAt: utc(2025, 10, 31, 23, 59, 59) })
    await paidOrder('drChen', w.ben, 'ben', [{ product_id: w.omega3, quantity: 1 }], { sentAt: utc(2025, 10, 31, 22), paidAt: utc(2025, 11, 1, 0, 0, 0) })
    const pay = async (qs: string) => {
      const r = await get(`/api/ops/finance/report?${qs}`, 'fran')
      expect(r.status, qs).toBe(200)
      return r.body.patient_payments_cents
    }
    expect(await pay('month=2025-10')).toBe(6000)
    expect(await pay('from=2025-10-01&to=2025-10-31')).toBe(6000)
    expect(await pay('from=2025-11-01&to=2025-11-01')).toBe(3000)
    expect(await pay('from=2025-10-31&to=2025-11-01')).toBe(9000)
    expect(await pay('from=2024-01-01&to=2024-12-31')).toBe(0) // 366 days, the limit
    for (const bad of ['month=2025-10&from=2025-10-01&to=2025-10-31', 'from=2025-11-02&to=2025-11-01', 'from=2025-01-01&to=2026-01-02', 'from=2025-02-01&to=2025-02-30', 'month=2025-13']) {
      expectProblem(await get(`/api/ops/finance/report?${bad}`, 'fran'), 422, 'validation')
    }
    expectProblem(await get('/api/ops/finance/export?from=2025-11-02&to=2025-11-01', 'fran'), 422, 'validation')
  }, T)
})
