// BE-13 adjust, pure parts (lld.md §2, SEQ-6): the EP-32 body and the stale-count and below-zero checks. The locked
// database path, the role check and the idempotent replay are proved by tests/acceptance/M5 (AT-017 to AT-020).
import { describe, expect, it } from 'vitest'
import { checkAdjustment, StockAdjustmentRequest } from '../../server/services/stock-adjustments'
import { ProblemError } from '../../server/utils/problem'

function problem(fn: () => unknown): ProblemError {
  try {
    fn()
  } catch (e) {
    if (e instanceof ProblemError) return e
    throw e
  }
  throw new Error('expected a ProblemError')
}

describe('checkAdjustment', () => {
  it('returns the new count when the form saw the current count (AE-027: 8 + 12 = 20)', () => {
    expect(checkAdjustment(7n, 8, { change: 12, expected_units_in_stock: 8 })).toBe(20)
  })

  it('allows a removal down to exactly 0', () => {
    expect(checkAdjustment(7n, 8, { change: -8, expected_units_in_stock: 8 })).toBe(0)
  })

  it('refuses a stale count with /problems/stale-stock and the current count', () => {
    const p = problem(() => checkAdjustment(7n, 9, { change: 2, expected_units_in_stock: 8 }))
    expect(p.slug).toBe('stale-stock')
    expect(p.extensions).toEqual({ unitsInStock: 9 })
  })

  it('refuses a change below zero with /problems/insufficient-stock naming the product (INV-5)', () => {
    const p = problem(() => checkAdjustment(7n, 9, { change: -10, expected_units_in_stock: 9 }))
    expect(p.slug).toBe('insufficient-stock')
    expect(p.extensions).toEqual({ productIds: [7], unitsAvailable: [9] })
  })
})

describe('StockAdjustmentRequest', () => {
  const ok = { change: 12, reason: 'delivery received', expected_units_in_stock: 8 }

  it('accepts a whole-number change with a reason, and the optional large-change confirmation', () => {
    expect(StockAdjustmentRequest.safeParse(ok).success).toBe(true)
    expect(StockAdjustmentRequest.safeParse({ ...ok, confirm_large_change: true }).success).toBe(true)
  })

  it.each([
    ['a zero change', { ...ok, change: 0 }],
    ['a fractional change', { ...ok, change: 1.5 }],
    ['a blank reason', { ...ok, reason: '   ' }],
    ['a reason over 200 characters', { ...ok, reason: 'x'.repeat(201) }],
    ['a negative expected count', { ...ok, expected_units_in_stock: -1 }],
    ['a missing expected count', { change: 12, reason: 'delivery received' }],
    ['an unknown field', { ...ok, actor_id: 1 }],
  ])('refuses %s', (_name, body) => {
    expect(StockAdjustmentRequest.safeParse(body).success).toBe(false)
  })
})
