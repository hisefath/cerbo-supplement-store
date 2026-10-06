<?php

namespace App\Payments;

final readonly class ChargeResult
{
    public function __construct(
        public bool $succeeded,
        public string $reference,
        public ?string $failureReason = null,
    ) {}
}
