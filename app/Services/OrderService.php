<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Patient;
use App\Models\Product;
use App\Models\Provider;
use App\Money\Money;
use App\Money\Split;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class OrderService
{
    /** 75 basis points = 0.75% of the order subtotal. Snapshotted onto each order as fee_bps. */
    public const PLATFORM_FEE_BPS = 75;

    /**
     * Price a cart against the live catalog without writing anything. Used by both the live
     * preview and send(), so the provider sees exactly the numbers that will be persisted.
     *
     * @param  list<array{product_id:int, quantity:int, unit_price_cents:int}>  $items
     * @return array{lines: list<array>, split: Split}
     *
     * @throws ValidationException
     */
    public function quote(array $items): array
    {
        $products = Product::whereIn('id', array_column($items, 'product_id'))->get()->keyBy('id');
        $lines = [];
        $errors = [];

        foreach ($items as $item) {
            $product = $products[$item['product_id']] ?? null;
            if (! $product) {
                $errors["lines.{$item['product_id']}.quantity"] = 'Unknown product.';

                continue;
            }
            if ($item['quantity'] > $product->stock_on_hand) {
                // Advisory only: stock is actually reserved at payment.
                $errors["lines.{$product->id}.quantity"] = "{$product->name}: only {$product->stock_on_hand} in stock.";
            }
            if ($item['unit_price_cents'] < $product->unit_cost_cents) {
                $errors["lines.{$product->id}.price"] = "{$product->name}: price can't be below cost (".Money::format($product->unit_cost_cents).').';
            }
            $lines[] = [
                'product_id' => $product->id,
                'quantity' => $item['quantity'],
                'unit_price_cents' => $item['unit_price_cents'],
                'unit_cost_cents' => $product->unit_cost_cents,   // snapshot of COGS
            ];
        }

        if (! $lines && ! $errors) {
            $errors['lines'] = 'Add at least one supplement (quantity of 1 or more).';
        }
        $split = Split::of($lines, self::PLATFORM_FEE_BPS);
        if (! $errors && $split->payout < 0) {
            $errors['lines'] = 'Prices must cover cost plus the platform fee; your payout would be '.Money::format($split->payout).'.';
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return ['lines' => $lines, 'split' => $split];
    }

    /**
     * Lock the quote onto a new order and send the patient a payment link. Idempotent on
     * $requestKey (minted per form render), so a double-submitted form can't create two
     * orders, and two payable links, for the same patient.
     */
    public function send(Provider $provider, Patient $patient, array $items, string $requestKey): Order
    {
        $existing = fn () => Order::where('request_key', $requestKey)->where('provider_id', $provider->id)->firstOrFail();
        if (Order::where('request_key', $requestKey)->exists()) {
            return $existing();
        }

        try {
            $order = $this->createOrder($provider, $patient, $items, $requestKey);
        } catch (UniqueConstraintViolationException) {
            return $existing(); // the concurrent twin of this submit won the race
        }

        // Email seam: MAIL_MAILER=log writes this to storage/logs; swap the driver for SES/Postmark.
        Mail::raw(
            "{$provider->name} recommended supplements for you. Review and pay here: ".route('checkout.show', $order->checkout_token),
            fn ($m) => $m->to($patient->email)->subject("Your supplement order from {$provider->name}"),
        );

        return $order;
    }

    private function createOrder(Provider $provider, Patient $patient, array $items, string $requestKey): Order
    {
        return DB::transaction(function () use ($provider, $patient, $items, $requestKey) {
            ['lines' => $lines, 'split' => $split] = $this->quote($items);

            $order = Order::create([
                'request_key' => $requestKey,
                'provider_id' => $provider->id,
                'patient_id' => $patient->id,
                'status' => Order::AWAITING_PAYMENT,
                'checkout_token' => Str::random(40),   // capability URL for the patient (~238 bits)
                'fee_bps' => $split->feeBps,
                'subtotal_cents' => $split->subtotal,
                'cogs_cents' => $split->cogs,
                'fee_cents' => $split->fee,
                'provider_payout_cents' => $split->payout,
                'sent_at' => now(),
            ]);
            $order->lines()->createMany($lines);

            return $order;
        });
    }

    /** Withdraw an unpaid order. Same row lock as checkout, so cancel and pay can't both win. */
    public function cancel(int $orderId): void
    {
        DB::transaction(function () use ($orderId) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            if ($order->status !== Order::AWAITING_PAYMENT) {
                throw new OrderException('Only orders awaiting payment can be cancelled; this one is '.str_replace('_', ' ', $order->status).'.');
            }
            $order->update(['status' => Order::CANCELLED]);
        });
    }
}
