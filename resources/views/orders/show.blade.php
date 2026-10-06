@extends('layout')
@section('title', "Order #{$order->id}")
@section('content')
@php $allPassed = ! in_array(false, $checks, true); @endphp
<h1>Order #{{ $order->id }} <span class="badge {{ $order->status }}">{{ str_replace('_', ' ', $order->status) }}</span></h1>

<div class="card">
  <p><strong>Patient:</strong> {{ $order->patient->name }} · {{ $order->patient->shipping_address }}<br>
  <strong>Sent:</strong> {{ $order->sent_at->format('D, M j, Y g:i A T') }}
  @if ($order->paid_at) · <strong>Paid:</strong> {{ $order->paid_at->format('D, M j, Y g:i A T') }} @endif</p>
  @if ($order->status === \App\Models\Order::AWAITING_PAYMENT)
    <p><span class="stub">Email stubbed</span> The patient's payment link (as emailed):
      <a href="{{ route('checkout.show', $order->checkout_token) }}" target="_blank" rel="noreferrer">open the patient checkout ↗</a></p>
    <form method="post" action="{{ route('orders.cancel', $order->id) }}" onsubmit="return confirm('Cancel this order? The patient will no longer be able to pay it.')">
      @csrf <button class="secondary small">Cancel order</button>
    </form>
  @endif
</div>

<div class="card">
  <h2>Lines (price and cost snapshotted at send)</h2>
  <table>
    <tr><th>Supplement</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Unit cost</th><th class="num">Line total</th><th class="num">Line COGS</th><th class="num">Line margin</th></tr>
    @foreach ($order->lines as $line)
      <tr>
        <td>{{ $line->product->name }}</td>
        <td class="num">{{ $line->quantity }}</td>
        <td class="num">@money($line->unit_price_cents)</td>
        <td class="num">@money($line->unit_cost_cents)</td>
        <td class="num">@money($line->lineTotal())</td>
        <td class="num">@money($line->lineCost())</td>
        <td class="num">@money($line->lineTotal() - $line->lineCost())</td>
      </tr>
    @endforeach
  </table>
</div>

<div class="card">
  <h2>Where every cent goes</h2>
  <table style="max-width:560px">
    <tr><td>Patient pays (subtotal)</td><td class="num">@money($order->subtotal_cents)</td></tr>
    <tr><td>→ Cost of goods, kept by the platform (inventory)</td><td class="num">@money($order->cogs_cents)</td></tr>
    <tr><td>→ Platform fee, {{ $order->fee_bps }} bps of subtotal, rounded half-up</td><td class="num">@money($order->fee_cents)</td></tr>
    <tr><td>→ Provider payout (margin @money($order->subtotal_cents - $order->cogs_cents) − fee)</td><td class="num">@money($order->provider_payout_cents)</td></tr>
    <tr class="total"><td>COGS + fee + payout</td><td class="num">@money($order->cogs_cents + $order->fee_cents + $order->provider_payout_cents)</td></tr>
  </table>
</div>

<div class="card">
  <h2>Payment attempts</h2>
  <table>
    <tr><th>#</th><th>Status</th><th class="num">Amount</th><th>Idempotency key</th><th>Gateway ref <span class="stub">fake</span></th><th>Failure</th><th>At</th></tr>
    @forelse ($order->payments as $payment)
      <tr>
        <td>{{ $payment->id }}</td><td>{{ $payment->status }}</td><td class="num">@money($payment->amount_cents)</td>
        <td><code>{{ $payment->idempotency_key }}</code></td><td><code>{{ $payment->gateway_ref ?? '—' }}</code></td>
        <td class="muted">{{ $payment->failure_reason ?? '—' }}</td><td class="muted">{{ $payment->created_at->format('M j, g:i:sa T') }}</td>
      </tr>
    @empty
      <tr><td colspan="7" class="muted">No payment attempts yet.</td></tr>
    @endforelse
  </table>
</div>

<div class="card">
  <h2>Ledger entries</h2>
  <table style="max-width:640px">
    <tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr>
    @forelse ($order->ledgerEntries as $entry)
      <tr>
        <td><code>{{ $entry->account }}</code></td>
        <td class="num">{{ $entry->amount_cents > 0 ? \App\Money\Money::format($entry->amount_cents) : '' }}</td>
        <td class="num">{{ $entry->amount_cents < 0 ? \App\Money\Money::format(-$entry->amount_cents) : '' }}</td>
      </tr>
    @empty
      <tr><td colspan="3" class="muted">Nothing posted. The ledger is written only when a payment succeeds.</td></tr>
    @endforelse
    @if ($order->ledgerEntries->isNotEmpty())
      <tr class="total"><td>Totals</td>
        <td class="num">@money($order->ledgerEntries->where('amount_cents', '>', 0)->sum('amount_cents'))</td>
        <td class="num">@money(-$order->ledgerEntries->where('amount_cents', '<', 0)->sum('amount_cents'))</td></tr>
    @endif
  </table>
</div>

<div class="card">
  <h2>Inventory movements</h2>
  <table style="max-width:640px">
    <tr><th>Supplement</th><th class="num">Δ units</th><th>Reason</th><th>At</th></tr>
    @forelse ($order->inventoryMovements as $m)
      <tr><td>{{ $m->product->name }}</td><td class="num">{{ $m->delta > 0 ? '+' : '' }}{{ $m->delta }}</td><td>{{ $m->reason }}</td><td class="muted">{{ $m->created_at->format('M j, g:i:sa T') }}</td></tr>
    @empty
      <tr><td colspan="4" class="muted">Stock is reserved at payment, so nothing has moved yet.</td></tr>
    @endforelse
  </table>
</div>

<div class="card">
  <h2>Audit checks {!! $allPassed ? '<span class="good">✓ all pass</span>' : '<span class="bad">✗ discrepancy</span>' !!}</h2>
  <ul>
    @foreach ($checks as $check => $ok)
      <li class="{{ $ok ? 'good' : 'bad' }}">{{ $ok ? '✓' : '✗' }} {{ $check }}</li>
    @endforeach
  </ul>
  <p class="muted">The same checks run across every order with <code>php artisan ledger:verify</code>.</p>
</div>
@endsection
