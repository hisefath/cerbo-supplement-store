<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Store schema. All money is integer cents (bigInteger). Money tables never cascade-delete.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('providers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->timestamps();
        });

        Schema::create('patients', function (Blueprint $t) {
            $t->id();
            $t->foreignId('provider_id')->constrained();
            $t->string('name');
            $t->string('email');
            $t->string('shipping_address');
            $t->timestamps();
        });

        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->string('sku')->unique();
            $t->string('name');
            $t->bigInteger('unit_cost_cents');   // COGS: what the platform paid; platform keeps this
            $t->bigInteger('msrp_cents');        // suggested patient price (default in the order form)
            $t->integer('stock_on_hand')->default(0);
            $t->timestamps();
        });

        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('provider_id')->constrained();
            $t->foreignId('patient_id')->constrained();
            $t->string('status', 20)->index();   // awaiting_payment | processing | paid | cancelled
            $t->string('checkout_token', 64)->unique();
            // Split snapshot taken when the order is sent (the provider's locked quote).
            $t->integer('fee_bps');
            $t->bigInteger('subtotal_cents');
            $t->bigInteger('cogs_cents');
            $t->bigInteger('fee_cents');
            $t->bigInteger('provider_payout_cents');
            $t->timestamp('sent_at');
            $t->timestamp('paid_at')->nullable()->index();
            $t->timestamps();
        });

        Schema::create('order_lines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained();
            $t->foreignId('product_id')->constrained();
            $t->integer('quantity');
            $t->bigInteger('unit_price_cents');  // snapshot: patient-facing price set by provider
            $t->bigInteger('unit_cost_cents');   // snapshot: COGS at send time
            $t->timestamps();
            $t->unique(['order_id', 'product_id']);
        });

        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained();
            $t->string('idempotency_key', 64)->unique();
            $t->bigInteger('amount_cents');
            $t->string('status', 20);            // pending | succeeded | failed
            $t->string('gateway_ref')->nullable();
            $t->string('failure_reason')->nullable();
            $t->timestamps();
        });
        // At most one in-flight or successful payment per order, enforced by the database.
        DB::statement("CREATE UNIQUE INDEX payments_one_live_per_order ON payments (order_id) WHERE status IN ('pending', 'succeeded')");

        Schema::create('ledger_entries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained();
            $t->foreignId('payment_id')->constrained();
            $t->string('account', 40)->index();  // processor_clearing | inventory_cogs | provider_payable | platform_fee_revenue
            $t->bigInteger('amount_cents');      // debit +, credit −; entries for one payment sum to 0
            $t->timestamp('created_at')->useCurrent();
            $t->unique(['payment_id', 'account']); // a payment can be posted at most once
        });

        Schema::create('inventory_movements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('product_id')->constrained();
            $t->foreignId('order_id')->nullable()->constrained();
            $t->integer('delta');                // signed; stock_on_hand always equals Σ delta
            $t->string('reason', 20);            // restock | adjustment | reserve | release
            $t->string('actor');
            $t->string('note')->nullable();
            $t->timestamp('created_at')->useCurrent();
        });

        // Defense in depth on the production engine. Laravel's schema builder has no CHECK
        // support and SQLite can't add constraints after CREATE, so SQLite (dev/tests) relies on
        // the code-level guards plus `ledger:verify`.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock_on_hand >= 0)');
            DB::statement('ALTER TABLE products ADD CONSTRAINT products_cost_non_negative CHECK (unit_cost_cents >= 0)');
            DB::statement('ALTER TABLE order_lines ADD CONSTRAINT order_lines_positive CHECK (quantity > 0 AND unit_price_cents >= 0 AND unit_cost_cents >= 0)');
            DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_split_balances CHECK (subtotal_cents = cogs_cents + fee_cents + provider_payout_cents)');
            DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_split_non_negative CHECK (cogs_cents >= 0 AND fee_cents >= 0 AND provider_payout_cents >= 0)');
            DB::statement('ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount_cents > 0)');
        }
    }

    public function down(): void
    {
        foreach (['inventory_movements', 'ledger_entries', 'payments', 'order_lines', 'orders', 'products', 'patients', 'providers'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
