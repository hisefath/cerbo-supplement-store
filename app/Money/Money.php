<?php

namespace App\Money;

/** USD cents <-> strings. Never touches floats. */
final class Money
{
    /** "24.99", "$24.9", "24" → cents; anything else → null. Max $99,999.99. */
    public static function toCents(string $input): ?int
    {
        if (! preg_match('/^\$?(\d{1,5})(?:\.(\d{1,2}))?$/', trim($input), $m)) {
            return null;
        }

        return (int) $m[1] * 100 + (int) str_pad($m[2] ?? '0', 2, '0');
    }

    public static function format(int $cents): string
    {
        $abs = abs($cents);

        return ($cents < 0 ? '-' : '').'$'.number_format(intdiv($abs, 100)).'.'.str_pad((string) ($abs % 100), 2, '0', STR_PAD_LEFT);
    }

    /** Cents → "24.99" for form inputs. */
    public static function plain(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
