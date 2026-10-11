<!-- FE-19 part (S12 "Change role"): the role and reason fields for one person. The page owns the draft, the errors and
     the save (ST-11); this dialog only shows them and reports edits. It keeps focus inside until Esc or Cancel. -->
<script lang="ts">
export const ROLE_LABELS: Record<string, string> = {
  finance_lead: 'Finance lead',
  operations_specialist: 'Operations specialist',
  sre: 'SRE',
  data_analyst: 'Data analyst',
  none: 'No role',
}
export interface RoleDraft {
  role: string
  reason: string
}
export interface RoleDraftErrors {
  reason?: string
  form?: string
  confirm?: string
}
</script>

<script setup lang="ts">
const props = defineProps<{ name: string; draft: RoleDraft; errors: RoleDraftErrors; saving: boolean; slow: boolean }>()
const emit = defineEmits<{ change: [draft: RoleDraft]; save: []; cancel: [] }>()
const set = (patch: Partial<RoleDraft>) => emit('change', { ...props.draft, ...patch })
const dialog = ref<HTMLElement | null>(null)
onMounted(() => dialog.value?.querySelector<HTMLSelectElement>('select')?.focus())
/** S12 "keeps focus inside until closed": Tab and Shift+Tab wrap between the first and last control. */
const onTab = (e: KeyboardEvent) => {
  const root = dialog.value
  if (!root) return
  const items = [...root.querySelectorAll<HTMLElement>('select, input, button:not([disabled])')]
  const active = document.activeElement
  const target = e.shiftKey
    ? active === items[0] || !root.contains(active) ? items.at(-1) : null
    : active === items.at(-1) || !root.contains(active) ? items[0] : null
  if (target) {
    e.preventDefault()
    target.focus()
  }
}
</script>

<template>
  <div class="backdrop">
    <section
      ref="dialog"
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-dialog-title"
      @keydown.esc="emit('cancel')"
      @keydown.tab="onTab"
    >
      <h2 id="role-dialog-title">Change role: {{ name }}</h2>
      <form novalidate @submit.prevent="emit('save')">
        <label for="role">Role</label>
        <select id="role" :value="draft.role" aria-describedby="role-help" @change="set({ role: ($event.target as HTMLSelectElement).value })">
          <option v-for="(label, value) in ROLE_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
        <p id="role-help" class="helper">Finance lead, Operations specialist, SRE, Data analyst or No role.</p>

        <label for="role-reason">Reason (required)</label>
        <input
          id="role-reason"
          :value="draft.reason"
          maxlength="200"
          aria-describedby="role-reason-help role-reason-error"
          @input="set({ reason: ($event.target as HTMLInputElement).value })"
        />
        <p id="role-reason-help" class="helper">Shown in the access log.</p>
        <p v-if="errors.reason" id="role-reason-error" class="error" role="alert">{{ errors.reason }}</p>

        <p v-if="errors.confirm" role="status">{{ errors.confirm }}</p>
        <p v-if="errors.form" class="error" role="alert">{{ errors.form }}</p>
        <p v-if="saving" role="status">{{ slow ? "Still saving. Don't close this window." : 'Saving…' }}</p>
        <div class="actions">
          <button type="submit" class="btn-primary" :disabled="saving">Save role</button>
          <button type="button" class="btn-secondary" @click="emit('cancel')">Cancel</button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 10; background: color-mix(in srgb, var(--color-ink) 40%, transparent); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
.dialog { background: var(--color-card); border-radius: var(--radius-dialog); box-shadow: var(--shadow-card); padding: var(--space-card); max-width: 480px; width: 100%; overflow-wrap: anywhere; }
label { display: block; margin-top: 8px; }
select, input { display: block; width: 100%; min-height: 44px; box-sizing: border-box; padding: 0 12px; border: 1px solid var(--color-control-border); border-radius: var(--radius-button); background: var(--color-card); color: var(--color-ink); font: inherit; }
.helper { margin: 2px 0; color: var(--color-ink-muted); font-size: var(--text-detail); }
.error { color: var(--color-danger); }
.actions { display: flex; gap: 8px; margin-top: 12px; }
/* S12 Responsive: at phone width the dialog becomes a full-screen sheet. */
@media (max-width: 600px) {
  .dialog { max-width: none; height: 100%; overflow: auto; border-radius: 0; }
}
</style>
