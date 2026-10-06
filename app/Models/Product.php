<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

#[Fillable(['sku', 'name', 'unit_cost_cents', 'msrp_cents', 'stock_on_hand'])]
class Product extends Model
{
    /**
     * The only way stock changes: one atomic relative UPDATE plus an audit movement, in one
     * transaction. A decrement is conditional, so stock can never go below zero (returns false).
     * Invariant checked by `ledger:verify`: stock_on_hand == Σ movements.delta.
     */
    public function adjustStock(int $delta, string $reason, string $actor, ?int $orderId = null, ?string $note = null): bool
    {
        return DB::transaction(function () use ($delta, $reason, $actor, $orderId, $note) {
            $query = self::whereKey($this->id);
            $changed = $delta >= 0
                ? $query->increment('stock_on_hand', $delta)
                : $query->where('stock_on_hand', '>=', -$delta)->decrement('stock_on_hand', -$delta);
            if (! $changed) {
                return false;
            }
            InventoryMovement::create([
                'product_id' => $this->id, 'order_id' => $orderId, 'delta' => $delta,
                'reason' => $reason, 'actor' => $actor, 'note' => $note,
            ]);

            return true;
        });
    }
}
