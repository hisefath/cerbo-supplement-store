<!-- FE-11 OrderBreakdownPage (S4, EP-6): where every cent of one paid order went (EP-26), with FE-12 MoneyEquation at
     the top and each line's quantity, price and cost at payment below. Order number only, never the patient (FR-050). -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'

interface BreakdownLine {
  name: string
  quantity: number
  unit_price_cents: number
  unit_cost_cents: number
  line_cost_cents: number
  fee_share_cents: number
}
interface OrderBreakdown {
  order_id: number
  practice_name: string
  provider_display_name: string
  paid_at: string
  amount_paid_cents: number
  item_cost_cents: number
  provider_payout_cents: number
  platform_fee_cents: number
  adds_up: boolean
  lines: BreakdownLine[]
}

const route = useRoute()
const orderId = Number(route.params.orderId)
useHead({ title: `Order ${orderId}` })
const { data: b, error, refresh, status } = await useFetch<OrderBreakdown>(`/api/ops/orders/${orderId}`) // ST-8
// ST-1, shared with AppShell by key: the wrong-role copy names the viewer's role (acceptance Q-8; S14, AT-039).
const { data: viewer } = await useFetch<{ role: string }>('/api/session', { key: 'viewer' })
const FORBIDDEN: Record<string, string> = {
  sre: "Your role can't open order breakdowns.",
  data_analyst: 'Your role shows totals only.',
}
const forbidden = computed(() => FORBIDDEN[viewer.value?.role ?? ''] ?? 'Only platform reviewers can see order breakdowns.')

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const paidAt = computed(() => {
  if (!b.value) return ''
  const d = new Date(b.value.paid_at)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
})
const parts = computed(() =>
  b.value
    ? [
        { label: 'item cost', cents: b.value.item_cost_cents },
        { label: 'provider payout', cents: b.value.provider_payout_cents },
        { label: 'platform fee', cents: b.value.platform_fee_cents },
      ]
    : [],
)
// 0.75% of the amount in exact dollars, from integers only: amount × 75 is the fee in ten-thousandths of a cent.
const feeNote = computed(() => {
  if (!b.value) return ''
  const amount = b.value.amount_paid_cents
  const n = amount * 75
  const fee = dollars(b.value.platform_fee_cents)
  if (n % 10000 === 0) return `Fee: 0.75% of ${dollars(amount)} = ${fee}, rounded half-up once per order`
  const cents = Math.floor(n / 10000)
  const rest = String(n % 10000).padStart(4, '0').replace(/0+$/, '')
  const exact = `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}${rest}`
  return `Fee: 0.75% of ${dollars(amount)} = ${exact}, rounded half-up to ${fee}.`
})
</script>

<template>
  <AppShell>
    <section class="breakdown" aria-labelledby="breakdown-heading">
      <div class="page-band"><h1 id="breakdown-heading">Order {{ orderId }}</h1></div>
      <template v-if="status === 'pending'">
        <p role="status">Loading order {{ orderId }}…</p>
      </template>
      <ProblemMessage
        v-else-if="error"
        :problem="(error.data as Problem) ?? null"
        :copy="{
          forbidden,
          'not-found': `We can't find order ${orderId}.`,
          internal: `We couldn't load order ${orderId}. Try again.`,
        }"
        @retry="refresh"
      />
      <div v-else-if="b" class="card">
        <p>{{ b.practice_name }} · {{ b.provider_display_name }} · paid {{ paidAt }}</p>
        <OpsMoneyEquation :total="b.amount_paid_cents" :parts="parts" :balanced="b.adds_up" />
        <table class="lines">
          <thead>
            <tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Unit cost</th><th scope="col">Line cost</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in b.lines" :key="l.name">
              <td>{{ l.name }}</td>
              <td>{{ l.quantity }}</td>
              <td>{{ dollars(l.unit_price_cents) }}</td>
              <td>{{ dollars(l.unit_cost_cents) }}</td>
              <td>{{ dollars(l.line_cost_cents) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="fee">{{ feeNote }}</p>
      </div>
      <NuxtLink to="/ops/orders" class="back">Back to paid orders</NuxtLink>
    </section>
  </AppShell>
</template>

<style scoped>
.lines { width: 100%; border-collapse: collapse; }
.lines th, .lines td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); overflow-wrap: anywhere; }
.lines td:not(:first-child), .lines th:not(:first-child) { text-align: right; }
.fee { color: var(--color-ink-muted); }
.card { overflow-x: auto; }
.back { display: inline-block; min-height: 24px; margin-top: 8px; }
@media (max-width: 600px) {
  .lines thead { display: none; }
  .lines tr { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-button); margin-bottom: 8px; padding: 4px; }
  .lines td { display: block; border: 0; padding: 2px 4px; text-align: left !important; }
}
</style>
