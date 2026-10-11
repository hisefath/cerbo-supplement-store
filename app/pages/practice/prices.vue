<!-- FE-13 PracticePricesPage (S5, EP-7): this practice's prices (EP-27), the change dialog (FE-14, EP-28) and the
     permanent price history. Owns ST-6, the change draft, and one Idempotency-Key per save, kept for its retries. -->
<script setup lang="ts">
import type { DraftErrors, PracticePrice, PriceDraft } from '~/components/practice-prices/PriceChangeDialog.vue'
import { fieldErrors, toHundredths } from '~/components/practice-prices/PriceChangeDialog.vue'
import type { Problem } from '~/components/ProblemMessage.vue'

interface PriceChange {
  product_name: string
  changed_by_display_name: string
  changed_at: string
  old_price_cents: number
  new_price_cents: number
  reason: string
}
interface PriceList {
  prices: PracticePrice[]
  history: PriceChange[]
  history_next_cursor: string | null
}

// S5 title names the practice (EP-17 Me.practice_name, read from the session AppShell fetches).
const viewer = useNuxtData<{ practice_name?: string | null } | null>('viewer').data
const title = computed(() => (viewer.value?.practice_name ? `Practice prices · ${viewer.value.practice_name}` : 'Practice prices'))
useHead({ title })
const route = useRoute()
const cursor = computed(() => (typeof route.query.history_cursor === 'string' ? route.query.history_cursor : undefined))
const { data: list, error, refresh, status } = await useFetch<PriceList>('/api/practice/prices', {
  query: { history_cursor: cursor },
}) // ST-8

const editing = ref<PracticePrice | null>(null)
const draft = ref<PriceDraft>({ mode: 'price', price: '', margin: '', reason: '' }) // ST-6
const errors = ref<DraftErrors>({})
const key = ref<string | null>(null)
const saving = ref(false)
const slow = ref(false)
const success = ref('')

const dollars = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const percent = (bp: number) => `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function open(p: PracticePrice) {
  editing.value = p
  draft.value = { mode: 'price', price: (p.price_cents / 100).toFixed(2), margin: '', reason: '' }
  errors.value = {}
  key.value = null
  success.value = ''
}
function close() {
  const id = editing.value?.product_id
  editing.value = null
  nextTick(() => document.getElementById(`change-${id}`)?.focus())
}
function onChange(d: PriceDraft) {
  draft.value = d
  key.value = null // a different request needs its own key
}

async function save() {
  const p = editing.value
  if (!p || saving.value) return
  const value = toHundredths(draft.value.mode === 'price' ? draft.value.price : draft.value.margin)
  const next: DraftErrors = {}
  if (value === null || (draft.value.mode === 'margin' && value > 9999)) {
    next.price = draft.value.mode === 'price' ? 'Enter a price in dollars, like 37.50.' : 'Enter a margin from 0 to 99.99.'
  }
  if (draft.value.reason.trim() === '') next.reason = 'Add a reason so others know why the price changed.'
  errors.value = next
  if (next.price || next.reason) return

  saving.value = true
  const timer = setTimeout(() => (slow.value = true), 10_000)
  key.value ??= crypto.randomUUID()
  try {
    const saved = await $fetch<PracticePrice>(`/api/practice/prices/${p.product_id}`, {
      method: 'PUT',
      headers: { 'idempotency-key': key.value },
      body: {
        ...(draft.value.mode === 'price' ? { price_cents: value } : { margin_basis_points: value }),
        reason: draft.value.reason.trim(),
        expected_current_price_cents: p.price_cents,
      },
    })
    success.value = `${saved.name} is now ${dollars(saved.price_cents)}. Orders not yet in checkout will show the new price.`
    close()
    await refresh()
  } catch (e: unknown) {
    const data = (e as { data?: Problem & { currentPriceCents?: number; changedBy?: string | null } }).data
    const slug = data?.type?.replace('/problems/', '')
    if (slug === 'below-price-floor') {
      const floor = dollars(data!.lowestAllowedPriceCents ?? p.lowest_allowed_price_cents)
      errors.value = { price: `That price is below the lowest allowed, ${floor}. Enter ${floor} or more.` }
    } else if (slug === 'stale-price') {
      const who = data!.changedBy ?? 'Someone'
      errors.value = { form: `${who} changed this price to ${dollars(data!.currentPriceCents ?? p.price_cents)} a moment ago. Check it before saving yours.` }
      await refresh()
      editing.value = list.value?.prices.find((x) => x.product_id === p.product_id) ?? p
    } else if (slug === 'validation') {
      errors.value = fieldErrors((data as { errors?: { pointer: string; detail: string }[] }).errors, p.lowest_allowed_price_cents)
    } else if (!navigator.onLine) {
      errors.value = { form: "You're offline. The old price still applies." }
    } else {
      errors.value = { form: "We couldn't save the new price. The old price still applies. Try again." }
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
    <section class="prices" aria-labelledby="prices-heading">
      <h1 id="prices-heading">{{ title }}</h1>
      <p v-if="status === 'pending' && !list" role="status">Loading prices…</p>
      <ProblemMessage
        v-else-if="pageProblem"
        :problem="pageProblem"
        :copy="{ forbidden: 'Only providers at this practice can change its prices.' }"
        @retry="refresh()"
      />
      <template v-else-if="list">
        <p class="success" role="status">{{ success }}</p>
        <table class="list">
          <thead>
            <tr>
              <th scope="col">Product</th><th scope="col">Cost</th><th scope="col">Price</th><th scope="col">Margin</th>
              <th scope="col">Set by</th><th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in list.prices" :key="p.product_id">
              <td>{{ p.name }}</td>
              <td>{{ dollars(p.unit_cost_cents) }}</td>
              <td>{{ dollars(p.price_cents) }}</td>
              <td>{{ percent(p.margin_basis_points) }}</td>
              <td>{{ p.is_default ? 'Default' : p.set_by_display_name }}</td>
              <td>
                <button :id="`change-${p.product_id}`" type="button" :aria-label="`Change price for ${p.name}`" @click="open(p)">
                  Change price
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>Price history</h2>
        <p v-if="list.history.length === 0 && !cursor">No changes yet. Every price is the default.</p>
        <ul v-else class="history">
          <li v-for="(h, i) in list.history" :key="i">
            <span>{{ when(h.changed_at) }}</span> <span>{{ h.changed_by_display_name }}</span> <span>{{ h.product_name }}</span>
            <span>{{ dollars(h.old_price_cents) }} to {{ dollars(h.new_price_cents) }}</span>
            <q>{{ h.reason }}</q>
          </li>
        </ul>
        <NuxtLink v-if="list.history_next_cursor" :to="{ query: { history_cursor: list.history_next_cursor } }">Show 25 more</NuxtLink>
      </template>

      <PracticePricesPriceChangeDialog
        v-if="editing"
        :price="editing"
        :draft="draft"
        :errors="errors"
        :saving="saving"
        :slow="slow"
        @change="onChange"
        @save="save"
        @cancel="close"
      />
    </section>
  </AppShell>
</template>

<style scoped>
.list { width: 100%; border-collapse: collapse; }
.list th, .list td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
.list button { min-height: 24px; min-width: 24px; }
.history { list-style: none; padding: 0; }
.history li { padding: 6px 0; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; gap: 8px; }
.history q { flex-basis: 100%; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 600px) {
  .list thead { display: none; }
  .list tr { display: block; border: 1px solid #ddd; margin-bottom: 8px; padding: 4px; }
  .list td { display: block; border: 0; padding: 2px 4px; }
}
</style>
