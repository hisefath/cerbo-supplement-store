<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use LogicException;

/**
 * Append-only. Corrections are new reversing entries, never edits.
 * ponytail: model-level guard only (query-builder writes bypass it); in prod revoke UPDATE/DELETE on this table from the app's DB role.
 */
#[Fillable(['order_id', 'payment_id', 'account', 'amount_cents'])]
class LedgerEntry extends Model
{
    public const CLEARING = 'processor_clearing';

    public const COGS = 'inventory_cogs';

    public const PROVIDER_PAYABLE = 'provider_payable';

    public const FEE_REVENUE = 'platform_fee_revenue';

    public const UPDATED_AT = null;

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Ledger entries are append-only.'));
        static::deleting(fn () => throw new LogicException('Ledger entries are append-only.'));
    }
}
