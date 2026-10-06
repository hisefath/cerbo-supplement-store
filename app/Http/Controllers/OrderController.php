<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Money\Money;
use App\Services\Ledger;
use App\Services\OrderException;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function create(Request $request)
    {
        return view('orders.create', [
            'patients' => $this->provider($request)->patients()->orderBy('name')->get(),
            'products' => Product::orderBy('name')->get(),
            'selectedPatient' => $request->integer('patient'),
            'feeBps' => OrderService::PLATFORM_FEE_BPS,
        ]);
    }

    /** Live quote for the order form: same code path as send(), nothing persisted. */
    public function preview(Request $request, OrderService $orders)
    {
        ['lines' => $lines, 'split' => $split] = $orders->quote($this->items($request));

        return response()->json([
            'lines' => collect($lines)->mapWithKeys(fn ($l) => [$l['product_id'] => [
                'total' => Money::format($l['quantity'] * $l['unit_price_cents']),
                'margin' => Money::format($l['quantity'] * ($l['unit_price_cents'] - $l['unit_cost_cents'])),
            ]]),
            'subtotal' => Money::format($split->subtotal),
            'cogs' => Money::format($split->cogs),
            'margin' => Money::format($split->grossMargin()),
            'fee' => Money::format($split->fee),
            'payout' => Money::format($split->payout),
        ]);
    }

    public function store(Request $request, OrderService $orders)
    {
        $provider = $this->provider($request);
        $request->validate(['patient_id' => 'required|integer']);
        $patient = $provider->patients()->findOrFail($request->integer('patient_id')); // 404 unless it's their patient

        $order = $orders->send($provider, $patient, $this->items($request));

        return redirect()->route('orders.show', $order->id)
            ->with('status', 'Order sent. The payment link was emailed to the patient (email is stubbed: written to the app log).');
    }

    public function show(Request $request, int $id)
    {
        $order = $this->provider($request)->orders() // scoped: another provider's order is a 404
            ->with(['patient', 'lines.product', 'payments', 'ledgerEntries', 'inventoryMovements.product'])
            ->findOrFail($id);

        return view('orders.show', ['order' => $order, 'checks' => Ledger::audit($order)]);
    }

    public function cancel(Request $request, int $id, OrderService $orders)
    {
        $order = $this->provider($request)->orders()->findOrFail($id);
        try {
            $orders->cancel($order->id);
        } catch (OrderException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('status', "Order #{$order->id} cancelled. The patient's payment link no longer works.");
    }

    /**
     * Form shape: lines[<product_id>][quantity|price]. Quantity 0 = not ordered.
     * Prices arrive as dollar strings and go straight to integer cents (never a float).
     *
     * @return list<array{product_id:int, quantity:int, unit_price_cents:int}>
     */
    private function items(Request $request): array
    {
        $data = $request->validate([
            'lines' => 'required|array|max:50',
            'lines.*.quantity' => 'nullable|integer|min:0|max:100',
            'lines.*.price' => 'nullable|string|max:12',
        ]);

        $items = [];
        foreach ($data['lines'] as $productId => $line) {
            $quantity = (int) ($line['quantity'] ?? 0);
            if ($quantity === 0) {
                continue;
            }
            $cents = Money::toCents((string) ($line['price'] ?? ''));
            if ($cents === null) {
                throw ValidationException::withMessages(["lines.$productId.price" => 'Enter a price like 24.99.']);
            }
            $items[] = ['product_id' => (int) $productId, 'quantity' => $quantity, 'unit_price_cents' => $cents];
        }

        return $items;
    }
}
