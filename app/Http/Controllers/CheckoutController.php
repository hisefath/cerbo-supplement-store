<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Services\CheckoutService;
use App\Services\OrderException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Patient-facing. Access is by the order's unguessable checkout token only (no provider session). */
class CheckoutController extends Controller
{
    public function show(string $token)
    {
        $order = Order::where('checkout_token', $token)
            ->with(['provider', 'patient', 'lines.product', 'payments'])
            ->firstOrFail();

        return view('checkout', [
            'order' => $order,
            'payment' => $order->payments->firstWhere('status', Payment::SUCCEEDED),
            'idempotencyKey' => (string) Str::uuid(), // fresh per page render; a double-submit reuses it
        ]);
    }

    public function pay(Request $request, string $token, CheckoutService $checkout)
    {
        $order = Order::where('checkout_token', $token)->firstOrFail();
        $data = $request->validate([
            'idempotency_key' => 'required|uuid',
            'payment_method' => 'required|string|max:100', // opaque token from the processor's client SDK in real life
        ]);

        try {
            $payment = $checkout->pay($order, $data['payment_method'], $data['idempotency_key']);
        } catch (OrderException $e) {
            return redirect()->route('checkout.show', $token)->with('error', $e->getMessage());
        }

        // A replayed key can return an attempt that is still pending (double-click while the first is charging).
        return redirect()->route('checkout.show', $token)->with(...match ($payment->status) {
            Payment::SUCCEEDED => ['status', 'Payment received. Thank you!'],
            Payment::FAILED => ['error', "Your card was declined (simulated: {$payment->failure_reason}). You have not been charged. Please try again."],
            default => ['status', 'Your payment is being processed.'],
        });
    }
}
