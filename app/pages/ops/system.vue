<!-- FE-21 SystemHealthPage (S14, EP-14, SEQ-12): availability, error rate and slow page share for one month (EP-39)
     against their targets. Owns ST-7 (`month` in the URL) and ST-8. Figures are rounded here to one decimal, half-up
     (acceptance Q-7); the API sends them unrounded. Met or missed is a word, never colour alone. -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'

interface SystemHealth {
  month: string
  partial_month: boolean
  availability_percent: number | null
  availability_target_percent: number
  error_rate_percent: number | null
  slow_page_percent: number | null
  slow_page_target_percent: number
}

useHead({ title: 'System health' })
const route = useRoute()
const thisMonth = new Date().toISOString().slice(0, 7)
const month = computed(() => (typeof route.query.month === 'string' && route.query.month) || thisMonth)
const { data: h, error, refresh, status } = await useFetch<SystemHealth>('/api/ops/system-health', { query: { month } }) // ST-8

const problem = computed<Problem | null>(() => (error.value ? ((error.value.data as Problem) ?? { type: '/problems/internal' }) : null))
// S14 Permission denied, signed out: the sign-in page with the idle message.
if (problem.value?.type === '/problems/unauthenticated') await navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })

const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
// One decimal, half-up; the epsilon keeps 99.65 (stored as 99.6499…) rounding up.
const round = (x: number) => Math.round(x * 10 + 1e-9) / 10
const pct = (x: number | null) => (x === null ? 'No data' : `${round(x)}%`)

interface Row { name: string; value: string; target: string; met: string; sentence: string }
const rows = computed<Row[]>(() => {
  const r = h.value
  if (!r) return []
  const avail = r.availability_percent === null ? null : round(r.availability_percent)
  const slow = r.slow_page_percent === null ? null : round(r.slow_page_percent)
  const availMet = avail === null ? '-' : avail >= r.availability_target_percent ? 'yes' : 'no'
  const slowMet = slow === null ? '-' : slow <= r.slow_page_target_percent ? 'yes' : 'no'
  return [
    {
      name: 'Availability',
      value: pct(r.availability_percent),
      target: `${r.availability_target_percent}%`,
      met: availMet,
      sentence:
        availMet === 'no'
          ? `Availability ${avail}%, target ${r.availability_target_percent}%: missed by ${round(r.availability_target_percent - avail!)} points.`
          : `Availability ${pct(r.availability_percent)}, target ${r.availability_target_percent}%${availMet === 'yes' ? ', met' : ''}`,
    },
    { name: 'Error rate', value: pct(r.error_rate_percent), target: 'n/a', met: '-', sentence: `Error rate ${pct(r.error_rate_percent)}` },
    {
      name: 'Pages slower than 2 s',
      value: pct(r.slow_page_percent),
      target: `${r.slow_page_target_percent}% at most`,
      met: slowMet,
      sentence:
        slowMet === 'no'
          ? `Pages slower than 2 s ${slow}%, target ${r.slow_page_target_percent}% at most: missed by ${round(slow! - r.slow_page_target_percent)} points.`
          : `Pages slower than 2 s ${pct(r.slow_page_percent)}, target ${r.slow_page_target_percent}% at most${slowMet === 'yes' ? ', met' : ''}`,
    },
  ]
})
const empty = computed(() => !!h.value && h.value.availability_percent === null && h.value.error_rate_percent === null && h.value.slow_page_percent === null)
const missed = computed(() => rows.value.filter((r) => r.met === 'no'))

// theme.css pill pairs (green, amber, grey) by their order-status modifiers; the word says met or not.
const PILL: Record<string, string> = { yes: 'status-pill--paid', no: 'status-pill--needs_review', '-': 'status-pill--cancelled' }
const pickMonth = (m: string) => navigateTo({ query: m ? { month: m } : {} })
</script>

<template>
  <AppShell>
    <section class="system" aria-labelledby="system-heading">
      <div class="page-band"><h1 id="system-heading">System health</h1></div>
      <ProblemMessage
        v-if="problem && problem.type === '/problems/forbidden'"
        :problem="problem"
        :copy="{ forbidden: 'Only the SRE can see system health.' }"
      />
      <template v-else>
        <div class="card controls">
          <MonthPicker :value="month" @change="pickMonth" />
        </div>
        <p v-if="status === 'pending'" role="status">Loading system health…</p>
        <ProblemMessage
          v-else-if="problem"
          :problem="problem"
          :copy="{ internal: 'We couldn\'t load system health. Try again.' }"
          @retry="refresh"
        />
        <div v-else-if="h" class="card">
          <p role="status">
            {{ h.partial_month ? `${monthName(h.month)} so far (partial month).` : empty ? `No traffic in ${monthName(h.month)}.` : `Showing ${monthName(h.month)}.` }}
          </p>
          <table class="measures">
            <thead>
              <tr><th scope="col">Measure</th><th scope="col">This month</th><th scope="col">Target</th><th scope="col">Met</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.name" :aria-label="r.sentence">
                <th scope="row">{{ r.name }}</th>
                <td>{{ r.value }}</td>
                <td>{{ r.target }}</td>
                <td><span :class="['status-pill', PILL[r.met]]">{{ r.met }}</span></td>
              </tr>
            </tbody>
          </table>
          <p v-for="r in missed" :key="r.name" class="missed">{{ r.sentence }}</p>
          <p class="note">Planned downtime window 05:00-11:00 UTC</p>
        </div>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.card { margin-bottom: var(--space-section); }
.measures { width: 100%; border-collapse: collapse; }
.measures th, .measures td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); }
.measures tbody th { font-weight: 500; }
.note { color: var(--color-ink-muted); }
.missed { font-weight: 600; }
@media (max-width: 600px) {
  .measures thead { display: none; }
  .measures tr { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-button); margin-bottom: 8px; padding: 4px; }
  .measures th, .measures td { display: block; border: 0; padding: 2px 4px; }
}
</style>
