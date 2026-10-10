// BE-6 Money (lld.md §2): every money calculation in whole cents with one rounding rule. Pure, no I/O.
// Also imported by the order builder (FE-4) so its live totals use the same rule.

export interface Split {
  amountPaidCents: number
  itemCostCents: number
  providerPayoutCents: number
  platformFeeCents: number
}

export class SplitMismatch extends Error {
  constructor(public readonly split: Split) {
    super('split does not balance')
  }
}

/** 0.75% of the amount, rounded half-up once: (amount × 75 + 5000) ÷ 10000, floored (FR-011). */
export function platformFeeCents(amountPaidCents: number): number {
  return Math.floor((amountPaidCents * 75 + 5000) / 10000)
}

/** amount − cost − fee (FR-012). May be negative; callers check the floor. */
export function payoutCents(amountPaidCents: number, itemCostCents: number, feeCents: number): number {
  return amountPaidCents - itemCostCents - feeCents
}

/** Each line's share of the order's one fee, proportional; leftover cents go to the largest remainders, ties to the
 *  earlier line. Sums to feeCents exactly (FR-028, Q-2). */
export function allocateFee(lineAmountsCents: number[], feeCents: number): number[] {
  const total = lineAmountsCents.reduce((a, b) => a + b, 0)
  if (total === 0) return lineAmountsCents.map(() => 0)
  const shares = lineAmountsCents.map((a) => Math.floor((a * feeCents) / total))
  let left = feeCents - shares.reduce((a, b) => a + b, 0)
  const order = lineAmountsCents
    .map((a, i) => ({ i, rem: (a * feeCents) % total }))
    .sort((x, y) => y.rem - x.rem || x.i - y.i)
  for (const { i } of order) {
    if (left <= 0) break
    shares[i] = shares[i]! + 1
    left -= 1
  }
  return shares
}

/** Cost plus a 50% margin of the price, i.e. 2 × cost (FR-017). */
export function defaultPriceCents(unitCostCents: number): number {
  return unitCostCents * 2
}

/** cost ÷ (1 − margin), rounded half-up to a cent (FR-018). Margin in basis points (5000 = 50%). */
export function priceFromMargin(unitCostCents: number, marginBasisPoints: number): number {
  const d = 10000 - marginBasisPoints
  return Math.floor((2 * unitCostCents * 10000 + d) / (2 * d))
}

/** The smallest price whose payout on one unit after its fee is ≥ 0 (FR-020). */
export function lowestAllowedPriceCents(unitCostCents: number): number {
  let p = unitCostCents
  while (payoutCents(p, unitCostCents, platformFeeCents(p)) < 0) p += 1
  return p
}

/** The products that make an order's payout after its fee fall below $0.00 (FR-004): each one priced below its
 *  floor. When every product is at or above its floor but the one order fee still rounds the payout below $0.00
 *  (e.g. 2 x 66c at a 66c cost: fee 1c), every product is named, since no single one is at fault. */
export function belowFloorProductIds<T>(lines: { id: T; unitPriceCents: number; unitCostCents: number; quantity: number }[]): T[] {
  const below = lines.filter((l) => l.unitPriceCents < lowestAllowedPriceCents(l.unitCostCents)).map((l) => l.id)
  if (below.length > 0) return below
  const total = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0)
  const cost = lines.reduce((s, l) => s + l.unitCostCents * l.quantity, 0)
  return payoutCents(total, cost, platformFeeCents(total)) < 0 ? lines.map((l) => l.id) : []
}

/** The unit cost behind a lowest allowed price: the payout at the floor is exactly $0.00, because the payout grows
 *  by at most one cent per cent of price. Lets the order builder show the payout live from the Catalog (SEQ-1 step 5),
 *  which carries the floor but not the cost. */
export function unitCostFromLowestAllowedPrice(lowestAllowedCents: number): number {
  return lowestAllowedCents - platformFeeCents(lowestAllowedCents)
}

/** Refuses a split that is not whole cents or does not add up (FR-013). */
export function assertSplitBalances(split: Split): void {
  const parts = [split.amountPaidCents, split.itemCostCents, split.providerPayoutCents, split.platformFeeCents]
  if (
    !parts.every(Number.isInteger) ||
    split.amountPaidCents !== split.itemCostCents + split.providerPayoutCents + split.platformFeeCents
  ) {
    throw new SplitMismatch(split)
  }
}
