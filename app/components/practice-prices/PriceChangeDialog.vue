<!-- FE-14 PriceChangeDialog (S5): stateless. The draft (ST-6) is lifted to FE-13, which sends it (EP-28). Shows the
     lowest allowed price, the price a margin makes, and the field errors under their fields. -->
<script lang="ts">
/** "37.50" → 3750; "60" → 6000. Two decimals at most; null when it is not a number. No floats (AGENTS.md). */
export function toHundredths(s: string): number | null {
  const m = /^\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(s)
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0')) : null
}

export const dollars = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const BOTH_OR_NEITHER = 'Enter a new price or a margin, not both.'

/** A 422 /problems/validation `errors[]` (pointer, detail) as S5 copy under the field each one names. */
export function fieldErrors(
  errors: { pointer: string; detail: string }[] | undefined,
  lowestAllowedPriceCents: number,
): { price?: string; reason?: string; form?: string } {
  const out: { price?: string; reason?: string; form?: string } = {}
  for (const { pointer, detail } of errors ?? []) {
    if (detail === BOTH_OR_NEITHER) out.price = detail
    else if (pointer === '#/price_cents') {
      const floor = dollars(lowestAllowedPriceCents)
      out.price ??= `That price is below the lowest allowed, ${floor}. Enter ${floor} or more.`
    } else if (pointer === '#/margin_basis_points') out.price ??= 'Enter a margin from 0 to 99.99.'
    else if (pointer === '#/reason') out.reason ??= detail
    else out.form ??= detail
  }
  if (!out.price && !out.reason && !out.form) out.form = "We couldn't save the new price. The old price still applies. Try again."
  return out
}

/** S5 "keeps focus inside until closed": Tab and Shift+Tab wrap between the dialog's first and last control. */
export function trapTab(e: KeyboardEvent, root: HTMLElement, active: Element | null) {
  const items = [...root.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled])')]
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  const target = e.shiftKey ? (active === first || !root.contains(active) ? last : null) : active === last || !root.contains(active) ? first : null
  if (target) {
    e.preventDefault()
    target.focus()
  }
}
</script>

<script setup lang="ts">
import { priceFromMargin } from '~~/server/services/money'

export interface PracticePrice {
  product_id: number
  name: string
  unit_cost_cents: number
  price_cents: number
  margin_basis_points: number
  is_default: boolean
  set_by_display_name: string | null
  lowest_allowed_price_cents: number
}
export interface PriceDraft {
  mode: 'price' | 'margin'
  price: string
  margin: string
  reason: string
}
export interface DraftErrors {
  price?: string
  reason?: string
  form?: string
}

const props = defineProps<{ price: PracticePrice; draft: PriceDraft; errors: DraftErrors; saving: boolean; slow: boolean }>()
const emit = defineEmits<{ change: [draft: PriceDraft]; save: []; cancel: [] }>()

const set = (patch: Partial<PriceDraft>) => emit('change', { ...props.draft, ...patch })
const marginPreview = computed(() => {
  if (props.draft.mode !== 'margin') return null
  const bp = toHundredths(props.draft.margin)
  return bp === null || bp > 9999 ? null : priceFromMargin(props.price.unit_cost_cents, bp)
})
const dialog = ref<HTMLElement | null>(null)
onMounted(() => dialog.value?.querySelector<HTMLInputElement>('input')?.focus())
const onTab = (e: KeyboardEvent) => dialog.value && trapTab(e, dialog.value, document.activeElement)
</script>

<template>
  <div class="backdrop">
    <section
      ref="dialog"
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-dialog-title"
      @keydown.esc="emit('cancel')"
      @keydown.tab="onTab"
    >
      <h2 id="price-dialog-title">Change price: {{ price.name }}</h2>
      <form novalidate @submit.prevent="emit('save')">
        <fieldset>
          <legend>Enter one:</legend>
          <div class="choice">
            <input id="mode-price" type="radio" name="mode" :checked="draft.mode === 'price'" @change="set({ mode: 'price' })" />
            <label for="mode-price">New price</label>
            <input
              id="new-price"
              :value="draft.price"
              inputmode="decimal"
              aria-label="New price"
              aria-describedby="new-price-help price-error"
              :disabled="draft.mode !== 'price'"
              @input="set({ price: ($event.target as HTMLInputElement).value })"
            />
            <p id="new-price-help" class="helper">In dollars, like 37.50.</p>
          </div>
          <div class="choice">
            <input id="mode-margin" type="radio" name="mode" :checked="draft.mode === 'margin'" @change="set({ mode: 'margin' })" />
            <label for="mode-margin">Margin %</label>
            <input
              id="margin"
              :value="draft.margin"
              inputmode="decimal"
              aria-label="Margin %"
              aria-describedby="margin-help price-error"
              :disabled="draft.mode !== 'margin'"
              @input="set({ margin: ($event.target as HTMLInputElement).value })"
            />
            <p id="margin-help" class="helper">Share of the patient price you keep before the platform fee.</p>
          </div>
        </fieldset>
        <p v-if="marginPreview !== null" role="status">
          A {{ draft.margin }}% margin makes the price {{ dollars(marginPreview) }}. Check before saving.
        </p>
        <p class="floor">Lowest allowed price: {{ dollars(price.lowest_allowed_price_cents) }}</p>
        <p v-if="errors.price" id="price-error" class="error" role="alert">{{ errors.price }}</p>

        <label for="reason">Reason (required)</label>
        <input
          id="reason"
          :value="draft.reason"
          maxlength="200"
          aria-describedby="reason-help reason-error"
          @input="set({ reason: ($event.target as HTMLInputElement).value })"
        />
        <p id="reason-help" class="helper">Shown in the price history.</p>
        <p v-if="errors.reason" id="reason-error" class="error" role="alert">{{ errors.reason }}</p>

        <p v-if="errors.form" class="error" role="alert">{{ errors.form }}</p>
        <p v-if="saving" role="status">{{ slow ? "Still saving. Don't close this window." : 'Saving…' }}</p>
        <div class="actions">
          <button type="submit" class="btn-primary" :disabled="saving">Save new price</button>
          <button type="button" class="btn-secondary" @click="emit('cancel')">Cancel</button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: color-mix(in srgb, var(--color-ink) 40%, transparent); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
.dialog { background: var(--color-card); border-radius: var(--radius-dialog); box-shadow: var(--shadow-card); padding: var(--space-card); max-width: 480px; width: 100%; }
fieldset { border: 0; padding: 0; margin: 0; }
.choice { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0; }
.choice input[type='radio'] { width: 24px; height: 24px; }
.helper { flex-basis: 100%; margin: 0; color: var(--color-ink-muted); font-size: var(--text-detail); }
.floor { color: var(--color-ink); }
.error { color: var(--color-danger); }
#reason { display: block; width: 100%; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
@media (max-width: 600px) {
  .dialog { max-width: none; height: 100%; overflow: auto; border-radius: 0; }
}
</style>
