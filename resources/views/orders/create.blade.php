@extends('layout')
@section('title', 'New order')
@section('content')
<h1>New supplement order</h1>

<form method="post" action="{{ route('orders.store') }}" id="order-form">
  @csrf
  <input type="hidden" name="request_key" value="{{ old('request_key', $requestKey) }}">
  <div class="card">
    <label>Patient
      <select name="patient_id" required>
        @foreach ($patients as $patient)
          <option value="{{ $patient->id }}" @selected(old('patient_id', $selectedPatient) == $patient->id)>{{ $patient->name }} ({{ $patient->shipping_address }})</option>
        @endforeach
      </select>
    </label>
    <p class="muted">Ships to the patient's address on file. Tax and shipping cost are out of scope.</p>
  </div>

  <div class="card">
    <h2>Supplements</h2>
    <p class="muted">Set a quantity for each item to include. Type the patient price, or enter a markup % over our cost to fill it in.</p>
    <table>
      <tr><th>Supplement</th><th class="num">Our cost</th><th class="num">MSRP</th><th class="num">In stock</th><th>Qty</th><th>Markup %</th><th>Patient price ($)</th><th class="num">Line total</th><th class="num">Your margin</th></tr>
      @foreach ($products as $product)
        <tr data-id="{{ $product->id }}" data-cost="{{ $product->unit_cost_cents }}">
          <td>{{ $product->name }}</td>
          <td class="num">@money($product->unit_cost_cents)</td>
          <td class="num">@money($product->msrp_cents)</td>
          <td class="num">{{ $product->stock_on_hand }}</td>
          <td><input type="number" name="lines[{{ $product->id }}][quantity]" value="{{ old("lines.{$product->id}.quantity", 0) }}" min="0" max="100" aria-label="Quantity of {{ $product->name }}"></td>
          <td><input type="number" class="markup" min="0" step="1" placeholder="—" aria-label="Markup % for {{ $product->name }}"></td>
          <td><input class="price" name="lines[{{ $product->id }}][price]" value="{{ old("lines.{$product->id}.price", \App\Money\Money::plain($product->msrp_cents)) }}" inputmode="decimal" aria-label="Patient price for {{ $product->name }}"></td>
          <td class="num" data-total></td>
          <td class="num" data-margin></td>
        </tr>
      @endforeach
    </table>
  </div>

  <div class="card">
    <h2>Quote <span class="muted">(computed by the server; locked when you send)</span></h2>
    <table style="max-width:520px">
      <tr><td>Patient pays (order total)</td><td class="num" id="q-subtotal">—</td></tr>
      <tr><td>Cost of goods (platform keeps)</td><td class="num" id="q-cogs">—</td></tr>
      <tr><td>Your gross margin</td><td class="num" id="q-margin">—</td></tr>
      <tr><td>Platform fee ({{ $feeBps }} bps of order total)</td><td class="num" id="q-fee">—</td></tr>
      <tr class="total"><td>Your payout</td><td class="num" id="q-payout">—</td></tr>
    </table>
    <p class="bad" id="q-error"></p>
    <button>Send payment link to patient</button>
  </div>
</form>

<script>
  // UI only: all money math happens server-side in the same code that persists the order.
  const form = document.getElementById('order-form');
  const ids = ['subtotal', 'cogs', 'margin', 'fee', 'payout'];
  let timer;

  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('markup') && e.target.value !== '') {
      // Convenience: markup % → price string. The server only ever sees and validates the price.
      const row = e.target.closest('tr');
      const cents = Math.round(Number(row.dataset.cost) * (100 + Number(e.target.value)) / 100);
      row.querySelector('.price').value = (Math.floor(cents / 100)) + '.' + String(cents % 100).padStart(2, '0');
    }
    clearTimeout(timer);
    timer = setTimeout(refreshQuote, 200);
  });

  async function refreshQuote() {
    const res = await fetch(@json(route('orders.preview')), {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content },
      body: new FormData(form),
    });
    const data = await res.json();
    document.querySelectorAll('[data-total],[data-margin]').forEach((td) => td.textContent = '');
    if (!res.ok) {
      ids.forEach((id) => document.getElementById('q-' + id).textContent = '—');
      document.getElementById('q-error').textContent = Object.values(data.errors || {}).flat().join(' ');
      return;
    }
    document.getElementById('q-error').textContent = '';
    ids.forEach((id) => document.getElementById('q-' + id).textContent = data[id]);
    for (const [productId, line] of Object.entries(data.lines)) {
      const row = form.querySelector(`tr[data-id="${productId}"]`);
      row.querySelector('[data-total]').textContent = line.total;
      row.querySelector('[data-margin]').textContent = line.margin;
    }
  }
  refreshQuote();
</script>
@endsection
