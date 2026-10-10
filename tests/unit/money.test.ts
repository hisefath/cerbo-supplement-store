// BE-6 Money (lld.md §2): whole cents, one rounding rule.
import { describe, expect, it } from 'vitest'
import {
  allocateFee,
  assertSplitBalances,
  defaultPriceCents,
  lowestAllowedPriceCents,
  payoutCents,
  platformFeeCents,
  priceFromMargin,
  SplitMismatch,
  unitCostFromLowestAllowedPrice,
} from '../../server/services/money'

describe('platformFeeCents: 0.75% rounded half-up once', () => {
  it('AE-001: $60.00 -> $0.45', () => expect(platformFeeCents(6000)).toBe(45))
  it('triangulation: $90.00 -> $0.68 (67.5 rounds up)', () => expect(platformFeeCents(9000)).toBe(68))
  it('$12.09 -> $0.09', () => expect(platformFeeCents(1209)).toBe(9))
  it('zero and tiny amounts', () => {
    expect(platformFeeCents(0)).toBe(0)
    expect(platformFeeCents(66)).toBe(0) // 0.495 -> 0
    expect(platformFeeCents(67)).toBe(1) // 0.5025 -> 1
  })
  it('exact half rounds up: 200 cents -> 1.5 -> 2', () => expect(platformFeeCents(200)).toBe(2))
})

describe('payoutCents', () => {
  it('AE-001: 6000 - 3000 - 45 = 2955', () => expect(payoutCents(6000, 3000, 45)).toBe(2955))
  it('can be negative (the caller checks the floor)', () => expect(payoutCents(1208, 1200, 9)).toBe(-1))
})

describe('defaultPriceCents: cost plus a 50% margin = 2 x cost (FR-017)', () => {
  it('AE-015: $15.00 -> $30.00', () => expect(defaultPriceCents(1500)).toBe(3000))
  it('$9.00 -> $18.00', () => expect(defaultPriceCents(900)).toBe(1800))
})

describe('lowestAllowedPriceCents: smallest price with payout >= 0 after the fee (FR-020)', () => {
  it('cost $12.00 -> $12.09', () => expect(lowestAllowedPriceCents(1200)).toBe(1209))
  it('the floor really is the smallest', () => {
    for (const cost of [1, 99, 900, 1200, 1500, 12345]) {
      const p = lowestAllowedPriceCents(cost)
      expect(payoutCents(p, cost, platformFeeCents(p))).toBeGreaterThanOrEqual(0)
      expect(payoutCents(p - 1, cost, platformFeeCents(p - 1))).toBeLessThan(0)
    }
  })
})

describe('priceFromMargin: cost / (1 - margin), half-up to a cent', () => {
  it('50% of $15.00 -> $30.00', () => expect(priceFromMargin(1500, 5000)).toBe(3000))
  it('rounds half-up: 1 cent at 33.33% -> 1.4999 -> 1', () => expect(priceFromMargin(1, 3333)).toBe(1))
  it('100 cents at 40% -> 166.67 -> 167', () => expect(priceFromMargin(100, 4000)).toBe(167))
})

describe('allocateFee: proportional shares that sum to the fee exactly', () => {
  it('AE-001 lines 3600 and 2400 share 45 as 27 and 18', () => expect(allocateFee([3600, 2400], 45)).toEqual([27, 18]))
  it('leftover cents go to the largest remainders, ties to the earlier line', () => {
    expect(allocateFee([100, 100, 100], 2)).toEqual([1, 1, 0])
    const shares = allocateFee([3333, 3333, 3334], 10)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10)
  })
  it('a zero fee or no amount gives zeros', () => {
    expect(allocateFee([500, 700], 0)).toEqual([0, 0])
    expect(allocateFee([0, 0], 0)).toEqual([0, 0])
  })
})

describe('assertSplitBalances (FR-013)', () => {
  it('passes when amount = cost + payout + fee', () =>
    expect(() =>
      assertSplitBalances({ amountPaidCents: 6000, itemCostCents: 3000, providerPayoutCents: 2955, platformFeeCents: 45 }),
    ).not.toThrow())
  it('throws SplitMismatch when it does not add up', () =>
    expect(() =>
      assertSplitBalances({ amountPaidCents: 6000, itemCostCents: 3000, providerPayoutCents: 2956, platformFeeCents: 45 }),
    ).toThrow(SplitMismatch))
  it('throws on a non-integer amount', () =>
    expect(() =>
      assertSplitBalances({ amountPaidCents: 60.5, itemCostCents: 30, providerPayoutCents: 30, platformFeeCents: 0.5 }),
    ).toThrow(SplitMismatch))
})

describe('unitCostFromLowestAllowedPrice: inverts lowestAllowedPriceCents exactly', () => {
  it('cost $12.00 <- floor $12.09', () => expect(unitCostFromLowestAllowedPrice(1209)).toBe(1200))
  it('round-trips every cost from 1 cent to $200.00', () => {
    for (let cost = 1; cost <= 20000; cost++) {
      if (unitCostFromLowestAllowedPrice(lowestAllowedPriceCents(cost)) !== cost) throw new Error(`cost ${cost}`)
    }
  })
})
