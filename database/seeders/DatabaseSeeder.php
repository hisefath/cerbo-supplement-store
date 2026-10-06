<?php

namespace Database\Seeders;

use App\Models\Patient;
use App\Models\Product;
use App\Models\Provider;
use App\Payments\FakePaymentGateway;
use App\Services\CheckoutService;
use App\Services\OrderService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo data. Runs only on an empty database, and creates stock, orders and payments through the
 * real services, so seeded data passes `ledger:verify` exactly like live data.
 */
class DatabaseSeeder extends Seeder
{
    public function run(OrderService $orders, CheckoutService $checkout): void
    {
        if (Provider::exists()) {
            return;
        }

        $maya = Provider::create(['name' => 'Dr. Maya Okafor, ND', 'email' => 'maya.okafor@example.com']);
        $sam = Provider::create(['name' => 'Dr. Sam Reyes, DC', 'email' => 'sam.reyes@example.com']);

        $jordan = Patient::create(['provider_id' => $maya->id, 'name' => 'Jordan Lee', 'email' => 'jordan.lee@example.com', 'shipping_address' => '412 Elm St, Austin, TX 78704']);
        $priya = Patient::create(['provider_id' => $maya->id, 'name' => 'Priya Shah', 'email' => 'priya.shah@example.com', 'shipping_address' => '88 Harbor Rd, Portland, ME 04101']);
        $alex = Patient::create(['provider_id' => $sam->id, 'name' => 'Alex Morgan', 'email' => 'alex.morgan@example.com', 'shipping_address' => '19 Cedar Ave, Boulder, CO 80302']);
        Patient::create(['provider_id' => $sam->id, 'name' => 'Chris Nguyen', 'email' => 'chris.nguyen@example.com', 'shipping_address' => '700 Pine St, Seattle, WA 98101']);

        $catalog = [ // sku, name, cost¢, msrp¢, opening stock
            ['MAG-GLY-120', 'Magnesium Glycinate, 120 caps', 1200, 2400, 120],
            ['VD3-K2-60', 'Vitamin D3 + K2, 60 softgels', 850, 1599, 150],
            ['OMEGA3-90', 'Omega-3 Fish Oil, 90 softgels', 1650, 3295, 80],
            ['BCOMP-60', 'Methylated B-Complex, 60 caps', 1100, 2199, 90],
            ['PROB-50B-30', 'Probiotic 50B CFU, 30 caps', 1900, 3899, 4],   // low stock: shows the stock checks
            ['CURC-PHY-60', 'Curcumin Phytosome, 60 caps', 2100, 4295, 60],
        ];
        $p = [];
        foreach ($catalog as [$sku, $name, $cost, $msrp, $stock]) {
            $p[$sku] = Product::create(['sku' => $sku, 'name' => $name, 'unit_cost_cents' => $cost, 'msrp_cents' => $msrp]);
            $p[$sku]->adjustStock($stock, 'restock', 'seed', note: 'Opening stock');
        }

        $item = fn (string $sku, int $qty, int $priceCents) => ['product_id' => $p[$sku]->id, 'quantity' => $qty, 'unit_price_cents' => $priceCents];
        $pay = fn ($order, $method = FakePaymentGateway::APPROVE) => $checkout->pay($order, $method, (string) Str::uuid());

        // Order 1 is the worked example in docs/PRD.md §6: 6399 = 3250 COGS + 48 fee + 3101 payout.
        $pay($orders->send($maya, $jordan, [$item('MAG-GLY-120', 2, 2400), $item('VD3-K2-60', 1, 1599)], (string) Str::uuid()));
        $pay($orders->send($maya, $priya, [$item('OMEGA3-90', 1, 3295), $item('BCOMP-60', 2, 2199)], (string) Str::uuid()));

        // A declined card, then a successful retry: two attempts, one ledger posting.
        $order = $orders->send($sam, $alex, [$item('CURC-PHY-60', 1, 3900), $item('VD3-K2-60', 2, 1500)], (string) Str::uuid());
        $pay($order, FakePaymentGateway::DECLINE);
        $pay($order);

        // Left unpaid so the demo can walk through the patient checkout.
        $orders->send($maya, $priya, [$item('PROB-50B-30', 1, 3899), $item('MAG-GLY-120', 1, 2400)], (string) Str::uuid());
    }
}
