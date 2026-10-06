<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Idempotency key of the "send order" form submit, so a double-click can't create two payable orders. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            // Nullable only for orders sent before this column existed; the app always sets it.
            $t->string('request_key', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropUnique(['request_key']);
            $t->dropColumn('request_key');
        });
    }
};
