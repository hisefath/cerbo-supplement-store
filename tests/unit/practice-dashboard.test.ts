// BE-15 PracticeDashboardQueries pure parts (lld.md §2, SEQ-5): the month (UTC, Q-3), attention items (FR-046,
// FR-047, Q-4), the per-product payout and the orders cursor.
import { describe, expect, it } from 'vitest'
import {
  awaitingPaymentItem,
  orderTotalCents,
  decodeCursor,
  encodeCursor,
  monthRange,
  parseMonth,
  parseOrdersQuery,
  stockItem,
} from '../../server/services/practice-dashboard'
import { ProblemError } from '../../server/utils/problem'

const slugOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (e) {
    return e instanceof ProblemError ? e.slug : 'not a problem'
  }
  return undefined
}

const DAY = 86_400_000
const NOW = new Date('2026-10-14T12:00:00Z')

describe('parseMonth: a UTC calendar month, YYYY-MM (Q-3)', () => {
  it('defaults to the current UTC month', () => {
    expect(parseMonth(undefined, new Date('2026-10-31T23:30:00-05:00'))).toBe('2026-11')
    expect(parseMonth('', NOW)).toBe('2026-10')
  })
  it('accepts a month', () => {
    expect(parseMonth('2026-09', NOW)).toBe('2026-09')
  })
  it.each(['2026-13', '2026-00', '2026-9', '26-09', 'October', '2026-09-01', ['2026-09']])('refuses %j with /problems/validation', (m) => {
    expect(slugOf(() => parseMonth(m, NOW))).toBe('validation')
  })
})

describe('monthRange: [start, end) in UTC', () => {
  it('covers the month, December rolls over the year', () => {
    expect(monthRange('2026-10')).toEqual({ start: new Date('2026-10-01T00:00:00Z'), end: new Date('2026-11-01T00:00:00Z') })
    expect(monthRange('2026-12')).toEqual({ start: new Date('2026-12-01T00:00:00Z'), end: new Date('2027-01-01T00:00:00Z') })
  })
})

describe('awaitingPaymentItem: unpaid for more than 3 days (FR-046, AE-043)', () => {
  it('flags 4 days with the day count', () => {
    expect(awaitingPaymentItem({ id: '1043', sent_at: new Date(NOW.getTime() - 4 * DAY) }, NOW)).toEqual({
      kind: 'awaiting_payment',
      label: 'Awaiting payment for 4 days',
      order_id: 1043,
      product_id: null,
    })
  })
  it('does not flag exactly 3 days, flags just over 3 days as 3 days (whole 24-hour periods, EDGE-040)', () => {
    expect(awaitingPaymentItem({ id: '1', sent_at: new Date(NOW.getTime() - 3 * DAY) }, NOW)).toBeNull()
    expect(awaitingPaymentItem({ id: '1', sent_at: new Date(NOW.getTime() - 3 * DAY - 1000) }, NOW)?.label).toBe('Awaiting payment for 3 days')
  })
  it('counts elapsed 24-hour periods, not calendar days: 3 days and 2 minutes across midnight reads 3 days', () => {
    expect(awaitingPaymentItem({ id: '1', sent_at: new Date('2026-10-10T23:59:00Z') }, new Date('2026-10-14T00:01:00Z'))?.label).toBe(
      'Awaiting payment for 3 days',
    )
  })
  it('AE-043: sent 2026-10-10, still unpaid 2026-10-14 at the same time of day or later reads 4 days', () => {
    const sent = new Date('2026-10-10T09:00:00Z')
    expect(awaitingPaymentItem({ id: '1', sent_at: sent }, new Date('2026-10-14T09:00:00Z'))?.label).toBe('Awaiting payment for 4 days')
    expect(awaitingPaymentItem({ id: '1', sent_at: sent }, new Date('2026-10-14T23:59:00Z'))?.label).toBe('Awaiting payment for 4 days')
    expect(awaitingPaymentItem({ id: '1', sent_at: sent }, new Date('2026-10-14T08:59:00Z'))?.label).toBe('Awaiting payment for 3 days')
  })
  it('a moment short of 3 days across midnight is not flagged yet', () => {
    expect(awaitingPaymentItem({ id: '1', sent_at: new Date('2026-10-10T23:59:00Z') }, new Date('2026-10-13T23:58:00Z'))).toBeNull()
  })
  it('does not flag 2 days 23 hours', () => {
    expect(awaitingPaymentItem({ id: '1', sent_at: new Date(NOW.getTime() - 3 * DAY + 3_600_000) }, NOW)).toBeNull()
  })
})

