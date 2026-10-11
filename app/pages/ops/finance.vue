<!-- FE-18 FinancialReportPage (S11, EP-11, SEQ-9): the balance equation first (FE-12), revenue two ways, then each
     provider's payout (25 at a time). Owns ST-7 in the URL (`month`, or `from` and `to`) and ST-8 (EP-34). Export is a
     plain link to EP-35 with the same query, so the browser downloads it. Order numbers only, never a patient. -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'

interface ProviderPayout { provider_display_name: string; practice_name: string; payout_cents: number }
interface FinancialReport {
  from: string
  to: string
  patient_payments_cents: number
  item_cost_cents: number
  provider_payouts_cents: number
  platform_fees_cents: number
  balanced: boolean
  gap_cents: number
  gap_order_ids: number[]
  gross_revenue_cents: number
  net_revenue_cents: number
  payouts_by_provider: ProviderPayout[]
}

useHead({ title: 'Financial report' })
const route = useRoute()
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const thisMonth = new Date().toISOString().slice(0, 7)
// ST-7: a range when both dates are given, otherwise a month ('' = the current month, as the server reads it).
const range = computed(() => (str(route.query.from) && str(route.query.to) ? { from: str(route.query.from), to: str(route.query.to) } : null))
const month = computed(() => str(route.query.month) || thisMonth)
const query = computed(() => range.value ?? { month: month.value })
const { data: r, error, refresh, status } = await useFetch<FinancialReport>('/api/ops/finance/report', { query }) // ST-8

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const dateName = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const periodName = computed(() =>
  range.value
    ? `${dateName(range.value.from)} to ${dateName(range.value.to)}`
    : new Date(`${month.value}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
)
const exportHref = computed(() => `/api/ops/finance/export?${new URLSearchParams(query.value).toString()}`)
const parts = computed(() =>
  r.value
    ? [
        { label: 'item cost', cents: r.value.item_cost_cents },
        { label: 'provider payouts', cents: r.value.provider_payouts_cents },
        { label: 'platform fees', cents: r.value.platform_fees_cents },
      ]
    : [],
)
const empty = computed(() => !!r.value && r.value.patient_payments_cents === 0 && r.value.payouts_by_provider.length === 0 && r.value.gap_order_ids.length === 0)
const shown = ref(25)
watch(query, () => (shown.value = 25))

const problem = computed<Problem | null>(() => (error.value ? ((error.value.data as Problem) ?? { type: '/problems/internal' }) : null))
// S11 Permission denied, signed out: the sign-in page with the idle message.
if (problem.value?.type === '/problems/unauthenticated') await navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })

const pickMonth = (m: string) => navigateTo({ query: m ? { month: m } : {} })
const fromInput = ref(range.value?.from ?? '')
const toInput = ref(range.value?.to ?? '')
const pickRange = () => {
  if (fromInput.value && toInput.value) navigateTo({ query: { from: fromInput.value, to: toInput.value } })
}
</script>

<template>
  <AppShell>
    <section class="finance" aria-labelledby="finance-heading">
      <div class="page-band"><h1 id="finance-heading">Financial report</h1></div>
      <ProblemMessage
        v-if="problem && problem.type === '/problems/forbidden'"
        :problem="problem"
        :copy="{ forbidden: 'Only the finance lead can run financial reports.' }"
      />
      <template v-else>
        <div class="controls card">
          <fieldset class="period">
            <legend>Period</legend>
            <p class="helper">A month, or choose a start and end date.</p>
            <MonthPicker :value="range ? '' : month" @change="pickMonth" />
            <form class="range" @submit.prevent="pickRange">
              <label>From <input v-model="fromInput" type="date" required></label>
              <label>To <input v-model="toInput" type="date" required></label>
              <button type="submit" class="btn-secondary">Show range</button>
            </form>
          </fieldset>
          <a v-if="r" :href="exportHref" class="btn-primary export" download>Export {{ periodName }}</a>
        </div>

        <p v-if="status === 'pending'" role="status">Building {{ periodName }}…</p>
        <ProblemMessage
          v-else-if="problem"
          :problem="problem"
          :copy="{ internal: 'We couldn\'t build the report. Try again.' }"
          @retry="refresh"
        />
        <template v-else-if="r">
          <div class="card">
            <h2>{{ range ? `${dateName(r.from)} to ${dateName(r.to)}` : periodName }}</h2>
            <p v-if="empty" role="status">No orders were paid in {{ periodName }}. Every total is $0.00.</p>
            <OpsMoneyEquation :total="r.patient_payments_cents" :parts="parts" :balanced="r.balanced" period :gap-order-ids="r.gap_order_ids" />
          </div>

          <div class="card">
            <h2>Revenue, two views (your accountant decides which applies)</h2>
            <dl class="revenue">
              <dt>Gross:</dt><dd><span class="amount">{{ dollars(r.gross_revenue_cents) }}</span> all patient payments</dd>
              <dt>Net:</dt><dd><span class="amount">{{ dollars(r.net_revenue_cents) }}</span> platform fees only</dd>
            </dl>
          </div>

          <div class="card">
            <h2>Payouts by provider</h2>
            <p v-if="r.payouts_by_provider.length === 0">No provider payouts in {{ periodName }}.</p>
            <ul v-else class="payouts">
              <li v-for="p in r.payouts_by_provider.slice(0, shown)" :key="`${p.provider_display_name}|${p.practice_name}`">
                <span>{{ p.provider_display_name }} · {{ p.practice_name }}</span><span class="amount">{{ dollars(p.payout_cents) }}</span>
              </li>
            </ul>
            <button v-if="r.payouts_by_provider.length > shown" type="button" class="btn-secondary" @click="shown += 25">Show 25 more</button>
          </div>
          <p class="note">Records are kept for at least 3 years.</p>
        </template>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.card { margin-bottom: var(--space-section); }
.controls { display: flex; flex-wrap: wrap; gap: var(--space-card); align-items: flex-start; justify-content: space-between; }
.period { border: 0; margin: 0; padding: 0; display: grid; gap: 8px; }
.period legend { font-weight: 600; padding: 0; }
.helper, .note { color: var(--color-ink-muted); margin: 0; }
.range { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.range input { min-height: 24px; }
.export { display: inline-flex; align-items: center; text-decoration: none; }
.revenue { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 0; }
.revenue dd { margin: 0; }
.amount { font-variant-numeric: tabular-nums; font-weight: 600; }
.payouts { list-style: none; margin: 0; padding: 0; }
.payouts li { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--color-border); overflow-wrap: anywhere; }
@media (max-width: 600px) {
  .revenue { grid-template-columns: 1fr; }
  .payouts li { flex-direction: column; }
}
</style>
