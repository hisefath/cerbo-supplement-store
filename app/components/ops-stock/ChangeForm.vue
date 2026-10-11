<!-- FE-16 part (S7 "Record a change"): the change-in-units and reason fields for one product. The page owns the draft,
     the errors and the save (ST-10); this form only shows them and reports edits. Esc and Cancel close it. -->
<script setup lang="ts">
export interface StockDraft {
  change: string
  reason: string
}
export interface StockDraftErrors {
  change?: string
  reason?: string
  form?: string
  confirm?: string
}

const props = defineProps<{ name: string; draft: StockDraft; errors: StockDraftErrors; saving: boolean; slow: boolean }>()
const emit = defineEmits<{ change: [draft: StockDraft]; save: []; cancel: [] }>()
const set = (patch: Partial<StockDraft>) => emit('change', { ...props.draft, ...patch })
const root = ref<HTMLElement | null>(null)
onMounted(() => root.value?.querySelector<HTMLInputElement>('input')?.focus())
</script>

<template>
  <section ref="root" class="change" aria-labelledby="change-title" @keydown.esc="emit('cancel')">
    <h2 id="change-title">Record a change: {{ name }}</h2>
    <form novalidate @submit.prevent="emit('save')">
      <label for="stock-change">Change in units (use a minus for removals)</label>
      <input
        id="stock-change"
        :value="draft.change"
        inputmode="numeric"
        aria-describedby="stock-change-help stock-change-error"
        @input="set({ change: ($event.target as HTMLInputElement).value })"
      />
      <p id="stock-change-help" class="helper">Like 12 or -3.</p>
      <p v-if="errors.change" id="stock-change-error" class="error" role="alert">{{ errors.change }}</p>

      <label for="stock-reason">Reason (required)</label>
      <input
        id="stock-reason"
        :value="draft.reason"
        maxlength="200"
        aria-describedby="stock-reason-help stock-reason-error"
        @input="set({ reason: ($event.target as HTMLInputElement).value })"
      />
      <p id="stock-reason-help" class="helper">Shown in the stock history.</p>
      <p v-if="errors.reason" id="stock-reason-error" class="error" role="alert">{{ errors.reason }}</p>

      <p v-if="errors.confirm" role="status">{{ errors.confirm }}</p>
      <p v-if="errors.form" class="error" role="alert">{{ errors.form }}</p>
      <p v-if="saving" role="status">{{ slow ? "Still saving. Don't close this window." : 'Saving…' }}</p>
      <div class="actions">
        <button type="submit" :disabled="saving">Save stock change</button>
        <button type="button" @click="emit('cancel')">Cancel</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.change { border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 8px 0; margin: 12px 0; }
label { display: block; margin-top: 8px; }
input { display: block; width: 100%; max-width: 360px; min-height: 24px; }
.helper { margin: 2px 0; color: #444; font-size: 14px; }
.error { color: #b00020; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.actions button { min-height: 32px; }
</style>
