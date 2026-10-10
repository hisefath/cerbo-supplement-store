<!-- FE-4 OrderBuilderPage (S1, EP-3): build an order from the catalog (EP-18) and send it (EP-19). -->
<script setup lang="ts">
import type { CatalogItem, DraftLine } from '~/components/order-builder/ProductPicker.vue'
import type { Problem } from '~/components/ProblemMessage.vue'
import { payoutCents, platformFeeCents, unitCostFromLowestAllowedPrice } from '~~/server/services/money'

const route = useRoute()
const patientId = Number(route.params.patientId)
const { data: catalog, error, refresh, status } = await useFetch<{ patient_display_name: string; items: CatalogItem[] }>(
  `/api/patients/${patientId}/catalog`,
)

const lines = ref<DraftLine[]>([]) // ST-3
const key = ref<string | null>(null) // ST-9: minted with the first line, reused for every retry of this draft
const problem = ref<Problem | null>(null)
const sending = ref(false)
const sentMessage = ref<string | null>(null)
const cleared = ref(false)

const patientName = computed(() => catalog.value?.patient_display_name ?? 'the patient')
useHead({ title: () => `Supplement order for ${patientName.value}` })
const byId = computed(() => new Map((catalog.value?.items ?? []).map((i) => [i.product_id, i])))
const names = computed(() => Object.fromEntries((catalog.value?.items ?? []).map((i) => [i.product_id, i.name])))
const panelLines = computed(() =>
  lines.value.flatMap((l) => {
    const item = byId.value.get(l.productId)
    return item ? [{ productId: l.productId, name: item.name, quantity: l.quantity, lineTotalCents: item.price_cents * l.quantity }] : []
  }),
)
// Same rule as BE-6 Money, so the panel matches what the server records.
const totals = computed(() => {
  let total = 0
  let cost = 0
  for (const l of lines.value) {
    const item = byId.value.get(l.productId)
    if (!item) continue
    total += item.price_cents * l.quantity
    cost += unitCostFromLowestAllowedPrice(item.lowest_allowed_price_cents) * l.quantity
  }
  const fee = platformFeeCents(total)
  return { totalCents: total, feeCents: fee, payoutCents: payoutCents(total, cost, fee) }
})

function add(productId: number, quantity: number) {
  sentMessage.value = null
  problem.value = null
  key.value ??= crypto.randomUUID()
  const existing = lines.value.find((l) => l.productId === productId)
  if (existing) existing.quantity += quantity
  else lines.value.push({ productId, quantity })
}
function remove(productId: number) {
  lines.value = lines.value.filter((l) => l.productId !== productId)
  cleared.value = lines.value.length === 0
}
async function send() {
  if (lines.value.length === 0 || sending.value) return
  sending.value = true
  problem.value = null
  try {
    await $fetch('/api/orders', {
      method: 'POST',
      headers: { 'idempotency-key': key.value ?? crypto.randomUUID() },
      body: { patient_id: patientId, lines: lines.value.map((l) => ({ product_id: l.productId, quantity: l.quantity })) },
    })
    sentMessage.value = `Sent. ${patientName.value} will get a notice to sign in and pay.`
    lines.value = []
    key.value = null
    cleared.value = false
    await refresh()
  } catch (e: unknown) {
    const data = (e as { data?: Problem }).data
    problem.value = data?.type ? data : { type: navigator.onLine ? '/problems/internal' : undefined }
  } finally {
    sending.value = false
  }
}
const pageProblem = computed<Problem | null>(() => (error.value ? (error.value.data as Problem) ?? { type: '/problems/internal' } : null))
</script>

<template>
  <AppShell>
    <header class="chart">{{ catalog?.patient_display_name ?? 'Patient' }} · chart <span>Supplements (selected)</span></header>
    <h1>Supplement order for {{ patientName }}</h1>
    <ProblemMessage
      v-if="pageProblem"
      :problem="pageProblem"
      :copy="{ 'not-found': 'You can\'t open supplement orders for this patient.', forbidden: 'You can\'t open supplement orders for this patient.' }"
      @retry="refresh()"
    />
    <p v-else-if="status === 'pending'">Loading products…</p>
    <div v-else-if="catalog" class="builder">
      <OrderBuilderProductPicker :items="catalog.items" :lines="lines" @add="add" />
      <OrderBuilderOrderPanel
        :lines="panelLines"
        :totals="totals"
        :patient-name="patientName"
        :problem="problem"
        :names="names"
        :sending="sending"
        :sent-message="sentMessage"
        :cleared="cleared"
        @remove="remove"
        @send="send"
      />
    </div>
    <p>Prices are set in Practice prices. <NuxtLink to="/practice/prices">Practice prices</NuxtLink></p>
  </AppShell>
</template>

<style scoped>
.chart { display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
.builder { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 767px) {
  .builder { grid-template-columns: 1fr; }
}
</style>
