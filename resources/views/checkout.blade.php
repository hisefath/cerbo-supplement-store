@extends('layout')
@section('title', 'Your supplement order')
@section('content')
<div style="max-width:640px;margin:0 auto">
  <h1>Supplements recommended by {{ $order->provider->name }}</h1>
  <p class="muted">For {{ $order->patient->name }} · Order #{{ $order->id }}</p>

  <div class="card">
    <table>
      <tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr>
      @foreach ($order->lines as $line)
        <tr><td>{{ $line->product->name }}</td><td class="num">{{ $line->quantity }}</td><td class="num">@money($line->unit_price_cents)</td><td class="num">@money($line->lineTotal())</td></tr>
      @endforeach
      <tr class="total"><td colspan="3">Total</td><td class="num">@money($order->subtotal_cents)</td></tr>
    </table>
    <p class="muted">Ships to: {{ $order->patient->shipping_address }}</p>
  </div>

  <div class="card">
    @if ($order->status === \App\Models\Order::PAID)
      <h2 class="good">Paid ✓</h2>
      <p>Paid {{ $order->paid_at->toDayDateTimeString() }}. Reference <code>{{ $payment?->gateway_ref }}</code>.</p>
      <p class="muted"><span class="stub">Shipping stubbed</span> Your order will ship to the address above.</p>
    @elseif ($order->status === \App\Models\Order::PROCESSING)
      <meta http-equiv="refresh" content="3">
      <h2>Payment in progress…</h2>
      <p class="muted">We're confirming your payment. This page refreshes automatically.</p>
    @elseif ($order->status === \App\Models\Order::CANCELLED)
      <h2>This order was cancelled</h2>
      <p class="muted">{{ $order->provider->name }} withdrew this recommendation. You have not been charged.</p>
    @else
      <form method="post" action="{{ route('checkout.pay', $order->checkout_token) }}">
        @csrf
        <input type="hidden" name="idempotency_key" value="{{ $idempotencyKey }}">
        <p><span class="stub">Payment is simulated: no card details are collected.</span></p>
        <button name="payment_method" value="{{ \App\Payments\FakePaymentGateway::APPROVE }}">Pay @money($order->subtotal_cents)</button>
        <button class="secondary" name="payment_method" value="{{ \App\Payments\FakePaymentGateway::DECLINE }}">Simulate a declined card</button>
      </form>
    @endif
  </div>
</div>
@endsection
