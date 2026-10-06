<?php

namespace Tests\Unit;

use App\Money\Money;
use App\Money\Split;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class SplitTest extends TestCase
{
    private static function line(int $qty, int $price, int $cost): array
    {
        return ['quantity' => $qty, 'unit_price_cents' => $price, 'unit_cost_cents' => $cost];
    }

    public function test_worked_example_from_prd(): void
    {
        $split = Split::of([self::line(2, 2400, 1200), self::line(1, 1599, 850)], 75);

        $this->assertSame(6399, $split->subtotal);
        $this->assertSame(3250, $split->cogs);
        $this->assertSame(48, $split->fee);       // 47.9925¢ rounds half-up to 48¢
        $this->assertSame(3101, $split->payout);
        $this->assertSame(3149, $split->grossMargin());
    }

    public function test_fee_rounds_half_up_at_exact_half_cent(): void
    {
        $this->assertSame(2, Split::of([self::line(1, 200, 0)], 75)->fee);  // 1.5¢   → 2¢
        $this->assertSame(1, Split::of([self::line(1, 199, 0)], 75)->fee);  // 1.4925¢ → 1¢
        $this->assertSame(0, Split::of([self::line(1, 66, 0)], 75)->fee);   // 0.495¢ → 0¢
    }

    public function test_invariant_holds_and_fee_matches_independent_oracle_for_random_carts(): void
    {
        mt_srand(42);
        for ($i = 0; $i < 5000; $i++) {
            $lines = [];
            for ($n = mt_rand(1, 6); $n > 0; $n--) {
                $cost = mt_rand(1, 20000);
                $lines[] = self::line(mt_rand(1, 100), $cost + mt_rand(0, 30000), $cost);
            }
            $s = Split::of($lines, 75);

            $this->assertSame($s->subtotal, $s->cogs + $s->fee + $s->payout);
            // Oracle: float round is safe here because subtotal*75/10000 is a multiple of 1/400,
            // so it is never within float error of a .5 boundary unless exactly on it.
            $this->assertSame((int) round($s->subtotal * 75 / 10000, 0, PHP_ROUND_HALF_UP), $s->fee);
        }
    }

    public function test_rejects_negative_inputs(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Split::of([self::line(-1, 100, 50)], 75);
    }

    public function test_parses_dollar_strings_to_cents_without_floats(): void
    {
        $this->assertSame(2499, Money::toCents('24.99'));
        $this->assertSame(2490, Money::toCents('24.9'));
        $this->assertSame(2400, Money::toCents('24'));
        $this->assertSame(2400, Money::toCents(' $24.00 '));
        $this->assertSame(1, Money::toCents('0.01'));
        foreach (['', '1e3', '-1', '24.999', 'abc', '24.', '.5', '1,000'] as $bad) {
            $this->assertNull(Money::toCents($bad), "should reject '$bad'");
        }
    }

    public function test_formats_cents(): void
    {
        $this->assertSame('$63.99', Money::format(6399));
        $this->assertSame('$0.05', Money::format(5));
        $this->assertSame('$1,234.56', Money::format(123456));
        $this->assertSame('-$0.48', Money::format(-48));
        $this->assertSame('24.05', Money::plain(2405));
        $this->assertSame('-0.48', Money::plain(-48));
    }
}
