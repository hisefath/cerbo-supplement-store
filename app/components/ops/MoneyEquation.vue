<!-- FE-12 MoneyEquation (S4, S11): "$60.00 paid = $30.00 item cost + $29.55 provider payout + $0.45 platform fee" and
     whether it adds up, in words (never color alone). Stateless. -->
<script setup lang="ts">
export interface Part {
  label: string
  cents: number
}

const props = defineProps<{ total: number; parts: Part[]; balanced: boolean }>()
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const gap = computed(() => props.total - props.parts.reduce((s, p) => s + p.cents, 0))
</script>

<template>
  <div class="equation">
    <p>
      <span class="term">{{ dollars(total) }} paid</span>
      <template v-for="(p, i) in parts" :key="p.label">
        <span> {{ i === 0 ? '=' : '+' }} </span><span class="term">{{ dollars(p.cents) }} {{ p.label }}</span>
      </template>
    </p>
    <p v-if="balanced" role="status">Adds up: yes</p>
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
