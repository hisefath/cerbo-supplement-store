<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\ChargeResult;
use App\Payments\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Patient payment in three steps: reserve (DB txn) → charge (no txn) → settle (DB txn).
 * No DB transaction or row lock is ever held across the call to the payment processor.
 */
final class CheckoutService
{
    public function __construct(private PaymentGateway $gateway) {}

    /** @throws OrderException */
    public function pay(Order $order, string $paymentMethod, string $idempotencyKey): Payment
    {
        $payment = $this->reserve($order->id, $idempotencyKey);
        if (! $payment->wasRecentlyCreated) {
            return $payment; // same key → same outcome; never a second charge
        }

        // ponytail: if this throws (timeout), the payment stays pending and the order stays processing.
        // `ledger:verify` flags it; the fix is a reconcile job that asks the gateway by idempotency key.
        $result = $this->gateway->charge($payment->amount_cents, $paymentMethod, $idempotencyKey);

        return $this->settle($payment, $result);
    }

    /** Returns this attempt's payment: new (wasRecentlyCreated) or the stored one for a replayed key. */
    private function reserve(int $orderId, string $key): Payment
    {
        return DB::transaction(function () use ($orderId, $key) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();

            if ($existing = Payment::where('idempotency_key', $key)->first()) {
                if ($existing->order_id !== $order->id) {
                    throw new OrderException('Invalid payment attempt.');
                }

                return $existing;
            }
            if ($order->status !== Order::AWAITING_PAYMENT) {
                throw new OrderException(match ($order->status) {
                    Order::PAID => 'This order has already been paid.',
                    Order::CANCELLED => 'This order was cancelled by your provider.',
                    default => 'A payment for this order is already in progress.',
                });
            }

            // Reserve stock: conditional decrement can't oversell; any failure rolls back every line.
            // Products are locked in ascending id order (here and in release) so two checkouts can't deadlock.
            foreach ($order->lines()->with('product')->orderBy('product_id')->get() as $line) {
                if (! $line->product->adjustStock(-$line->quantity, 'reserve', 'checkout', $order->id)) {
                    throw new OrderException("Sorry, {$line->product->name} is out of stock. You have not been charged.");
                }
            }

            $payment = $order->payments()->create([
                'idempotency_key' => $key,
                'amount_cents' => $order->subtotal_cents,
                'status' => Payment::PENDING,
            ]);
            $order->update(['status' => Order::PROCESSING]);

            return $payment;
        });
    }

    private function settle(Payment $attempt, ChargeResult $result): Payment
    {
        return DB::transaction(function () use ($attempt, $result) {
            // Lock order: the order row first (as in reserve), then this payment, then products by ascending id.
            $order = Order::whereKey($attempt->order_id)->lockForUpdate()->firstOrFail();
            $payment = Payment::whereKey($attempt->id)->lockForUpdate()->firstOrFail();

            if ($payment->status !== Payment::PENDING) {
                return $payment; // already settled elsewhere (e.g. a future reconcile job)
            }

            if ($result->succeeded) {
                $payment->update(['status' => Payment::SUCCEEDED, 'gateway_ref' => $result->reference]);
                $order->update(['status' => Order::PAID, 'paid_at' => now()]);
                Ledger::postPayment($order, $payment);
                // Fulfillment seam: hand off to a 3PL / shipping queue here.
                Log::info('fulfillment.stub: would ship order', ['order_id' => $order->id]);

                return $payment;
            }

            $payment->update([
                'status' => Payment::FAILED,
                'gateway_ref' => $result->reference,
                'failure_reason' => $result->failureReason,
            ]);
            foreach ($order->lines()->with('product')->orderBy('product_id')->get() as $line) {
                $line->product->adjustStock($line->quantity, 'release', 'checkout', $order->id);
            }
            $order->update(['status' => Order::AWAITING_PAYMENT]);

            return $payment;
        });
    }
}
