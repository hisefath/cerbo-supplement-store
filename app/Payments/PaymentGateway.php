<?php

namespace App\Payments;

/**
 * Seam for the payment processor. The real adapter would be Stripe: a PaymentIntent created with
 * this idempotency key, so a retried call can never charge twice.
 */
interface PaymentGateway
{
    public function charge(int $amountCents, string $paymentMethod, string $idempotencyKey): ChargeResult;
}
