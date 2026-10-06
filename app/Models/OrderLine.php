<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/** Snapshot of price and cost at send. Immutable: the order's split and ledger are derived from it. */
#[Fillable(['order_id', 'product_id', 'quantity', 'unit_price_cents', 'unit_cost_cents'])]
class OrderLine extends Model
{
    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Order lines are immutable once sent.'));
        static::deleting(fn () => throw new LogicException('Order lines are immutable once sent.'));
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function lineTotal(): int
    {
        return $this->quantity * $this->unit_price_cents;
    }

    public function lineCost(): int
    {
        return $this->quantity * $this->unit_cost_cents;
    }
}
