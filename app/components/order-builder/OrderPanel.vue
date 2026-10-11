<!-- FE-6 OrderPanel (S1): the draft lines, total due, platform fee and payout, and Send. Stateless. -->
<script setup lang="ts">
import type { Problem } from '../ProblemMessage.vue'

export interface PanelLine {
  productId: number
  name: string
  quantity: number
  lineTotalCents: number
}
export interface Totals {
  totalCents: number
  feeCents: number
  payoutCents: number
}

defineProps<{
  lines: PanelLine[]
  totals: Totals
  patientName: string
  problem?: Problem | null
  names?: Record<number, string>
  sending?: boolean
  sentMessage?: string | null
  cleared?: boolean
}>()
const emit = defineEmits<{ remove: [productId: number]; send: []; retry: [] }>()
const dollars = (c: number) => `${c < 0 ? '-' : ''}$${(Math.abs(c) / 100).toFixed(2)}`
</script>

<template>
  <section aria-labelledby="order-heading" class="panel card">
    <h2 id="order-heading">Your order</h2>
    <p v-if="sentMessage" role="status">{{ sentMessage }}</p>
    <p v-else-if="lines.length === 0">
      {{ cleared ? 'Your order is empty. Add a supplement to continue.' : 'No supplements added yet. Add one from the list.' }}
    </p>
    <ul v-else class="lines">
      <li v-for="l in lines" :key="l.productId">
        <span class="name">{{ l.name }}</span> x{{ l.quantity }} <span>{{ dollars(l.lineTotalCents) }}</span>
        <button type="button" :aria-label="`Remove ${l.name}`" class="btn-secondary" @click="emit('remove', l.productId)">Remove</button>
      </li>
    </ul>
    <dl aria-live="polite">
      <dt>Total due</dt><dd>{{ dollars(totals.totalCents) }}</dd>
      <dt>Platform fee (0.75%)</dt><dd>-{{ dollars(totals.feeCents) }}</dd>
      <dt>Your payout</dt><dd>{{ dollars(totals.payoutCents) }}</dd>
    </dl>
    <ProblemMessage
      :problem="problem ?? null"
      :names="names"
      :copy="{ internal: 'We couldn\'t send the order. Nothing was sent. Try again.', offline: 'You\'re offline. Your order is kept; send it when you\'re back online.', validation: 'Add at least one supplement before sending.' }"
      @retry="emit('send')"
    />
    <button type="button" class="btn-primary send" :disabled="lines.length === 0 || sending" @click="emit('send')">
      {{ sending ? 'Sending…' : `Send to ${patientName}` }}
    </button>
  </section>
</template>

<style scoped>
.panel { align-self: start; position: sticky; top: 16px; }
.lines { list-style: none; padding: 0; }
.lines li { padding: 4px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.name { overflow-wrap: anywhere; }
dl { display: grid; grid-template-columns: 1fr auto; gap: 4px; }
dd { margin: 0; text-align: right; }
.send { width: 100%; margin-top: 8px; }
</style>
