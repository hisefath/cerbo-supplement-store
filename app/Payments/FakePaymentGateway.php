<?php

namespace App\Payments;

/**
 * Stub processor. Approves everything except the decline test method, mirroring how Stripe test
 * payment methods work. Deterministic reference per idempotency key, like a real processor's replay.
 */
final class FakePaymentGateway implements PaymentGateway
{
    public const APPROVE = 'pm_fake_visa';

    public const DECLINE = 'pm_fake_declined';

    public function charge(int $amountCents, string $paymentMethod, string $idempotencyKey): ChargeResult
    {
        $reference = 'fake_ch_'.substr(hash('sha256', $idempotencyKey), 0, 16);

        return $paymentMethod === self::DECLINE
            ? new ChargeResult(false, $reference, 'card_declined')
            : new ChargeResult(true, $reference);
    }
}
