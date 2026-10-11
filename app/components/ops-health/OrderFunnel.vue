<!-- FE-24 OrderFunnel (lld.md §3; S10): the month's funnel as rows with counts beside CSS-width bars on --color-primary.
     Stateless. Each row is read as text; the bars are decorative ("read the counts, not the bars"). -->
<script setup lang="ts">
export interface Funnel {
  sent: number
  checkout_started: number
  paid: number
  payment_failed: number
  checkout_expired: number
}

const props = defineProps<{ funnel: Funnel }>()
const width = (n: number) => `${props.funnel.sent ? (n / props.funnel.sent) * 100 : 0}%`
const rows = computed(() => {
  const f = props.funnel
  const neverOpened = f.sent - f.checkout_started
  const stuck = [f.payment_failed && `${f.payment_failed} failed`, f.checkout_expired && `${f.checkout_expired} expired`].filter(Boolean).join(', ')
  return [
    { label: 'Sent', n: f.sent, note: '', said: `Sent, ${f.sent}` },
    { label: 'Checkout started', n: f.checkout_started, note: neverOpened ? `${neverOpened} never opened` : '', said: `Checkout started, ${f.checkout_started} of ${f.sent} sent` },
    { label: 'Paid', n: f.paid, note: stuck, said: `Paid, ${f.paid} of ${f.sent} sent${stuck ? `; ${stuck}` : ''}` },
  ]
})
</script>

<template>
  <ol class="funnel">
    <li v-for="r in rows" :key="r.label" :aria-label="r.said">
      <span class="label">{{ r.label }}</span>
      <span class="count">{{ r.n }}</span>
      <span class="track" aria-hidden="true"><span class="bar" :style="{ width: width(r.n) }" /></span>
      <span class="note">{{ r.note }}</span>
    </li>
  </ol>
</template>

<style scoped>
.funnel { list-style: none; margin: 0; padding: 0; }
.funnel li { display: grid; grid-template-columns: 9rem 3rem 1fr; align-items: center; gap: 4px 8px; padding: 4px 0; }
.count { text-align: right; font-variant-numeric: tabular-nums; }
.track { display: block; height: 12px; }
.bar { display: block; height: 100%; background: var(--color-primary); border-radius: var(--radius-button); }
.note { grid-column: 3; color: var(--color-ink-muted); }
</style>