describe('stockItem: 3 or fewer is low, 0 is out of stock (FR-047, AE-044, Q-4)', () => {
  it('flags 3 left as low stock', () => {
    expect(stockItem({ id: '3', name: 'Omega-3 Fish Oil', units_in_stock: 3 })).toEqual({
      kind: 'low_stock',
      label: 'Low stock: 3 left',
      order_id: null,
      product_id: 3,
    })
    expect(stockItem({ id: '3', name: 'Omega-3 Fish Oil', units_in_stock: 1 })?.label).toBe('Low stock: 1 left')
  })
  it('does not flag 4 left', () => {
    expect(stockItem({ id: '2', name: 'Magnesium Glycinate', units_in_stock: 4 })).toBeNull()
  })
  it('flags 0 as out of stock with the product name', () => {
    expect(stockItem({ id: '3', name: 'Omega-3 Fish Oil', units_in_stock: 0 })).toEqual({
      kind: 'out_of_stock',
      label: 'Omega-3 Fish Oil · out of stock',
      order_id: null,
      product_id: 3,
    })
  })
})

describe('orders cursor and EP-30 query', () => {
  it('round-trips the sent time text and id', () => {
    const c = encodeCursor('2026-10-10 09:15:00.123456+00', '1043')
    expect(decodeCursor(c)).toEqual({ sentAt: '2026-10-10 09:15:00.123456+00', id: '1043' })
  })
  it('rejects a cursor from elsewhere', () => {
    expect(decodeCursor('not a cursor')).toBeNull()
    expect(decodeCursor(Buffer.from('o:1042').toString('base64url'))).toBeNull()
  })
  it('defaults to 25, accepts up to 100', () => {
    expect(parseOrdersQuery({ month: '2026-10' }, NOW)).toEqual({ month: '2026-10', limit: 25 })
    const c = encodeCursor('2026-10-10 09:15:00+00', '7')
    expect(parseOrdersQuery({ cursor: c, limit: '100' }, NOW)).toEqual({ month: '2026-10', cursor: c, limit: 100 })
  })
  it.each([[{ limit: '0' }], [{ limit: '101' }], [{ limit: 'x' }], [{ cursor: 'nope' }], [{ month: '2026-1' }]])('refuses %j', (q) => {
    expect(slugOf(() => parseOrdersQuery(q, NOW))).toBe('validation')
  })
})

describe('orderTotalCents: the provider sees the total the patient sees on EP-21 (FR-022, M5_AT_005)', () => {
  // Sent at $30.00 x 2; the practice price is now $31.00.
  const lines = [{ product_id: '7', product_name: 'Vitamin D3', quantity: 2, sent_unit_price_cents: 3000, held_unit_price_cents: 2900, paid_unit_price_cents: 2800 }]
  const current = new Map([[7n, 3100]])
  it('paid: the amount paid', () => {
    expect(orderTotalCents({ status: 'paid', hold_live: false, amount_paid_cents: 5600 }, lines, current)).toBe(5600)
  })
  it('in checkout with a live hold: the held prices', () => {
    expect(orderTotalCents({ status: 'in_checkout', hold_live: true, amount_paid_cents: null }, lines, current)).toBe(5800)
  })
  it.each(['sent', 'payment_failed', 'in_checkout'])('%s without a live hold: today\'s practice prices', (status) => {
    expect(orderTotalCents({ status, hold_live: false, amount_paid_cents: null }, lines, current)).toBe(6200)
  })
})
