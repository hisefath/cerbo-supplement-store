@extends('layout')
@section('title', 'Platform metrics')
@section('content')
<h1>Platform metrics <span class="muted">(platform finance view, computed from the ledger)</span></h1>

<div class="kpis">
  <div class="kpi"><div class="v">@money($gmv)</div><div class="l">GMV processed in-house</div></div>
  <div class="kpi"><div class="v">@money($fees)</div><div class="l">Platform fee revenue{{ $gmv > 0 ? sprintf(' · %.2f bps effective', $fees * 10000 / $gmv) : '' }}</div></div>
  <div class="kpi"><div class="v">@money($cogs)</div><div class="l">COGS recovered (inventory)</div></div>
  <div class="kpi"><div class="v">@money($payable)</div><div class="l">Owed to providers (payable)</div></div>
  <div class="kpi"><div class="v">{{ $paidOrders }}</div><div class="l">Paid orders</div></div>
</div>

<div class="card">
  <h2>Books check (<code>ledger:verify</code>)</h2>
  @if (! $failures)
    <p class="good">✓ Every order reconciles to the cent: split balances, ledger sums to zero and matches the split, one payment per paid order, and stock equals the sum of movements.</p>
  @else
    <ul>@foreach ($failures as $failure)<li class="bad">{{ $failure }}</li>@endforeach</ul>
  @endif
</div>

<div class="card">
  <h2>By provider</h2>
  <table>
    <tr><th>Provider</th><th class="num">Paid orders</th><th class="num">GMV</th><th class="num">Fee revenue</th><th class="num">Owed to provider</th></tr>
    @forelse ($byProvider as $row)
      <tr><td>{{ $row->name }}</td><td class="num">{{ $row->orders }}</td><td class="num">@money((int) $row->gmv)</td><td class="num">@money((int) $row->fee)</td><td class="num">@money((int) $row->payable)</td></tr>
    @empty
      <tr><td colspan="5" class="muted">No paid orders yet.</td></tr>
    @endforelse
  </table>
</div>

<div class="card">
  <h2>Volume migrated in-house, by week</h2>
  <table style="max-width:640px">
    <tr><th>Week of</th><th class="num">Paid orders</th><th class="num">GMV</th><th class="num">Active providers</th></tr>
    @forelse ($weekly as $week => $row)
      <tr><td>{{ $week }}</td><td class="num">{{ $row['orders'] }}</td><td class="num">@money($row['gmv'])</td><td class="num">{{ $row['providers'] }}</td></tr>
    @empty
      <tr><td colspan="4" class="muted">No paid orders yet.</td></tr>
    @endforelse
  </table>
  <p class="muted">The leading indicator. In-house share of all supplement recommendations would need the EHR's existing marketplace-integration events as the denominator.</p>
</div>
@endsection
