<!-- FE-10 OpsOrderListPage (S3, EP-5): paid orders (or the review list) by order number, newest first, from EP-25.
     Filter, number search and cursor live in the URL (ST-5). No patient name or contact detail (FR-050). -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'

interface OpsOrderSummary {
  order_id: number
  practice_name: string
  provider_display_name: string
  amount_paid_cents: number
  status: string
  paid_at: string | null
}
interface OpsOrderPage {
  data: OpsOrderSummary[]
  needs_review_count: number
  next_cursor: string | null
}

useHead({ title: 'Paid orders' })
const route = useRoute()
const router = useRouter()
const one = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined)
const query = computed(() => ({
  status: one(route.query.status) === 'needs_review' ? 'needs_review' : 'paid',
  number: one(route.query.number),
  cursor: one(route.query.cursor),
}))
const { data: page, error, refresh, status } = await useFetch<OpsOrderPage>('/api/ops/orders', { query }) // ST-8

const search = ref(query.value.number ?? '')
const searchError = ref('')
function find() {
  const n = search.value.trim()
  if (n !== '' && !/^\d+$/.test(n)) {
    searchError.value = 'Order numbers are digits only, like 1042.'
    return
  }
  searchError.value = ''
  router.push({ query: { status: query.value.status, ...(n ? { number: n } : {}) } })
}
const tab = (s: 'paid' | 'needs_review') => ({ query: { status: s } })

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')
const emptyText = computed(() => {
  if (query.value.number) return `No order ${query.value.number}. Check the number and try again.`
  return query.value.status === 'paid' ? 'No paid orders yet.' : 'Nothing needs review.'
})
</script>

<template>
  <AppShell>
    <section class="ops-orders" aria-labelledby="ops-orders-heading">
      <h1 id="ops-orders-heading">Paid orders</h1>
      <nav class="tabs" aria-label="Order lists">
        <NuxtLink :to="tab('paid')" :aria-current="query.status === 'paid' ? 'page' : undefined">Paid</NuxtLink>
        <NuxtLink :to="tab('needs_review')" :aria-current="query.status === 'needs_review' ? 'page' : undefined">
          Needs review ({{ page?.needs_review_count ?? 0 }})
        </NuxtLink>
      </nav>
      <form class="find" @submit.prevent="find">
        <label for="order-number">Find an order by number</label>
        <input id="order-number" v-model="search" inputmode="numeric" aria-describedby="order-number-help order-number-error" />
        <button type="submit">Find</button>
        <p id="order-number-help" class="helper">Digits only, like 1042.</p>
        <p v-if="searchError" id="order-number-error" role="alert">{{ searchError }}</p>
      </form>

      <p v-if="status === 'pending'" role="status">Loading orders…</p>
      <ProblemMessage
        v-else-if="error"
        :problem="(error.data as Problem) ?? null"
        :copy="{ forbidden: 'Only platform reviewers can see paid orders.', internal: 'We couldn\'t load orders. Try again.' }"
        @retry="refresh"
      />
      <template v-else-if="page">
        <p v-if="page.data.length === 0">{{ emptyText }}</p>
        <template v-else>
          <p role="status">Showing {{ page.data.length }} {{ query.status === 'paid' ? 'paid orders' : 'orders that need review' }}.</p>
          <table class="list">
            <thead>
              <tr><th scope="col">Order</th><th scope="col">Practice</th><th scope="col">Provider</th><th scope="col">Amount</th><th scope="col">Paid at</th></tr>
            </thead>
            <tbody>
              <tr v-for="o in page.data" :key="o.order_id">
                <td>
                  <NuxtLink :to="`/ops/orders/${o.order_id}`" :aria-label="`Order ${o.order_id}, ${dollars(o.amount_paid_cents)}, paid ${day(o.paid_at)}`">
                    {{ o.order_id }}
                  </NuxtLink>
                </td>
                <td>{{ o.practice_name }}</td>
                <td>{{ o.provider_display_name }}</td>
                <td>{{ dollars(o.amount_paid_cents) }}</td>
                <td>{{ day(o.paid_at) }}</td>
              </tr>
            </tbody>
          </table>
          <NuxtLink v-if="page.next_cursor" :to="{ query: { status: query.status, cursor: page.next_cursor } }">Show 25 more</NuxtLink>
        </template>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.tabs { display: flex; gap: 16px; margin: 8px 0; }
.tabs a { min-height: 24px; padding: 4px 0; }
.tabs a[aria-current='page'] { font-weight: 600; text-decoration: underline; }
.find { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0 16px; }
.find label { flex-basis: 100%; }
.helper { flex-basis: 100%; margin: 0; color: #444; font-size: 14px; }
.list { width: 100%; border-collapse: collapse; }
.list th, .list td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
.list a { display: inline-block; min-height: 24px; }
@media (max-width: 600px) {
  .list thead { display: none; }
  .list tr { display: block; border: 1px solid #ddd; margin-bottom: 8px; padding: 4px; }
  .list td { display: block; border: 0; padding: 2px 4px; }
}
</style>
