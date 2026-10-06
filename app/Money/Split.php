<?php

namespace App\Money;

use InvalidArgumentException;

/**
 * The money split for one order. Integer cents only.
 *
 *   subtotal = Σ qty × unit_price      (what the patient pays: GMV)
 *   cogs     = Σ qty × unit_cost       (platform keeps: it owns the inventory)
 *   fee      = subtotal × bps / 10000, rounded half-up, once per order
 *   payout   = subtotal − cogs − fee   (provider margin net of fee; the residual, so
 *                                       subtotal == cogs + fee + payout holds exactly)
 */
final readonly class Split
{
    private function __construct(
        public int $subtotal,
        public int $cogs,
        public int $fee,
        public int $payout,
        public int $feeBps,
    ) {}

    /** @param iterable<array{quantity:int, unit_price_cents:int, unit_cost_cents:int}|\ArrayAccess> $lines */
    public static function of(iterable $lines, int $feeBps): self
    {
        $subtotal = $cogs = 0;
        foreach ($lines as $line) {
            [$qty, $price, $cost] = [$line['quantity'], $line['unit_price_cents'], $line['unit_cost_cents']];
            if ($qty < 0 || $price < 0 || $cost < 0 || $feeBps < 0) {
                throw new InvalidArgumentException('Quantities, prices, costs and fee rate must be non-negative.');
            }
            $subtotal += $qty * $price;
            $cogs += $qty * $cost;
        }
        $fee = intdiv($subtotal * $feeBps + 5000, 10000); // half-up; exact because both are non-negative ints

        return new self($subtotal, $cogs, $fee, $subtotal - $cogs - $fee, $feeBps);
    }

    /** Provider margin before the platform fee. */
    public function grossMargin(): int
    {
        return $this->subtotal - $this->cogs;
    }
}
