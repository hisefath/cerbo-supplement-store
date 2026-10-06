<?php

namespace App\Models;

use App\Money\Split;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'provider_id', 'patient_id', 'status', 'checkout_token', 'fee_bps',
    'subtotal_cents', 'cogs_cents', 'fee_cents', 'provider_payout_cents', 'sent_at', 'paid_at',
])]
class Order extends Model
{
    public const AWAITING_PAYMENT = 'awaiting_payment';

    public const PROCESSING = 'processing';

    public const PAID = 'paid';

    public const CANCELLED = 'cancelled';

    protected function casts(): array
    {
        return ['sent_at' => 'datetime', 'paid_at' => 'datetime'];
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(OrderLine::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }

    public function inventoryMovements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    /** The split as persisted on the order (the locked quote). */
    public function storedSplit(): array
    {
        return [
            'subtotal' => $this->subtotal_cents,
            'cogs' => $this->cogs_cents,
            'fee' => $this->fee_cents,
            'payout' => $this->provider_payout_cents,
        ];
    }

    /** The split recomputed from the line snapshots (used to audit the stored one). */
    public function recomputedSplit(): Split
    {
        return Split::of($this->lines, $this->fee_bps);
    }
}
