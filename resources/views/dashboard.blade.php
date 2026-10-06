@extends('layout')
@section('title', 'Dashboard')
@section('content')
<h1>{{ $actingProvider->name }}: supplement sales</h1>

<div class="kpis">
  <div class="kpi"><div class="v">@money($kpis['gmv'])</div><div class="l">Patient payments (GMV)</div></div>
  <div class="kpi"><div class="v">@money($kpis['payout'])</div><div class="l">Your earnings (margin net of fee)</div></div>
  <div class="kpi"><div class="v">@money($kpis['fees'])</div><div class="l">Platform fees (0.75%)</div></div>
  <div class="kpi"><div class="v">{{ $kpis['paidOrders'] }}</div><div class="l">Paid orders</div></div>
  <div class="kpi"><div class="v">{{ $kpis['awaiting'] }}</div><div class="l">Awaiting patient payment</div></div>
</div>

<div class="card">
  <h2>Start an order</h2>
  @foreach ($patients as $patient)
    <a class="btn" href="{{ route('orders.create', ['patient' => $patient->id]) }}">New order for {{ $patient->name }}</a>
  @endforeach
</div>

<div class="card">
  <h2>What's been sold</h2>
  <table>
    <tr><th>Supplement</th><th class="num">Units</th><th class="num">Revenue</th><th class="num">Gross margin</th></tr>
    @forelse ($sold as $row)
      <tr><td>{{ $row->name }}</td><td class="num">{{ $row->units }}</td><td class="num">@money((int) $row->revenue)</td><td class="num">@money((int) $row->margin)</td></tr>
    @empty
      <tr><td colspan="4" class="muted">Nothing sold yet.</td></tr>
    @endforelse
  </table>
  <p class="muted">Gross margin is before the platform fee. The 0.75% fee is charged once per order on the order total, so it shows in the order audit and the KPI above, not split per product.</p>
</div>

<div class="card">
  <h2>Recent orders</h2>
  <table>
    <tr><th>#</th><th>Patient</th><th>Status</th><th class="num">Patient pays</th><th class="num">Your payout</th><th>Sent</th><th>Paid</th><th></th></tr>
    @forelse ($orders as $order)
      <tr>
        <td>{{ $order->id }}</td>
        <td>{{ $order->patient->name }}</td>
        <td><span class="badge {{ $order->status }}">{{ str_replace('_', ' ', $order->status) }}</span></td>
        <td class="num">@money($order->subtotal_cents)</td>
        <td class="num">@money($order->provider_payout_cents)</td>
        <td class="muted">{{ $order->sent_at->format('M j, g:ia T') }}</td>
        <td class="muted">{{ $order->paid_at?->format('M j, g:ia T') ?? '—' }}</td>
        <td><a href="{{ route('orders.show', $order->id) }}">Audit →</a></td>
      </tr>
    @empty
      <tr><td colspan="8" class="muted">No orders yet.</td></tr>
    @endforelse
  </table>
</div>

<div class="card">
  <h2>Inventory</h2>
  <p class="muted">The platform holds the stock. Sales reserve units at payment automatically. Restocks and adjustments here are recorded as audited movements (in production this would be an ops-only permission).</p>
  <table>
    <tr><th>Supplement</th><th>SKU</th><th class="num">Unit cost</th><th class="num">MSRP</th><th class="num">On hand</th><th>Restock (+) / adjust (−)</th></tr>
    @foreach ($products as $product)
      <tr>
        <td>{{ $product->name }}</td>
        <td><code>{{ $product->sku }}</code></td>
        <td class="num">@money($product->unit_cost_cents)</td>
        <td class="num">@money($product->msrp_cents)</td>
        <td class="num"><strong>{{ $product->stock_on_hand }}</strong></td>
        <td>
          <form method="post" action="{{ route('inventory.adjust', $product) }}" style="display:flex;gap:6px">
            @csrf
            <input type="number" name="delta" placeholder="+24" required min="-1000" max="1000" aria-label="Units to add or remove">
            <input name="note" placeholder="note (optional)" maxlength="200">
            <button class="small">Update</button>
          </form>
        </td>
      </tr>
    @endforeach
  </table>
</div>
@endsection
