<!-- FE-9 ReceiptView (S2 success): the amount, the time and the items paid for. Stateless. -->
<script setup lang="ts">
export interface ReceiptLine {
  product_id: number
  name: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}
export interface Receipt {
  order_id: number
  amount_paid_cents: number
  paid_at: string
  lines: ReceiptLine[]
  is_test_payment: true
}

const props = defineProps<{ receipt: Receipt }>()
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const paidOn = computed(() => {
  const d = new Date(props.receipt.paid_at)
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `Paid ${dollars(props.receipt.amount_paid_cents)} on ${day} at ${time}.`
})
</script>

<template>
  <section aria-labelledby="receipt-heading" class="receipt card">
    <h2 id="receipt-heading">Receipt</h2>
    <p role="status">{{ paidOn }}</p>
    <p>Thank you. Your practice has your order.</p>
    <ul class="lines">
      <li v-for="l in receipt.lines" :key="l.product_id">
        <span class="name">{{ l.name }}</span>
        <span>{{ l.quantity }} x {{ dollars(l.unit_price_cents) }}</span>
        <span>{{ dollars(l.line_total_cents) }}</span>
      </li>
    </ul>
    <p class="test">Test payment: no real money moved.</p>
  </section>
</template>

<style scoped>
/* S2 success on the VL-2 theme (theme.css): the receipt on a white card; layout only here. */
.receipt { max-width: 560px; margin: 0 auto var(--space-section); }
.receipt h2 { margin-top: 0; font-family: var(--font-serif); font-weight: 500; }
.lines { list-style: none; padding: 0; }
.lines li { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-variant-numeric: tabular-nums; }
.name { overflow-wrap: anywhere; }
.test { color: var(--color-ink-muted); }
</style>
