<!-- FE-12 MoneyEquation (S4, S11): "$60.00 paid = $30.00 item cost + $29.55 provider payout + $0.45 platform fee" and
     whether it adds up, in words (never color alone). Stateless. S4 (one order) is the default; `period` (S11) reads
     "$90.00 patient payments = … Balanced: yes", or names the gap and the orders that cause it (FR-061, FR-065). -->
<script setup lang="ts">
export interface Part {
  label: string
  cents: number
}

const props = defineProps<{ total: number; parts: Part[]; balanced: boolean; period?: boolean; gapOrderIds?: number[] }>()
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const gap = computed(() => props.total - props.parts.reduce((s, p) => s + p.cents, 0))
const gapOrders = computed(() => {
  const ids = props.gapOrderIds ?? []
  if (ids.length === 0) return ''
  if (ids.length === 1) return ` Order ${ids[0]} causes the gap and is on the review list.`
  return ` Orders ${ids.slice(0, -1).join(', ')} and ${ids.at(-1)} cause the gap and are on the review list.`
})
</script>

<template>
  <div class="equation">
    <p>
      <span class="term">{{ dollars(total) }} {{ period ? 'patient payments' : 'paid' }}</span>
      <template v-for="(p, i) in parts" :key="p.label">
        <span> {{ i === 0 ? '=' : '+' }} </span><span class="term">{{ dollars(p.cents) }} {{ p.label }}</span>
      </template>
    </p>
    <template v-if="period">
      <p v-if="balanced" role="status">Balanced: yes</p>
      <p v-else role="status">Not balanced: {{ dollars(Math.abs(gap)) }} {{ gap > 0 ? 'short' : 'over' }}.{{ gapOrders }}</p>
    </template>
    <p v-else-if="balanced" role="status">Adds up: yes</p>
    <p v-else role="status">
      Adds up: no. The parts are {{ dollars(Math.abs(gap)) }} {{ gap > 0 ? 'short of' : 'over' }} the amount paid. This order is
      on the review list.
    </p>
  </div>
</template>

<style scoped>
.equation { font-size: 18px; margin: 0 0 var(--space-card); padding-bottom: var(--space-card); border-bottom: 1px solid var(--color-border); font-variant-numeric: tabular-nums; }
.term { white-space: nowrap; }
@media (max-width: 600px) {
  .equation .term { display: block; }
}
</style>
