<?php

namespace Tests\Feature;

use App\Models\InventoryMovement;
use App\Models\LedgerEntry;
use App\Models\Order;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Provider;
use App\Payments\ChargeResult;
use App\Payments\FakePaymentGateway;
use App\Payments\PaymentGateway;
use App\Services\Ledger;
use App\Services\OrderService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use LogicException;
use Tests\TestCase;

class OrderFlowTest extends TestCase
{
    use RefreshDatabase;

    private Provider $provider;

    private Patient $patient;

    private Product $mag;

    private Product $vitd;

    protected function setUp(): void
    {
        parent::setUp();
        $this->provider = Provider::create(['name' => 'Dr. Test', 'email' => 'dr@example.com']);
        $this->patient = Patient::create(['provider_id' => $this->provider->id, 'name' => 'Pat Ient', 'email' => 'pat@example.com', 'shipping_address' => '1 Main St, Austin, TX 78701']);
        $this->mag = Product::create(['sku' => 'MAG', 'name' => 'Magnesium', 'unit_cost_cents' => 1200, 'msrp_cents' => 2400]);
        $this->vitd = Product::create(['sku' => 'VITD', 'name' => 'Vitamin D', 'unit_cost_cents' => 850, 'msrp_cents' => 1599]);
        $this->mag->adjustStock(10, 'restock', 'test');
        $this->vitd->adjustStock(10, 'restock', 'test');
    }

    /** The PRD worked example: 2 × $24.00 magnesium + 1 × $15.99 vitamin D. */
    private function sendOrder(?array $lines = null): Order
    {
        $lines ??= [
            $this->mag->id => ['quantity' => 2, 'price' => '24.00'],
            $this->vitd->id => ['quantity' => 1, 'price' => '15.99'],
        ];
        $this->post('/orders', ['patient_id' => $this->patient->id, 'lines' => $lines])->assertSessionHasNoErrors();

        return Order::latest('id')->firstOrFail();
    }

    private function pay(Order $order, string $method = FakePaymentGateway::APPROVE, ?string $key = null): TestResponse
    {
        return $this->post("/pay/{$order->checkout_token}", [
            'idempotency_key' => $key ?? (string) Str::uuid(),
            'payment_method' => $method,
        ]);
    }

    private function spyGateway(): object
    {
        $spy = new class implements PaymentGateway
        {
            public int $calls = 0;

            public function charge(int $amountCents, string $paymentMethod, string $idempotencyKey): ChargeResult
            {
                $this->calls++;

                return (new FakePaymentGateway)->charge($amountCents, $paymentMethod, $idempotencyKey);
            }
        };
        $this->app->instance(PaymentGateway::class, $spy);

        return $spy;
    }

    private function stock(Product $product): int
    {
        return $product->fresh()->stock_on_hand;
    }

    private function assertBooksReconcile(): void
    {
        $this->assertSame([], Ledger::verifyAll());
        $this->assertSame(0, Artisan::call('ledger:verify'));
    }

