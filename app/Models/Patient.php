<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['provider_id', 'name', 'email', 'shipping_address'])]
class Patient extends Model
{
    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }
}
