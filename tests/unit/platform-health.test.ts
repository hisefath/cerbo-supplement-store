// BE-16 PlatformHealthQueries, pure part (lld.md §2 Definitions, A-11; acceptance Q-4): the measures and their alert
// lines. The SQL against the real tables is proved by tests/acceptance/M6/platform-health.test.ts (AT-001 to AT-009).
import { describe, expect, it } from 'vitest'
import { measures } from '../../server/services/platform-health'

const base = { funnel: { sent: 10, checkout_started: 10, paid: 8, payment_failed: 1, checkout_expired: 1 }, median_minutes_to_pay: 1200, out_of_stock_refusals: 0, orders_needing_review: 0 }

describe('BE-16 measures', () => {
  it('sends the sent-to-paid rate as a percent with no alert line (Q-4) and every FR-048 measure once', () => {
    const m = measures(base)
    expect(m.find((x) => x.name === 'sent-to-paid rate')).toEqual({ name: 'sent-to-paid rate', value: 80, alert_line: null, needs_attention: false })
    expect(m.map((x) => x.name)).toEqual(['sent-to-paid rate', 'median minutes to pay', 'failed payments', 'expired checkouts', 'out-of-stock refusals', 'orders needing review'])
    expect(m.filter((x) => x.value === 80)).toHaveLength(1)
  })

  it('flags orders needing review at its alert line of 1 and above, never below (A-11, FR-049)', () => {
    expect(measures(base).filter((x) => x.needs_attention)).toHaveLength(0)
    for (const n of [1, 2]) {
      const flagged = measures({ ...base, orders_needing_review: n }).filter((x) => x.needs_attention)
      expect(flagged).toEqual([{ name: 'orders needing review', value: n, alert_line: 1, needs_attention: true }])
    }
  })

  it('leaves out a measure with no value: no rate with nothing sent, no median with nothing paid', () => {
    const m = measures({ funnel: { sent: 0, checkout_started: 0, paid: 0, payment_failed: 0, checkout_expired: 0 }, median_minutes_to_pay: null, out_of_stock_refusals: 0, orders_needing_review: 0 })
    expect(m.map((x) => x.name)).toEqual(['failed payments', 'expired checkouts', 'out-of-stock refusals', 'orders needing review'])
    expect(m.every((x) => typeof x.value === 'number')).toBe(true)
  })
})
