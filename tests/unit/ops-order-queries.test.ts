// BE-14 OpsOrderQueries pure parts (lld.md §2, SEQ-3): the list filter, the keyset cursor and the breakdown shape.
import { describe, expect, it } from 'vitest'
import { assertRole, ORDER_REVIEWER_ROLES } from '../../server/services/access-policy'
import { decodeCursor, encodeCursor, parseOpsOrderFilter, toBreakdown } from '../../server/services/ops-order-queries'
import type { Role, Viewer } from '../../server/services/session'
import { ProblemError } from '../../server/utils/problem'

const slugOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (e) {
    return e instanceof ProblemError ? e.slug : 'not a problem'
  }
  return undefined
}

describe('parseOpsOrderFilter: EP-25 query (status, number, cursor, limit)', () => {
  it('defaults to paid orders, 25 per page', () => {
    expect(parseOpsOrderFilter({})).toEqual({ status: 'paid', limit: 25 })
  })
  it('accepts needs_review, an order number, a cursor and a limit up to 100', () => {
    const c = encodeCursor(1042n)
    expect(parseOpsOrderFilter({ status: 'needs_review', number: '1042', cursor: c, limit: '100' })).toEqual({
      status: 'needs_review',
      number: 1042n,
      cursor: c,
      limit: 100,
    })
  })
  it.each([
    [{ status: 'sent' }],
    [{ number: '10a2' }],
    [{ number: '' }],
    [{ limit: '0' }],
    [{ limit: '101' }],
    [{ limit: '2.5' }],
    [{ cursor: 'not a cursor' }],
  ])('refuses %j with /problems/validation', (q) => {
    expect(slugOf(() => parseOpsOrderFilter(q))).toBe('validation')
  })
})

describe('cursor: opaque, round-trips the last order number', () => {
  it('round-trips', () => {
    expect(decodeCursor(encodeCursor(1042n))).toBe(1042n)
  })
  it('a malformed cursor is null', () => {
    expect(decodeCursor('@@@')).toBeNull()
    expect(decodeCursor(Buffer.from('abc').toString('base64url'))).toBeNull()
  })
})

describe('toBreakdown: AE-013 $60.00 paid = $30.00 + $29.55 + $0.45 with each line (FR-014, FR-036, FR-050)', () => {
  const order = {
    id: '1042',
    practice_name: 'Willow Creek Wellness',
    provider_display_name: 'Dr. Maya Chen',
    paid_at: new Date('2026-10-13T19:30:00Z'),
    amount_paid_cents: 6000,
    item_cost_cents: 3000,
    provider_payout_cents: 2955,
    platform_fee_cents: 45,
  }
  const lines = [
    { product_name: 'Vitamin D3 2000 IU', quantity: 2, paid_unit_price_cents: 1800, unit_cost_cents_at_payment: 900, fee_share_cents: 27 },
    { product_name: 'Magnesium Glycinate', quantity: 1, paid_unit_price_cents: 2400, unit_cost_cents_at_payment: 1200, fee_share_cents: 18 },
  ]

  it('shows the equation, each line at its cost when paid, and that it adds up', () => {
    expect(toBreakdown(order, lines)).toEqual({
      order_id: 1042,
      practice_name: 'Willow Creek Wellness',
      provider_display_name: 'Dr. Maya Chen',
      paid_at: '2026-10-13T19:30:00.000Z',
      amount_paid_cents: 6000,
      item_cost_cents: 3000,
      provider_payout_cents: 2955,
      platform_fee_cents: 45,
      adds_up: true,
      lines: [
        { name: 'Vitamin D3 2000 IU', quantity: 2, unit_price_cents: 1800, unit_cost_cents: 900, line_cost_cents: 1800, fee_share_cents: 27 },
        { name: 'Magnesium Glycinate', quantity: 1, unit_price_cents: 2400, unit_cost_cents: 1200, line_cost_cents: 1200, fee_share_cents: 18 },
      ],
    })
  })
  it('one cent short does not add up', () => {
    expect(toBreakdown({ ...order, item_cost_cents: 2999 }, lines).adds_up).toBe(false)
  })
  it('carries no patient field (NFR-012)', () => {
    expect(Object.keys(toBreakdown(order, lines)).some((k) => k.startsWith('patient'))).toBe(false)
  })
})

describe('ORDER_REVIEWER_ROLES: only operations specialists and finance leads open ops orders (EP-25, EP-26)', () => {
  const viewer = (role: Role): Viewer => ({ userId: 1n, displayName: 'x', role, practiceId: null, idleExpiresAt: new Date() })
  it.each(['operations_specialist', 'finance_lead'] as Role[])('%s may', (role) => {
    expect(slugOf(() => assertRole(viewer(role), ORDER_REVIEWER_ROLES))).toBeUndefined()
  })
  it.each(['sre', 'data_analyst', 'patient', 'provider', 'none'] as Role[])('%s is forbidden', (role) => {
    expect(slugOf(() => assertRole(viewer(role), ORDER_REVIEWER_ROLES))).toBe('forbidden')
  })
  it('nobody signed in is unauthenticated', () => {
    expect(slugOf(() => assertRole(null, ORDER_REVIEWER_ROLES))).toBe('unauthenticated')
  })
})
