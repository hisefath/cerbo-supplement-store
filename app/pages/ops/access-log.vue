<!-- FE-20 AccessLogPage (S13, EP-13, SEQ-11): every role grant, removal and refused attempt in a month, newest first,
     25 at a time (EP-38). Owns ST-7 in the URL (`month`) and ST-8; "Show 25 more" fetches the next cursor and appends,
     as FE-15 does. Only the finance lead sees entries; anyone else gets the Permission denied state and none of them. -->
<script setup lang="ts">
import { ROLE_LABELS } from '~/components/ops-access/RoleDialog.vue'
import type { Problem } from '~/components/ProblemMessage.vue'

interface AccessLogEntry {
  at: string
  actor_display_name: string
  target_display_name: string
  from_role: string
  to_role: string
  reason: string
  outcome: 'granted' | 'refused'
}
interface AccessLogPage { data: AccessLogEntry[]; next_cursor: string | null }

const COPY = {
  forbidden: 'Only the finance lead reviews the access log.',
  internal: "We couldn't load the access log. Try again.",
}

useHead({ title: 'Access log' })
const route = useRoute()
const thisMonth = new Date().toISOString().slice(0, 7)
const month = computed(() => (typeof route.query.month === 'string' && route.query.month) || thisMonth) // ST-7
const monthName = computed(() => new Date(`${month.value}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }))
const { data: first, error, refresh, status } = await useFetch<AccessLogPage>('/api/ops/access-log', { query: { month } }) // ST-8

const problemOf = (e: unknown): Problem => (e as { data?: Problem })?.data ?? { type: '/problems/internal' }
const problem = computed<Problem | null>(() => (error.value ? problemOf(error.value) : null))
// S13 Permission denied, signed out: the sign-in page with the idle message.
if (problem.value?.type === '/problems/unauthenticated') await navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })

const more = ref<AccessLogEntry[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
const moreProblem = ref<Problem | null>(null)
let gen = 0 // bumps when the month or the first page changes, so a late Show 25 more page is dropped
watch(month, () => gen++)
watch(first, (p) => {
  gen++
  more.value = []
  moreProblem.value = null
  nextCursor.value = p?.next_cursor ?? null
}, { immediate: true })
const entries = computed(() => [...(first.value?.data ?? []), ...more.value])

async function showMore() {
  if (!nextCursor.value || loadingMore.value) return
  const g = gen
  loadingMore.value = true
  try {
    const page = await $fetch<AccessLogPage>('/api/ops/access-log', { query: { month: month.value, cursor: nextCursor.value } })
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

// S13 Loading: "Loading the access log…", then after 10 s "Still loading."
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
watch(status, (s) => {
  clearTimeout(slowTimer)
  slow.value = false
  if (s === 'pending') slowTimer = setTimeout(() => (slow.value = true), 10_000)
})
onBeforeUnmount(() => clearTimeout(slowTimer))

const pickMonth = (m: string) => navigateTo({ query: m ? { month: m } : {} })
const label = (role: string) => ROLE_LABELS[role] ?? role
// UTC on server and browser alike, so the SSR text and the hydrated text match.
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
const change = (e: AccessLogEntry) => `${label(e.from_role)} to ${label(e.to_role)}`
const refusedText = (e: AccessLogEntry) =>
  e.actor_display_name === e.target_display_name
    ? `Refused: ${e.actor_display_name} tried to change their own role.`
    : `Refused: ${e.actor_display_name} tried to change ${e.target_display_name} from ${change(e)}.`
// S13 Accessibility: each entry is read as one sentence.
const sentence = (e: AccessLogEntry) =>
  e.outcome === 'refused'
    ? `${day(e.at)}, ${refusedText(e)} ${e.reason}`
    : `${day(e.at)}, ${e.actor_display_name} changed ${e.target_display_name} from ${change(e)}: ${e.reason}`
const count = computed(() => {
  const n = entries.value.length
  return `${n}${nextCursor.value ? ' or more' : ''} role change${n === 1 && !nextCursor.value ? '' : 's'} in ${monthName.value}.`
})
</script>

<template>
  <AppShell>
    <section class="access-log" aria-labelledby="access-log-heading">
      <div class="page-band"><h1 id="access-log-heading">Access log</h1></div>
      <ProblemMessage v-if="problem?.type === '/problems/forbidden'" :problem="problem" :copy="COPY" />
      <template v-else>
        <div class="controls"><MonthPicker :value="month" @change="pickMonth" /></div>
        <p v-if="status === 'pending'" role="status">{{ slow ? 'Still loading.' : 'Loading the access log…' }}</p>
        <ProblemMessage v-else-if="problem" :problem="problem" :copy="COPY" @retry="refresh()" />
        <div v-else-if="first" class="card">
          <p v-if="entries.length === 0" role="status">No roles changed in {{ monthName }}.</p>
          <template v-else>
            <p role="status">{{ count }} Times in UTC.</p>
            <table class="list">
              <thead>
                <tr><th scope="col">When</th><th scope="col">Who acted</th><th scope="col">For</th><th scope="col">Change</th><th scope="col">Reason</th></tr>
              </thead>
              <tbody>
                <tr v-for="(e, i) in entries" :key="i" :aria-label="sentence(e)">
                  <td>{{ when(e.at) }}</td>
                  <td>{{ e.actor_display_name }}</td>
                  <td>{{ e.target_display_name }}</td>
                  <td>
                    <strong v-if="e.outcome === 'refused'" class="refused">{{ refusedText(e) }}</strong>
                    <template v-else>{{ change(e) }}</template>
                  </td>
                  <td>{{ e.reason }}</td>
                </tr>
              </tbody>
            </table>
            <ProblemMessage v-if="moreProblem" :problem="moreProblem" :copy="COPY" @retry="showMore" />
            <button v-if="nextCursor" type="button" class="btn-secondary" :disabled="loadingMore" @click="showMore">Show 25 more</button>
          </template>
        </div>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.controls { margin: 8px 0; }
.list { width: 100%; border-collapse: collapse; }
.list th, .list td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); overflow-wrap: anywhere; vertical-align: top; }
.refused { color: var(--color-danger); }
.btn-secondary { min-height: 24px; margin-top: 8px; }
@media (max-width: 600px) {
  .list thead { display: none; }
  .list tr { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-button); margin-bottom: 8px; padding: 4px; }
  .list td { display: block; border: 0; padding: 2px 4px; }
}
</style>
