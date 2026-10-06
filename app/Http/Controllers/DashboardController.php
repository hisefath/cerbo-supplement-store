<?php

namespace App\Http\Controllers;

use App\Models\LedgerEntry;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Product;
use App\Services\Ledger;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** Provider dashboard: what's been sold, earnings, and inventory. */
    public function index(Request $request)
    {
        $provider = $this->provider($request);
        $paid = fn () => $provider->orders()->where('status', Order::PAID);

        return view('dashboard', [
            'kpis' => [
                'gmv' => (int) $paid()->sum('subtotal_cents'),
                'payout' => (int) $paid()->sum('provider_payout_cents'),
                'fees' => (int) $paid()->sum('fee_cents'),
                'paidOrders' => $paid()->count(),
                'awaiting' => $provider->orders()->where('status', Order::AWAITING_PAYMENT)->count(),
            ],
            'sold' => OrderLine::query()
                ->join('orders', 'orders.id', '=', 'order_lines.order_id')
                ->join('products', 'products.id', '=', 'order_lines.product_id')
                ->where('orders.provider_id', $provider->id)
                ->where('orders.status', Order::PAID)
                ->groupBy('products.id', 'products.name')
                ->selectRaw('products.name, SUM(order_lines.quantity) AS units,
                    SUM(order_lines.quantity * order_lines.unit_price_cents) AS revenue,
                    SUM(order_lines.quantity * (order_lines.unit_price_cents - order_lines.unit_cost_cents)) AS margin')
                ->orderByDesc('revenue')
                ->get(),
            'orders' => $provider->orders()->with('patient')->latest('id')->limit(25)->get(),
            'patients' => $provider->patients()->orderBy('name')->get(),
            'products' => Product::orderBy('name')->get(),
        ]);
    }

    /**
     * FR5 "update inventory". Inventory is platform-owned, so in production this is an ops-only
     * permission; it lives on the provider dashboard because the brief asks for it there.
     */
    public function adjustStock(Request $request, Product $product)
    {
        $data = $request->validate([
            'delta' => 'required|integer|between:-1000,1000|not_in:0',
            'note' => 'nullable|string|max:200',
        ]);
        $delta = (int) $data['delta'];
        $changed = $product->adjustStock(
            $delta, $delta > 0 ? 'restock' : 'adjustment', 'provider:'.$this->provider($request)->id, note: $data['note'] ?? null,
        );

        return back()->with(...($changed
            ? ['status', "Stock updated for {$product->name} ({$delta} units)."]
            : ['error', "Can't remove more than the {$product->stock_on_hand} units of {$product->name} on hand."]));
    }

    /** Platform view: headline metrics computed from the ledger (the system of record). */
    public function platform()
    {
        $totals = LedgerEntry::groupBy('account')->selectRaw('account, SUM(amount_cents) AS total')
            ->pluck('total', 'account')->map(fn ($v) => (int) $v);

        $byProvider = LedgerEntry::query()
            ->join('orders', 'orders.id', '=', 'ledger_entries.order_id')
            ->join('providers', 'providers.id', '=', 'orders.provider_id')
            ->groupBy('providers.id', 'providers.name')
            ->selectRaw("providers.name, COUNT(DISTINCT orders.id) AS orders,
                SUM(CASE WHEN account = 'processor_clearing' THEN amount_cents ELSE 0 END) AS gmv,
                -SUM(CASE WHEN account = 'platform_fee_revenue' THEN amount_cents ELSE 0 END) AS fee,
                -SUM(CASE WHEN account = 'provider_payable' THEN amount_cents ELSE 0 END) AS payable")
            ->orderByDesc('gmv')
            ->get();

        // ponytail: grouped in PHP to stay portable across SQLite/Postgres; move to SQL (date_trunc) past ~100k orders.
        $weekly = Order::where('status', Order::PAID)->get(['paid_at', 'subtotal_cents', 'provider_id'])
            ->groupBy(fn ($o) => $o->paid_at->startOfWeek()->toDateString())
            ->map(fn ($g) => ['orders' => $g->count(), 'gmv' => (int) $g->sum('subtotal_cents'), 'providers' => $g->unique('provider_id')->count()])
            ->sortKeysDesc();

        return view('platform', [
            'gmv' => $totals[LedgerEntry::CLEARING] ?? 0,
            'cogs' => -($totals[LedgerEntry::COGS] ?? 0),
            'payable' => -($totals[LedgerEntry::PROVIDER_PAYABLE] ?? 0),
            'fees' => -($totals[LedgerEntry::FEE_REVENUE] ?? 0),
            'byProvider' => $byProvider,
            'weekly' => $weekly,
            'failures' => Ledger::verifyAll(),
            'paidOrders' => Order::where('status', Order::PAID)->count(),
        ]);
    }
}