    public function test_provider_sends_order_patient_pays_and_every_cent_is_recorded(): void
    {
        $order = $this->sendOrder();

        $this->assertSame(Order::AWAITING_PAYMENT, $order->status);
        $this->assertSame(['subtotal' => 6399, 'cogs' => 3250, 'fee' => 48, 'payout' => 3101], $order->storedSplit());
        $this->assertSame(75, $order->fee_bps);
        $this->assertSame([1200, 850], $order->lines->sortBy('product_id')->pluck('unit_cost_cents')->values()->all());
        $this->assertSame(10, $this->stock($this->mag), 'sending reserves nothing');
        $this->assertSame(0, LedgerEntry::count(), 'nothing is posted before payment');

        // Patient sees prices and total, never cost, margin, fee or payout.
        $this->get("/pay/{$order->checkout_token}")->assertOk()
            ->assertSee('Pay $63.99')
            ->assertDontSee('$12.00')->assertDontSee('$31.01')->assertDontSee('$0.48')->assertDontSee('$32.50');

        $this->pay($order)->assertRedirect("/pay/{$order->checkout_token}")->assertSessionHas('status');

        $order->refresh();
        $this->assertSame(Order::PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame([
            LedgerEntry::CLEARING => 6399,
            LedgerEntry::COGS => -3250,
            LedgerEntry::PROVIDER_PAYABLE => -3101,
            LedgerEntry::FEE_REVENUE => -48,
        ], $order->ledgerEntries->pluck('amount_cents', 'account')->all());
        $this->assertSame([8, 9], [$this->stock($this->mag), $this->stock($this->vitd)]);
        $this->assertSame(['reserve', 'reserve'], $order->inventoryMovements->pluck('reason')->all());
        $this->assertNotContains(false, Ledger::audit($order));
        $this->assertBooksReconcile();

        $this->get("/orders/{$order->id}")->assertOk()->assertSee('all pass')->assertSee('processor_clearing');
        $this->get("/pay/{$order->checkout_token}")->assertSee('Paid ✓');
    }

    public function test_live_quote_uses_the_same_math_as_the_persisted_order(): void
    {
        $this->postJson('/orders/preview', ['lines' => [
            $this->mag->id => ['quantity' => 2, 'price' => '24'],
            $this->vitd->id => ['quantity' => 1, 'price' => '15.99'],
        ]])->assertOk()->assertJson(['subtotal' => '$63.99', 'cogs' => '$32.50', 'margin' => '$31.49', 'fee' => '$0.48', 'payout' => '$31.01']);

        $this->assertSame(0, Order::count(), 'preview persists nothing');
    }

    public function test_declined_card_releases_stock_and_a_fresh_attempt_succeeds(): void
    {
        $order = $this->sendOrder();

        $this->pay($order, FakePaymentGateway::DECLINE)->assertSessionHas('error');

        $order->refresh();
        $this->assertSame(Order::AWAITING_PAYMENT, $order->status);
        $this->assertSame([10, 10], [$this->stock($this->mag), $this->stock($this->vitd)]);
        $this->assertSame(Payment::FAILED, $order->payments->sole()->status);
        $this->assertSame(0, LedgerEntry::count());
        $this->assertBooksReconcile();

        // The re-rendered checkout page carries a fresh key, so the retry is a new attempt.
        $this->pay($order)->assertSessionHas('status');

        $order->refresh();
        $this->assertSame(Order::PAID, $order->status);
        $this->assertSame([Payment::FAILED, Payment::SUCCEEDED], $order->payments->sortBy('id')->pluck('status')->values()->all());
        $this->assertCount(4, $order->ledgerEntries);
        $this->assertSame([8, 9], [$this->stock($this->mag), $this->stock($this->vitd)]);
        $this->assertBooksReconcile();
    }

    public function test_replaying_an_idempotency_key_never_charges_twice(): void
    {
        $spy = $this->spyGateway();
        $order = $this->sendOrder();
        $key = (string) Str::uuid();

        $this->pay($order, key: $key)->assertSessionHas('status');
        $this->pay($order, key: $key)->assertSessionHas('status'); // double-click / refresh: replays the stored outcome

        $this->assertSame(1, $spy->calls);
        $this->assertSame(1, Payment::count());
        $this->assertSame(4, LedgerEntry::count());

        // A replayed *decline* stays a decline: a double-click on a declined card doesn't fire a second charge.
        $second = $this->sendOrder([$this->mag->id => ['quantity' => 1, 'price' => '24.00']]);
        $declineKey = (string) Str::uuid();
        $this->pay($second, FakePaymentGateway::DECLINE, $declineKey);
        $this->pay($second, FakePaymentGateway::APPROVE, $declineKey)->assertSessionHas('error');
        $this->assertSame(2, $spy->calls);
        $this->assertSame(Order::AWAITING_PAYMENT, $second->fresh()->status);
        $this->assertBooksReconcile();
    }

    public function test_a_second_attempt_on_a_paid_order_is_rejected(): void
    {
        $spy = $this->spyGateway();
        $order = $this->sendOrder();
        $this->pay($order);

        $this->pay($order)->assertSessionHas('error', 'This order has already been paid.');

        $this->assertSame(1, $spy->calls);
        $this->assertSame(1, $order->payments()->count());
        $this->assertBooksReconcile();
    }

    public function test_an_attempt_while_another_is_in_flight_is_rejected_without_side_effects(): void
    {
        $spy = $this->spyGateway();
        $order = $this->sendOrder();
        Order::whereKey($order->id)->update(['status' => Order::PROCESSING]); // tab A is mid-charge

        $this->pay($order)->assertSessionHas('error', 'A payment for this order is already in progress.');

        $this->assertSame(0, $spy->calls);
        $this->assertSame(0, Payment::count());
        $this->assertSame([10, 10], [$this->stock($this->mag), $this->stock($this->vitd)]);
    }

    public function test_database_allows_only_one_live_payment_per_order(): void
    {
        $order = $this->sendOrder();
        Payment::create(['order_id' => $order->id, 'idempotency_key' => 'k1', 'amount_cents' => 6399, 'status' => Payment::PENDING]);

        $this->expectException(UniqueConstraintViolationException::class);
        Payment::create(['order_id' => $order->id, 'idempotency_key' => 'k2', 'amount_cents' => 6399, 'status' => Payment::SUCCEEDED]);
    }

    public function test_out_of_stock_at_payment_rolls_back_every_line_and_never_charges(): void
    {
        $spy = $this->spyGateway();
        $order = $this->sendOrder();
        $this->vitd->adjustStock(-10, 'adjustment', 'test'); // sold out after the order was sent

        $this->pay($order)->assertSessionHas('error', 'Sorry, Vitamin D is out of stock. You have not been charged.');

        $this->assertSame(0, $spy->calls);
        $this->assertSame(Order::AWAITING_PAYMENT, $order->fresh()->status);
        $this->assertSame([10, 0], [$this->stock($this->mag), $this->stock($this->vitd)], 'magnesium reservation rolled back');
        $this->assertSame(0, Payment::count());
        $this->assertSame(0, $order->inventoryMovements()->count());
        $this->assertBooksReconcile();
    }

    public function test_order_validation_at_the_boundary(): void
    {
        $send = fn (array $lines) => $this->post('/orders', ['patient_id' => $this->patient->id, 'lines' => $lines]);
        $id = $this->mag->id;

        $send([$id => ['quantity' => 1, 'price' => '11.99']])->assertSessionHasErrors("lines.$id.price");     // below cost
        $send([$id => ['quantity' => 1, 'price' => '12.00']])->assertSessionHasErrors('lines');               // at cost: fee makes payout −9¢
        $send([$id => ['quantity' => 11, 'price' => '24.00']])->assertSessionHasErrors("lines.$id.quantity"); // more than in stock
        $send([$id => ['quantity' => 1, 'price' => '1e3']])->assertSessionHasErrors("lines.$id.price");       // not a price
        $send([$id => ['quantity' => 0, 'price' => '24.00']])->assertSessionHasErrors('lines');               // nothing ordered
        $send([$id => ['quantity' => 101, 'price' => '24.00']])->assertSessionHasErrors("lines.$id.quantity");

        $this->assertSame(0, Order::count());
    }

    public function test_providers_only_reach_their_own_patients_and_orders(): void
    {
        $other = Provider::create(['name' => 'Dr. Other', 'email' => 'other@example.com']);
        $theirPatient = Patient::create(['provider_id' => $other->id, 'name' => 'Not Mine', 'email' => 'nm@example.com', 'shipping_address' => 'x']);
        $theirOrder = app(OrderService::class)->send($other, $theirPatient, [['product_id' => $this->mag->id, 'quantity' => 1, 'unit_price_cents' => 2400]]);

        // Acting as $this->provider (the default stub login).
        $this->post('/orders', ['patient_id' => $theirPatient->id, 'lines' => [$this->mag->id => ['quantity' => 1, 'price' => '24.00']]])->assertNotFound();
        $this->get("/orders/{$theirOrder->id}")->assertNotFound();
        $this->post("/orders/{$theirOrder->id}/cancel")->assertNotFound();

        $this->withSession(['provider_id' => $other->id])->get("/orders/{$theirOrder->id}")->assertOk();
    }

    public function test_cancelled_order_cannot_be_paid(): void
    {
        $order = $this->sendOrder();

        $this->post("/orders/{$order->id}/cancel")->assertSessionHas('status');
        $this->assertSame(Order::CANCELLED, $order->fresh()->status);

        $this->pay($order)->assertSessionHas('error', 'This order was cancelled by your provider.');
        $this->assertSame(0, Payment::count());
        $this->get("/pay/{$order->checkout_token}")->assertSee('This order was cancelled');

        $this->post("/orders/{$order->id}/cancel")->assertSessionHas('error'); // can't cancel twice
    }

    public function test_inventory_adjustments_are_audited_and_cannot_go_negative(): void
    {
        $this->post("/inventory/{$this->mag->id}", ['delta' => 5, 'note' => 'PO-1001'])->assertSessionHas('status');
        $this->assertSame(15, $this->stock($this->mag));
        $this->assertSame(
            ['delta' => 5, 'reason' => 'restock', 'actor' => "provider:{$this->provider->id}", 'note' => 'PO-1001'],
            $this->mag->hasMany(InventoryMovement::class)->latest('id')->first()->only(['delta', 'reason', 'actor', 'note']),
        );

        $this->post("/inventory/{$this->mag->id}", ['delta' => -100])->assertSessionHas('error');
        $this->post("/inventory/{$this->mag->id}", ['delta' => 0])->assertSessionHasErrors('delta');
        $this->assertSame(15, $this->stock($this->mag));
        $this->assertBooksReconcile();
    }

    public function test_ledger_verify_catches_tampering(): void
    {
        $order = $this->sendOrder();
        $this->pay($order);
        $this->assertBooksReconcile();

        // Shift a cent from fee to payout: still "balances", but no longer matches the line snapshots or the ledger.
        DB::table('orders')->where('id', $order->id)->update(['fee_cents' => 47, 'provider_payout_cents' => 3102]);

        $this->assertSame(1, Artisan::call('ledger:verify'));
        $this->assertStringContainsString("Order #{$order->id}: Stored split equals a recomputation from the line snapshots FAILED", Artisan::output());
    }

    public function test_books_are_append_only(): void
    {
        $order = $this->sendOrder();
        $this->pay($order);

        $this->assertThrows(fn () => $order->ledgerEntries->first()->update(['amount_cents' => 0]), LogicException::class);
        $this->assertThrows(fn () => $order->lines->first()->update(['unit_price_cents' => 1]), LogicException::class);
        $this->assertThrows(
            fn () => Ledger::postPayment($order, $order->payments->sole()), // a second posting for the same payment
            UniqueConstraintViolationException::class,
        );
    }

    public function test_demo_seed_goes_through_the_real_flow_and_reconciles(): void
    {
        Order::query()->delete();
        DB::table('inventory_movements')->delete();
        DB::table('patients')->delete();
        DB::table('providers')->delete();
        DB::table('products')->delete();

        $this->seed();

        $this->assertSame(['subtotal' => 6399, 'cogs' => 3250, 'fee' => 48, 'payout' => 3101], Order::orderBy('id')->first()->storedSplit());
        $this->assertSame(3, Order::where('status', Order::PAID)->count());
        $this->assertBooksReconcile();
    }
}
