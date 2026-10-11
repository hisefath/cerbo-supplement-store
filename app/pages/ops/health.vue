<!-- FE-17 PlatformHealthPage (S10-V2, EP-10, SEQ-8): the month's order funnel, measures past their alert line pinned on
     top, and volume per practice, totals only (FR-053): nothing here links to a single order. Owns ST-7 (`month` in the
     URL) and ST-8; practice rows show 25 at a time from the list already fetched. -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'
import type { Funnel } from '~/components/ops-health/OrderFunnel.vue'

interface Measure { name: string; value: number; alert_line: number | null; needs_attention: boolean }
interface PracticeVolume { practice_name: string; paid_cents: number; fees_cents: number; orders_sent: number; orders_paid: number }
interface PlatformHealth {
  month: string
  funnel: Funnel
  median_minutes_to_pay: number | null
  out_of_stock_refusals: number
  orders_needing_review: number
  measures: Measure[]
  practices: PracticeVolume[]
}

useHead({ title: 'Platform health' })
const route = useRoute()
const thisMonth = new Date().toISOString().slice(0, 7)
const month = computed(() => (typeof route.query.month === 'string' && route.query.month) || thisMonth)
const { data: h, error, refresh, status } = await useFetch<PlatformHealth>('/api/ops/health', { query: { month } }) // ST-8

const problem = computed<Problem | null>(() => (error.value ? ((error.value.data as Problem) ?? { type: '/problems/internal' }) : null))
if (problem.value?.type === '/problems/unauthenticated') await navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })

const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const monthOnly = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const duration = (min: number) => (min < 60 ? `${min} min` : `${Math.round((min / 60) * 10) / 10} h`)

const flagged = computed(() => h.value?.measures.filter((m) => m.needs_attention) ?? [])
const flaggedText = (m: Measure) => `${m.name} (${m.value})`
const attention = computed(() => {
  const f = flagged.value
  if (f.length === 0) return ''
  return f.length === 1 ? `1 measure needs attention: ${flaggedText(f[0]!)}` : `${f.length} measures need attention:`
})
const reviewFlagged = computed(() => flagged.value.some((m) => m.name === 'orders needing review'))
const fewOrders = computed(() => !!h.value && h.value.funnel.sent > 0 && h.value.funnel.sent < 5)

const shown = ref(25) // local UI: practice rows revealed from the list already fetched
watch(month, () => (shown.value = 25))
const pickMonth = (m: string) => navigateTo({ query: m ? { month: m } : {} })
</script>

<template>
  <AppShell>
    <section class="health" aria-labelledby="health-heading">
      <div class="page-band"><h1 id="health-heading">Platform health</h1></div>
      <ProblemMessage
        v-if="problem && problem.type === '/problems/forbidden'"
        :problem="problem"
        :copy="{ forbidden: 'Only operations staff can see platform health.' }"
      />
      <template v-else>
        <div class="card controls">
          <MonthPicker :value="month" @change="pickMonth" />
        </div>
        <p v-if="status === 'pending'" role="status">Loading {{ monthName(month) }}…</p>
        <ProblemMessage
          v-else-if="problem"
          :problem="problem"
          :copy="{ internal: `We couldn't load ${monthOnly(month)}'s figures. Try again.` }"
          @retry="refresh"
        />
        <template v-else-if="h">
          <div v-if="attention" class="card attention">
            <p><strong>! {{ attention }}</strong></p>
            <ul v-if="flagged.length > 1">
              <li v-for="m in flagged" :key="m.name">{{ flaggedText(m) }}</li>
            </ul>
          </div>
          <div class="card">
            <h2>Order funnel</h2>
            <p role="status">{{ h.funnel.sent === 0 ? `No orders were sent in ${monthName(h.month)}.` : `Showing ${monthName(h.month)}.` }}</p>
            <OpsHealthOrderFunnel :funnel="h.funnel" />
            <p v-if="fewOrders" class="note">Few orders this month; read the counts, not the bars.</p>
            <p v-if="h.median_minutes_to_pay !== null">Median time from sent to paid: {{ duration(h.median_minutes_to_pay) }}</p>
          </div>
          <div class="card">
            <p>
              Out-of-stock refusals {{ h.out_of_stock_refusals }} · Orders needing review {{ h.orders_needing_review }}
              <span v-if="reviewFlagged" class="status-pill status-pill--needs_review">! Needs attention</span>
            </p>
            <p class="note">Alert line set after 30 days of orders.</p>
          </div>
          <div class="card">
            <h2>In-house volume by practice</h2>
            <table class="volume">
              <thead>
                <tr><th scope="col">Practice</th><th scope="col">Paid</th><th scope="col">Fees</th><th scope="col">Sent</th><th scope="col">Paid orders</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in h.practices.slice(0, shown)" :key="p.practice_name">
                  <th scope="row">{{ p.practice_name }}</th>
                  <td>{{ dollars(p.paid_cents) }}</td>
                  <td>{{ dollars(p.fees_cents) }}</td>
                  <td>{{ p.orders_sent }}</td>
                  <td>{{ p.orders_paid }}</td>
                </tr>
              </tbody>
            </table>
            <button v-if="h.practices.length > shown" type="button" class="btn-secondary" @click="shown += 25">Show 25 more</button>
            <p class="note">Totals only: single orders open in Paid orders.</p>
            <p class="note">Questions? Contact platform support</p>
          </div>
        </template>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.card { margin-bottom: var(--space-section); }
.note { color: var(--color-ink-muted); }
.volume { width: 100%; border-collapse: collapse; }
.volume th, .volume td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); }
.volume tbody th { font-weight: 500; }
.btn-secondary { min-height: 24px; }
@media (max-width: 600px) {
  .volume thead { display: none; }
  .volume tr { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-button); margin-bottom: 8px; padding: 4px; }
  .volume th, .volume td { display: block; border: 0; padding: 2px 4px; }
}
</style>
