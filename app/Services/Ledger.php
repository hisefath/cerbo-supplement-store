<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\LedgerEntry;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use LogicException;

/** Settlement ledger: where every cent of a patient payment went. Debits +, credits −. */
final class Ledger
{
    public static function postPayment(Order $order, Payment $payment): void
    {
        $entries = [
            LedgerEntry::CLEARING => $payment->amount_cents,              // cash in, via the processor
            LedgerEntry::COGS => -$order->cogs_cents,                     // platform recovers item cost
            LedgerEntry::PROVIDER_PAYABLE => -$order->provider_payout_cents, // owed to the provider
            LedgerEntry::FEE_REVENUE => -$order->fee_cents,               // our 75 bps
        ];
        if (array_sum($entries) !== 0) {
            throw new LogicException("Refusing unbalanced ledger posting for order {$order->id}.");
        }
        foreach ($entries as $account => $amount) {
            LedgerEntry::create([
                'order_id' => $order->id, 'payment_id' => $payment->id,
                'account' => $account, 'amount_cents' => $amount,
            ]);
        }
    }

    /**
     * Audit one order. Returns check description => passed. Paid orders get the payment and
     * ledger checks too.
     *
     * @return array<string, bool>
     */
    public static function audit(Order $order): array
    {
        $s = $order->storedSplit();
        $r = $order->recomputedSplit();
        $checks = [
            'Stored split balances: subtotal = COGS + fee + payout' => $s['subtotal'] === $s['cogs'] + $s['fee'] + $s['payout'],
            'Stored split equals a recomputation from the line snapshots' => [$r->subtotal, $r->cogs, $r->fee, $r->payout] === array_values($s),
        ];
        if ($order->status !== Order::PAID) {
            return $checks + ['No ledger entries before payment' => $order->ledgerEntries->isEmpty()];
        }

        $succeeded = $order->payments->where('status', Payment::SUCCEEDED);
        $actual = $order->ledgerEntries->groupBy('account')->map(fn ($e) => (int) $e->sum('amount_cents'))->sortKeys()->all();
        $expected = collect([
            LedgerEntry::CLEARING => $s['subtotal'],
            LedgerEntry::COGS => -$s['cogs'],
            LedgerEntry::PROVIDER_PAYABLE => -$s['payout'],
            LedgerEntry::FEE_REVENUE => -$s['fee'],
        ])->sortKeys()->all();

        return $checks + [
            'Exactly one succeeded payment, for the order subtotal' => $succeeded->count() === 1 && $succeeded->first()->amount_cents === $s['subtotal'],
            'Ledger entries sum to zero' => (int) $order->ledgerEntries->sum('amount_cents') === 0,
            'Ledger matches the stored split, account by account' => $actual === $expected,
        ];
    }

    /** Re-check everything. Returns human-readable failures; empty means the books reconcile. */
    public static function verifyAll(): array
    {
        $failures = [];

        Order::with(['lines', 'payments', 'ledgerEntries'])->chunkById(200, function ($orders) use (&$failures) {
            foreach ($orders as $order) {
                foreach (self::audit($order) as $check => $ok) {
                    if (! $ok) {
                        $failures[] = "Order #{$order->id}: {$check} FAILED";
                    }
                }
            }
        });

        if (($total = (int) LedgerEntry::sum('amount_cents')) !== 0) {
            $failures[] = "Whole ledger sums to {$total}, not 0";
        }

        $stockFromMovements = InventoryMovement::groupBy('product_id')
            ->selectRaw('product_id, SUM(delta) AS total')->pluck('total', 'product_id');
        foreach (Product::all() as $p) {
            $expected = (int) ($stockFromMovements[$p->id] ?? 0);
            if ($p->stock_on_hand !== $expected) {
                $failures[] = "Product {$p->sku}: stock_on_hand {$p->stock_on_hand} ≠ Σ movements {$expected}";
            }
        }

        foreach (Payment::where('status', Payment::PENDING)->where('created_at', '<', now()->subMinutes(15))->get() as $p) {
            $failures[] = "Payment #{$p->id} (order #{$p->order_id}) pending > 15 min: reconcile with the gateway";
        }

        return $failures;
    }
}
