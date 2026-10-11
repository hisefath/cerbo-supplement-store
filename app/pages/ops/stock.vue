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
const cursor = computed(() => (typeof route.query.history_cursor === 'string' ? route.query.history_cursor : undefined))
const { data: list, error, refresh, status } = await useFetch<StockList>('/api/ops/stock', {
  query: { history_cursor: cursor },
}) // ST-8

const editing = ref<StockProduct | null>(null)
const draft = ref<StockDraft>({ change: '', reason: '' }) // ST-10
const errors = ref<StockDraftErrors>({})
const key = ref<string | null>(null)
const confirmed = ref(false)
const saving = ref(false)
const slow = ref(false)
const success = ref('')

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
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
    await refresh()
  } catch (e: unknown) {
    const data = (e as { data?: Problem & { unitsInStock?: number; errors?: { pointer: string; detail: string }[] } }).data
    const slug = data?.type?.replace('/problems/', '')
    if (slug === 'stale-stock') {
      errors.value = { form: `Stock changed while you were here. It's now ${data!.unitsInStock}. Check your change.` }
      await refresh()
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
      <h1 id="stock-heading">Stock adjustments</h1>
      <p v-if="status === 'pending' && !list" role="status">Loading stock…</p>
      <ProblemMessage
        v-else-if="pageProblem"
        :problem="pageProblem"
        :copy="{ forbidden: 'Only platform staff can change stock.' }"
        @retry="refresh()"
      />
      <template v-else-if="list">
        <p class="success" role="status">{{ success }}</p>
        <table class="list">
          <thead>
            <tr>
              <th scope="col">Product</th><th scope="col">In stock</th><th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in list.products" :key="p.product_id">
              <td>{{ p.name }}</td>
              <td>{{ p.units_in_stock }}</td>
              <td>
                <button :id="`record-${p.product_id}`" type="button" :aria-label="`Record a change for ${p.name}`" @click="open(p)">
                  Record a change
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <OpsStockChangeForm
          v-if="editing"
          :name="editing.name"
          :draft="draft"
          :errors="errors"
          :saving="saving"
          :slow="slow"
          @change="onChange"
          @save="save"
          @cancel="close"
        />

        <h2>Stock history</h2>
        <p v-if="list.history.length === 0 && !cursor">No stock changes recorded yet.</p>
        <ul v-else class="history">
          <li v-for="(h, i) in list.history" :key="i">
            <span>{{ when(h.created_at) }}</span> <span v-if="h.actor_display_name">{{ h.actor_display_name }}</span>
            <span>{{ h.product_name }}</span> <span>{{ signed(h.change) }}</span> <q>{{ h.reason }}</q>
          </li>
        </ul>
        <NuxtLink v-if="list.history_next_cursor" :to="{ query: { history_cursor: list.history_next_cursor } }">Show 25 more</NuxtLink>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.list { width: 100%; border-collapse: collapse; }
.list th, .list td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
.list button { min-height: 24px; min-width: 24px; }
.history { list-style: none; padding: 0; }
.history li { padding: 6px 0; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; gap: 8px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 600px) {
  .list thead { display: none; }
  .list tr { display: block; border: 1px solid #ddd; margin-bottom: 8px; padding: 4px; }
  .list td { display: block; border: 0; padding: 2px 4px; }
}
</style>
