<!-- FE-16 StockAdjustmentsPage (S7, EP-9): every product's stock (EP-31), the change form (EP-32) and the permanent
     stock history. Owns ST-10, the change draft, and one Idempotency-Key per save, kept for its retries. -->
<script setup lang="ts">
import type { StockDraft, StockDraftErrors } from '~/components/ops-stock/ChangeForm.vue'
import type { Problem } from '~/components/ProblemMessage.vue'

interface StockProduct {
  product_id: number
  name: string
  units_in_stock: number
}
interface StockMovement {
  product_name: string
  change: number
  kind: string
  reason: string
  actor_display_name: string | null
  created_at: string
  units_in_stock_after: number
}
interface StockList {
  products: StockProduct[]
  history: StockMovement[]
  history_next_cursor: string | null
}

const LARGE_CHANGE = 10_000

useHead({ title: 'Stock adjustments' })
const route = useRoute()
const { data: list, error, refresh, status } = await useFetch<StockList>('/api/ops/stock') // ST-8, first page
// "Show 25 more" appends older pages under the first one (R4); a reload starts from the first page again.
const older = ref<StockMovement[]>([])
const olderCursor = ref<string | null | undefined>(undefined)
const loadingMore = ref(false)
const moreProblem = ref<Problem | null>(null)
const history = computed(() => [...(list.value?.history ?? []), ...older.value])
const nextCursor = computed(() => (olderCursor.value === undefined ? list.value?.history_next_cursor ?? null : olderCursor.value))

const editing = ref<StockProduct | null>(null)
const draft = ref<StockDraft>({ change: '', reason: '' }) // ST-10
const errors = ref<StockDraftErrors>({})
const key = ref<string | null>(null)
const confirmed = ref(false)
const saving = ref(false)
const slow = ref(false)
const success = ref('')

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
// UTC on server and browser alike, so the SSR text and the hydrated text match (R6).
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const slugOf = (p?: Problem | null) => p?.type?.replace('/problems/', '')
// S7 Permission denied, signed out: the sign-in page with the idle message (as IdleCountdown does).
const toSignIn = () => navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })
if (slugOf(error.value?.data as Problem | undefined) === 'unauthenticated') await toSignIn()

async function reload() {
  older.value = []
  olderCursor.value = undefined
  moreProblem.value = null
  await refresh()
}
async function showMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  moreProblem.value = null
  try {
    const page = await $fetch<StockList>('/api/ops/stock', { query: { history_cursor: nextCursor.value } })
    older.value = [...older.value, ...page.history]
    olderCursor.value = page.history_next_cursor
  } catch (e: unknown) {
    const data = (e as { data?: Problem }).data
    if (slugOf(data) === 'unauthenticated') await toSignIn()
    else moreProblem.value = navigator.onLine ? data ?? { type: '/problems/internal' } : { type: '/problems/offline' }
  } finally {
    loadingMore.value = false
  }
}
const belowZero = (n: number) => `That would take stock below 0. ${n} are in stock.`

function open(p: StockProduct) {
  editing.value = p
  draft.value = { change: '', reason: '' }
  errors.value = {}
  key.value = null
  confirmed.value = false
  success.value = ''
}
function close() {
  const id = editing.value?.product_id
  editing.value = null
  nextTick(() => document.getElementById(`record-${id}`)?.focus())
}
function onChange(d: StockDraft) {
  draft.value = d
  key.value = null // a different request needs its own key
  confirmed.value = false
}

