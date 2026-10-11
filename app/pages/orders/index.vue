<!-- FE-27 PatientOrdersPage (S16, EP-42): the patient's own orders, newest sent first, 25 at a time; each row opens
     its order page (FE-7). "Show 25 more" fetches the next cursor and appends, as FE-20 does. Anyone but a patient
     gets the Permission denied copy and none of it (FR-039). -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'

interface PatientOrderSummary {
  order_id: number
  status: string
  practice_name: string
  total_cents: number
  sent_at: string
  paid_at: string | null
}
interface PatientOrderPage { data: PatientOrderSummary[]; next_cursor: string | null }

const COPY = {
  forbidden: 'Only patients have an orders list here.',
  internal: "We couldn't load your orders. Try again.",
}
const STATUS: Record<string, string> = {
  sent: 'Sent',
  in_checkout: 'In checkout',
  payment_failed: 'Payment failed',
  paid: 'Paid',
  needs_review: 'Needs review',
  cancelled: 'Cancelled',
}

useHead({ title: 'Your orders' })
const route = useRoute()
const { data: first, error, refresh, status } = await useFetch<PatientOrderPage>('/api/orders')

const problemOf = (e: unknown): Problem => (e as { data?: Problem })?.data ?? { type: '/problems/internal' }
const problem = computed<Problem | null>(() => (error.value ? problemOf(error.value) : null))
// S16 Permission denied, signed out: the sign-in page with the idle message.
if (problem.value?.type === '/problems/unauthenticated') await navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })

const more = ref<PatientOrderSummary[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
const moreProblem = ref<Problem | null>(null)
let gen = 0 // bumps when the first page reloads, so a late Show 25 more page is dropped
watch(first, (p) => {
  gen++
  more.value = []
  moreProblem.value = null
  nextCursor.value = p?.next_cursor ?? null
}, { immediate: true })
const orders = computed(() => [...(first.value?.data ?? []), ...more.value])

async function showMore() {
  if (!nextCursor.value || loadingMore.value) return
  const g = gen
  loadingMore.value = true
  try {
    const page = await $fetch<PatientOrderPage>('/api/orders', { query: { cursor: nextCursor.value } })
    if (g !== gen) return
    more.value.push(...page.data)
    nextCursor.value = page.next_cursor
    moreProblem.value = null
  } catch (e: unknown) {
    if (g === gen) moreProblem.value = problemOf(e)
  } finally {
    loadingMore.value = false
  }
}

// S16 Loading: "Loading your orders…", then after 10 s "Still loading. Try again in a moment."
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
watch(status, (s) => {
  clearTimeout(slowTimer)
  slow.value = false
  if (s === 'pending') slowTimer = setTimeout(() => (slow.value = true), 10_000)
})
onBeforeUnmount(() => clearTimeout(slowTimer))

const dollars = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// UTC on server and browser alike, so the SSR text and the hydrated text match.
const short = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const long = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
const word = (s: string) => STATUS[s] ?? s
// S16 Accessibility: "Order 1002 from Willow Creek Wellness, $60.00, Sent on October 11"
const sentence = (o: PatientOrderSummary) => `Order ${o.order_id} from ${o.practice_name}, ${dollars(o.total_cents)}, ${word(o.status)} on ${long(o.paid_at ?? o.sent_at)}`
</script>

<template>
  <AppShell>
    <section class="patient-orders" aria-labelledby="orders-heading">
      <div class="page-band"><h1 id="orders-heading">Your orders</h1></div>
      <ProblemMessage v-if="problem?.type === '/problems/forbidden'" :problem="problem" :copy="COPY" />
      <p v-else-if="status === 'pending'" role="status">{{ slow ? 'Still loading. Try again in a moment.' : 'Loading your orders…' }}</p>
      <ProblemMessage v-else-if="problem" :problem="problem" :copy="COPY" @retry="refresh()" />
      <template v-else-if="first">
        <div class="card">
          <p v-if="orders.length === 0">No orders yet. Your practice will send you a message when they order supplements for you.</p>
          <ul v-else class="list">
            <li v-for="o in orders" :key="o.order_id">
              <NuxtLink :to="`/orders/${o.order_id}`" class="row" :aria-label="sentence(o)">
                <span class="what">Order {{ o.order_id }} · {{ o.practice_name }}</span>
                <span class="total">{{ dollars(o.total_cents) }}</span>
                <span :class="['status-pill', `status-pill--${o.status}`]">{{ word(o.status) }}</span>
                <span class="when">Sent {{ short(o.sent_at) }}<template v-if="o.paid_at"> · Paid {{ short(o.paid_at) }}</template></span>
                <span class="open">Open ›</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
        <ProblemMessage v-if="moreProblem" :problem="moreProblem" :copy="COPY" @retry="showMore" />
        <button v-if="nextCursor" type="button" class="btn-secondary" :disabled="loadingMore" @click="showMore">Show 25 more</button>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; }
.list li { border-bottom: 1px solid var(--color-border); }
.list li:last-child { border-bottom: 0; }
.row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 4px 16px;
  align-items: center;
  padding: 8px 4px;
  min-height: 24px;
  color: var(--color-ink);
  text-decoration: none;
}
.what { overflow-wrap: anywhere; font-weight: 600; }
.total { text-align: right; }
.when { grid-column: 1 / 3; color: var(--color-ink-muted); }
.open { grid-column: 3; text-align: right; color: var(--color-primary); text-decoration: underline; }
.btn-secondary { min-height: 24px; margin-top: 8px; }
@media (max-width: 600px) {
  .row { grid-template-columns: 1fr auto; }
  .what { grid-column: 1 / -1; }
  .when { grid-column: 1 / -1; }
  .open { grid-column: 1 / -1; text-align: left; }
}
</style>
