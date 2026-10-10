// BE-10 PaymentService split and BE-11 PaymentGateway stub (lld.md §2, SEAM-3).
import { afterEach, describe, expect, it } from 'vitest'
import { charge } from '../../server/services/payment-gateway'
import { computeSplit } from '../../server/services/payments'

describe('computeSplit: the order split in whole cents (FR-010 to FR-013)', () => {
  it('AE-009: $60.00 paid for $30.00 of items -> fee $0.45, payout $29.55', () => {
    const r = computeSplit([
      { quantity: 2, heldUnitPriceCents: 1800, unitCostCents: 900 },
      { quantity: 1, heldUnitPriceCents: 2400, unitCostCents: 1200 },
    ])
    expect(r.split).toEqual({ amountPaidCents: 6000, itemCostCents: 3000, platformFeeCents: 45, providerPayoutCents: 2955 })
    expect(r.feeSharesCents.reduce((a, b) => a + b, 0)).toBe(45)
    expect(r.feeSharesCents).toEqual([27, 18])
  })
  it('AE-010: $33.34 -> fee $0.25, rounded once per order', () => {
    const r = computeSplit([{ quantity: 1, heldUnitPriceCents: 3334, unitCostCents: 1500 }])
    expect(r.split).toMatchObject({ platformFeeCents: 25, providerPayoutCents: 1809 })
  })
  it('AE-011: $14.00 with $10.00 cost -> fee $0.11 (half-up), payout $3.89', () => {
    const r = computeSplit([{ quantity: 1, heldUnitPriceCents: 1400, unitCostCents: 1000 }])
    expect(r.split).toEqual({ amountPaidCents: 1400, itemCostCents: 1000, platformFeeCents: 11, providerPayoutCents: 389 })
    expect(r.feeSharesCents).toEqual([11])
  })
  it('the fee is taken once on the order total, not per line (three $1.00 lines: fee $0.02, shares sum to it)', () => {
    const line = { quantity: 1, heldUnitPriceCents: 100, unitCostCents: 50 }
    const r = computeSplit([line, line, line])
    expect(r.split.platformFeeCents).toBe(2)
    expect(r.feeSharesCents).toEqual([1, 1, 0])
  })
  it('a line without a held price is refused (INV-8: pay only held prices)', () => {
    expect(() => computeSplit([{ quantity: 1, heldUnitPriceCents: null, unitCostCents: 50 }])).toThrow()
  })
})

describe('PaymentGateway stub answers by PAYMENT_STUB_MODE (SEAM-3)', () => {
  const req = { orderId: 1001n, amountCents: 6000, idempotencyKey: 'k' }
  const saved = process.env.PAYMENT_STUB_MODE
  afterEach(() => {
    if (saved === undefined) delete process.env.PAYMENT_STUB_MODE
    else process.env.PAYMENT_STUB_MODE = saved
  })
  it('succeed', async () => {
    process.env.PAYMENT_STUB_MODE = 'succeed'
    expect(await charge(req)).toEqual({ outcome: 'succeeded' })
  })
  it('decline', async () => {
    process.env.PAYMENT_STUB_MODE = 'decline'
    expect(await charge(req)).toEqual({ outcome: 'failed', reason: 'declined' })
  })
  it('no_answer', async () => {
    process.env.PAYMENT_STUB_MODE = 'no_answer'
    expect(await charge(req)).toEqual({ outcome: 'failed', reason: 'no_answer' })
  })
  it('unset means succeed; an unknown mode is a configuration error', async () => {
    delete process.env.PAYMENT_STUB_MODE
    expect(await charge(req)).toEqual({ outcome: 'succeeded' })
    process.env.PAYMENT_STUB_MODE = 'maybe'
    await expect(charge(req)).rejects.toThrow(/PAYMENT_STUB_MODE/)
  })
})