async function save() {
  const p = editing.value
  if (!p || saving.value) return
  const text = draft.value.change.trim()
  const change = /^[+-]?\d{1,9}$/.test(text) ? Number(text) : 0
  const next: StockDraftErrors = {}
  if (change === 0) next.change = 'Enter a whole number, like 12 or -3.'
  else if (p.units_in_stock + change < 0) next.change = belowZero(p.units_in_stock)
  if (draft.value.reason.trim() === '') next.reason = 'Add a reason so others know why stock changed.'
  if (!next.change && !next.reason && Math.abs(change) >= LARGE_CHANGE && !confirmed.value) {
    next.confirm = `${change > 0 ? 'Add' : 'Remove'} ${Math.abs(change).toLocaleString('en-US')} units? Check before saving.`
    confirmed.value = true
  }
  errors.value = next
  if (next.change || next.reason || next.confirm) return

  saving.value = true
  const timer = setTimeout(() => (slow.value = true), 10_000)
  key.value ??= crypto.randomUUID()
  try {
    const saved = await $fetch<StockMovement>(`/api/ops/stock/${p.product_id}/adjustments`, {
      method: 'POST',
      headers: { 'idempotency-key': key.value },
      body: {
        change,
        reason: draft.value.reason.trim(),
        expected_units_in_stock: p.units_in_stock,
        confirm_large_change: confirmed.value,
      },
    })
    success.value = `${saved.product_name} stock is now ${saved.units_in_stock_after}.`
    close()
    await reload()
  } catch (e: unknown) {
    const data = (e as { data?: Problem & { unitsInStock?: number; errors?: { pointer: string; detail: string }[] } }).data
    const slug = slugOf(data)
    if (slug === 'unauthenticated') {
      await toSignIn()
    } else if (slug === 'forbidden') {
      errors.value = { form: 'Only platform staff can change stock.' }
    } else if (slug === 'idempotency-in-flight') {
      // The first save with this key is still running: its outcome is unknown, so never claim the old count. The key
      // is kept, so saving again replays that same request.
      errors.value = { form: "Still saving. Don't close this window." }
    } else if (slug === 'stale-stock') {
      errors.value = { form: `Stock changed while you were here. It's now ${data!.unitsInStock}. Check your change.` }
      await reload()
      editing.value = list.value?.products.find((x) => x.product_id === p.product_id) ?? p
    } else if (slug === 'insufficient-stock') {
      errors.value = { change: belowZero(data!.unitsAvailable?.[0] ?? p.units_in_stock) }
    } else if (slug === 'validation') {
      const errs = data!.errors ?? []
      errors.value = {
        change: errs.some((x) => !x.pointer.startsWith('#/reason')) ? 'Enter a whole number, like 12 or -3.' : undefined,
        reason: errs.some((x) => x.pointer.startsWith('#/reason')) ? 'Add a reason so others know why stock changed.' : undefined,
      }
    } else if (!navigator.onLine) {
      errors.value = { form: "You're offline. Stock is unchanged." }
    } else {
      errors.value = { form: `We couldn't save the change. Stock is still ${p.units_in_stock}. Try again.` }
    }
  } finally {
    clearTimeout(timer)
    saving.value = false
    slow.value = false
  }
}
const pageProblem = computed<Problem | null>(() => (error.value ? (error.value.data as Problem) ?? { type: '/problems/internal' } : null))
</script>

<template>
  <AppShell>
    <section class="stock" aria-labelledby="stock-heading">
      <div class="page-band"><h1 id="stock-heading">Stock adjustments</h1></div>
      <p v-if="status === 'pending' && !list" role="status">Loading stock…</p>
      <ProblemMessage
        v-else-if="pageProblem"
        :problem="pageProblem"
        :copy="{ forbidden: 'Only platform staff can change stock.' }"
        @retry="reload()"
      />
      <div v-else-if="list" class="card">
        <p class="success" role="status">{{ success }}</p>
        <table class="list">
          <thead>
            <tr>
              <th scope="col">Product</th><th scope="col">In stock</th><th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="p in list.products" :key="p.product_id">
              <tr>
                <td>{{ p.name }}</td>
                <td>{{ p.units_in_stock }}</td>
                <td>
                  <button :id="`record-${p.product_id}`" type="button" class="btn-primary" :aria-label="`Record a change for ${p.name}`" @click="open(p)">
                    Record a change
                  </button>
                </td>
              </tr>
              <!-- S7 Accessibility: the form opens in place under its row (a full-screen sheet on phones). -->
              <tr v-if="editing?.product_id === p.product_id" class="form-row">
                <td colspan="3">
                  <OpsStockChangeForm
                    :name="p.name"
                    :draft="draft"
                    :errors="errors"
                    :saving="saving"
                    :slow="slow"
                    @change="onChange"
                    @save="save"
                    @cancel="close"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <h2>Stock history</h2>
        <p class="helper">Times in UTC</p>
        <p v-if="history.length === 0">No stock changes recorded yet.</p>
        <ul v-else class="history">
          <li v-for="(h, i) in history" :key="i">
            <span>{{ when(h.created_at) }}</span> <span v-if="h.actor_display_name">{{ h.actor_display_name }}</span>
            <span>{{ h.product_name }}</span> <span>{{ signed(h.change) }}</span> <q>{{ h.reason }}</q>
          </li>
        </ul>
        <p v-if="loadingMore" role="status">Loading stock…</p>
        <ProblemMessage
          v-if="moreProblem"
          :problem="moreProblem"
          :copy="{ forbidden: 'Only platform staff can change stock.' }"
          @retry="showMore()"
        />
        <button v-if="nextCursor" type="button" class="btn-secondary" :disabled="loadingMore" @click="showMore()">Show 25 more</button>
      </div>
    </section>
  </AppShell>
</template>

<style scoped>
.list { width: 100%; border-collapse: collapse; }
.list th, .list td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); overflow-wrap: anywhere; }
.history { list-style: none; padding: 0; }
.history li { padding: 6px 0; border-bottom: 1px solid var(--color-border); display: flex; flex-wrap: wrap; gap: 8px; }
.form-row td { padding: 0; }
.helper { margin: 2px 0; color: var(--color-ink-muted); font-size: var(--text-detail); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 600px) {
  .list thead { display: none; }
  .list tr { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-button); margin-bottom: 8px; padding: 4px; }
  .list td { display: block; border: 0; padding: 2px 4px; }
}
</style>
