<!-- FE-15 PracticeDashboardPage (S6, SEQ-5): attention items first, then the month's orders (EP-30, 25 at a time,
     Cancel order calls EP-20), then sales and stock (EP-29). Owns ST-7 (the month, UTC per Q-3), ST-12 (the order
     being cancelled) and ST-8 (each section's load state). -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'

interface AttentionItem { kind: 'awaiting_payment' | 'low_stock' | 'out_of_stock'; label: string; order_id: number | null; product_id: number | null }
interface ProductSales { product_id: number; name: string; units_sold: number; patients_paid_cents: number; provider_payout_cents: number; units_in_stock: number }
interface PracticeDashboard { month: string; attention: AttentionItem[]; sales: ProductSales[] }
interface PracticeOrder { order_id: number; patient_display_name: string; total_cents: number; status: string; sent_at: string; paid_at: string | null }
interface PracticeOrderPage { data: PracticeOrder[]; next_cursor: string | null }

useHead({ title: 'Practice dashboard' })
const month = ref(new Date().toISOString().slice(0, 7)) // ST-7
const monthName = computed(() =>
  new Date(`${month.value}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
)

const dash = await useFetch<PracticeDashboard>('/api/practice/dashboard', { query: { month } }) // ST-8
const list = await useFetch<PracticeOrderPage>('/api/practice/orders', { query: { month } })
const more = ref<PracticeOrder[]>([])
const nextCursor = ref<string | null>(null)
watch(list.data, (p) => {
  more.value = []
  nextCursor.value = p?.next_cursor ?? null
}, { immediate: true })
const orders = computed(() => [...(list.data.value?.data ?? []), ...more.value])
const moreProblem = ref<Problem | null>(null)

async function showMore() {
  if (!nextCursor.value) return
  try {
    const page = await $fetch<PracticeOrderPage>('/api/practice/orders', { query: { month: month.value, cursor: nextCursor.value } })
    more.value.push(...page.data)
    nextCursor.value = page.next_cursor
    moreProblem.value = null
  } catch (e: unknown) {
    moreProblem.value = (e as { data?: Problem }).data ?? { type: '/problems/internal' }
  }
}

const dollars = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) : '-'
const STATUS: Record<string, string> = {
  sent: 'Sent',
  in_checkout: 'In checkout',
  payment_failed: 'Payment failed',
  paid: 'Paid',
  needs_review: 'Needs review',
  cancelled: 'Cancelled',
}

/** S6: "Ben Ortiz · $30.00 · awaiting payment for 4 days" and "Omega-3 Fish Oil · low stock: 3 left". */
function attentionText(a: AttentionItem): string {
  if (a.kind === 'out_of_stock') return a.label
  const order = a.order_id === null ? undefined : orders.value.find((o) => o.order_id === a.order_id)
  const product = dash.data.value?.sales.find((s) => s.product_id === a.product_id)
  const who = order ? `${order.patient_display_name} · ${dollars(order.total_cents)} · ` : product ? `${product.name} · ` : a.order_id ? `Order ${a.order_id} · ` : ''
  return who + a.label
}

// ST-12: the order whose cancellation is being confirmed.
const cancelling = ref<PracticeOrder | null>(null)
const busy = ref(false)
const success = ref('')
const rowProblem = ref<{ id: number; problem: Problem } | null>(null)

async function confirmCancel() {
  const o = cancelling.value
  if (!o || busy.value) return
  busy.value = true
  try {
    await $fetch(`/api/orders/${o.order_id}/cancel`, { method: 'POST' })
    success.value = `Order ${o.order_id} cancelled. ${o.patient_display_name} will see that your practice cancelled it.`
    rowProblem.value = null
    cancelling.value = null
    await Promise.all([list.refresh(), dash.refresh()])
  } catch (e: unknown) {
    rowProblem.value = { id: o.order_id, problem: (e as { data?: Problem }).data ?? { type: '/problems/internal' } }
    cancelling.value = null
  } finally {
    busy.value = false
  }
}

const cancelCopy = computed(() => {
  const o = orders.value.find((x) => x.order_id === rowProblem.value?.id)
  return {
    'invalid-transition': o?.status === 'paid' ? "This order is paid, so it can't be cancelled." : "This order can't be cancelled: the patient has started checkout.",
    internal: "We couldn't cancel the order. It is unchanged. Try again.",
  }
})
const problemOf = (e: unknown): Problem | null => (e ? ((e as { data?: Problem }).data ?? { type: '/problems/internal' }) : null)
const forbiddenCopy = { forbidden: 'Only providers at this practice can see this dashboard.' }
</script>

<template>
  <AppShell>
    <section class="dashboard" aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading">Practice dashboard</h1>
      <label class="month">Month <input v-model="month" type="month" required></label>
      <p role="status">{{ dash.status.value === 'pending' ? `Loading ${monthName}…` : `Showing ${monthName}.` }} Times in UTC.</p>
      <p class="success" role="status">{{ success }}</p>

      <h2>Needs attention</h2>
      <ProblemMessage v-if="dash.error.value" :problem="problemOf(dash.error.value)" :copy="forbiddenCopy" @retry="dash.refresh()" />
      <template v-else-if="dash.data.value">
        <p v-if="dash.data.value.attention.length === 0">Nothing needs attention.</p>
        <ul v-else class="attention">
          <li v-for="(a, i) in dash.data.value.attention" :key="i"><span aria-hidden="true">! </span>{{ attentionText(a) }}</li>
        </ul>
      </template>

      <h2>Orders</h2>
      <ProblemMessage
        v-if="list.error.value"
        :problem="problemOf(list.error.value)"
        :copy="{ ...forbiddenCopy, internal: 'We couldn\'t load your orders. Try again.' }"
        @retry="list.refresh()"
      />
      <template v-else-if="list.data.value">
        <p v-if="orders.length === 0">No orders were sent in {{ monthName }}.</p>
        <table v-else class="list">
          <thead>
            <tr><th scope="col">Patient</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Sent</th><th scope="col">Paid</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.order_id">
              <td>{{ o.patient_display_name }}</td>
              <td>{{ dollars(o.total_cents) }}</td>
              <td>{{ STATUS[o.status] ?? o.status }}</td>
              <td>{{ when(o.sent_at) }}</td>
              <td>{{ when(o.paid_at) }}</td>
              <td>
                <button v-if="o.status === 'sent' || o.status === 'payment_failed'" type="button" @click="cancelling = o">Cancel order</button>
                <ProblemMessage v-if="rowProblem?.id === o.order_id" :problem="rowProblem.problem" :copy="cancelCopy" @retry="cancelling = o" />
              </td>
            </tr>
          </tbody>
        </table>
        <button v-if="nextCursor" type="button" @click="showMore">Show 25 more</button>
        <ProblemMessage v-if="moreProblem" :problem="moreProblem" :copy="{ internal: 'We couldn\'t load your orders. Try again.' }" @retry="showMore" />
      </template>

      <h2>Sales and stock</h2>
      <table v-if="dash.data.value" class="list">
        <thead>
          <tr><th scope="col">Product</th><th scope="col">Sold</th><th scope="col">Patients paid</th><th scope="col">Your payout</th><th scope="col">Stock</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in dash.data.value.sales" :key="s.product_id">
            <td>{{ s.name }}</td>
            <td>{{ s.units_sold }}</td>
            <td>{{ dollars(s.patients_paid_cents) }}</td>
            <td>{{ dollars(s.provider_payout_cents) }}</td>
            <td>{{ s.units_in_stock === 0 ? 'Out of stock' : s.units_in_stock }}</td>
          </tr>
        </tbody>
      </table>
      <p>Questions? Contact platform support</p>

      <div v-if="cancelling" role="dialog" aria-modal="true" aria-labelledby="cancel-heading" class="dialog">
        <p id="cancel-heading">
          Cancel {{ cancelling.patient_display_name }}'s {{ dollars(cancelling.total_cents) }} order?
          {{ cancelling.patient_display_name.split(' ')[0] }} will see that your practice cancelled it. This can't be undone.
        </p>
        <button type="button" :disabled="busy" @click="confirmCancel">{{ busy ? 'Cancelling…' : 'Cancel order' }}</button>
        <button type="button" autofocus @click="cancelling = null">Keep order</button>
      </div>
    </section>
  </AppShell>
</template>

<style scoped>
.list { width: 100%; border-collapse: collapse; }
.list th, .list td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
button { min-height: 24px; min-width: 24px; }
.attention { list-style: none; padding: 0; }
.attention li { padding: 4px 0; }
.dialog { border: 1px solid #999; padding: 12px; background: #fff; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 600px) {
  .list thead { display: none; }
  .list tr { display: block; border: 1px solid #ddd; margin-bottom: 8px; padding: 4px; }
  .list td { display: block; border: 0; padding: 2px 4px; }
}
</style>
