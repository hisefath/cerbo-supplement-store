<!-- FE-19 OperationsAccessPage (S12, EP-12, SEQ-10): the operations people, one role each (EP-36), and the role dialog
     that saves a change with a reason (EP-37). Owns ST-11, the dialog draft, and one Idempotency-Key per save, kept for
     its retries. The SRE's own row has no Change role button. -->
<script setup lang="ts">
import { ROLE_LABELS, type RoleDraft, type RoleDraftErrors } from '~/components/ops-access/RoleDialog.vue'
import type { Problem } from '~/components/ProblemMessage.vue'

interface StaffMember {
  user_id: number
  display_name: string
  role: string
  role_since: string | null
  is_you: boolean
}
interface StaffList {
  data: StaffMember[]
}

const FORBIDDEN = 'Only the SRE can change operations roles.'
const SELF = "You can't change your own role."

useHead({ title: 'Operations access' })
const route = useRoute()
const { data: list, error, refresh, status } = await useFetch<StaffList>('/api/ops/staff') // ST-8

const editing = ref<StaffMember | null>(null)
const draft = ref<RoleDraft>({ role: 'none', reason: '' }) // ST-11
const errors = ref<RoleDraftErrors>({})
const key = ref<string | null>(null)
const confirmed = ref(false)
const saving = ref(false)
const slow = ref(false)
const success = ref('')

const label = (role: string) => ROLE_LABELS[role] ?? role
// UTC on server and browser alike, so the SSR text and the hydrated text match.
const since = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : '-')
const slugOf = (p?: Problem | null) => p?.type?.replace('/problems/', '')
const onlyMe = computed(() => !!list.value && list.value.data.every((s) => s.is_you || s.role === 'none'))
// S12 Permission denied, signed out: the sign-in page with the idle message.
const toSignIn = () => navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })
if (slugOf(error.value?.data as Problem | undefined) === 'unauthenticated') await toSignIn()

function open(s: StaffMember) {
  editing.value = s
  draft.value = { role: s.role, reason: '' }
  errors.value = {}
  key.value = null
  confirmed.value = false
  success.value = ''
}
function close() {
  const id = editing.value?.user_id
  editing.value = null
  nextTick(() => document.getElementById(`change-${id}`)?.focus())
}
function onChange(d: RoleDraft) {
  draft.value = d
  key.value = null // a different request needs its own key
  confirmed.value = false
}

async function save() {
  const s = editing.value
  if (!s || saving.value) return
  if (draft.value.reason.trim() === '') {
    errors.value = { reason: 'Add a reason so the finance lead knows why.' }
    return
  }
  errors.value = {}
  saving.value = true
  const timer = setTimeout(() => (slow.value = true), 10_000)
  key.value ??= crypto.randomUUID()
  try {
    const saved = await $fetch<StaffMember>(`/api/ops/staff/${s.user_id}/role`, {
      method: 'PUT',
      headers: { 'idempotency-key': key.value },
      body: { role: draft.value.role, reason: draft.value.reason.trim(), expected_role: s.role, confirm_no_finance_lead: confirmed.value },
    })
    success.value = `Saved. ${saved.display_name} is now ${label(saved.role)}. The finance lead will see this in the access log.`
    close()
    await refresh()
  } catch (e: unknown) {
    const data = (e as { data?: Problem & { currentRole?: string } }).data
    const slug = slugOf(data)
    if (slug === 'unauthenticated') {
      await toSignIn()
    } else if (slug === 'forbidden') {
      errors.value = { form: FORBIDDEN }
    } else if (slug === 'self-role-change') {
      errors.value = { form: SELF }
    } else if (slug === 'idempotency-in-flight') {
      errors.value = { form: "Still saving. Don't close this window." }
    } else if (slug === 'last-finance-lead') {
      // The review step for a binding change (WCAG 3.3.4): the next Save sends the confirmation, with a new key since the body differs.
      errors.value = { confirm: 'No one will be able to run financial reports. Remove anyway?' }
      confirmed.value = true
      key.value = null
    } else if (slug === 'stale-role') {
      errors.value = { form: `${s.display_name} was changed a moment ago to ${label(data!.currentRole ?? '')}. Check before saving.` }
      await refresh()
      editing.value = list.value?.data.find((x) => x.user_id === s.user_id) ?? s
      key.value = null
    } else if (slug === 'validation') {
      errors.value = { reason: 'Add a reason so the finance lead knows why.' }
    } else if (!navigator.onLine) {
      errors.value = { form: "You're offline. Access is unchanged." }
    } else {
      errors.value = { form: `We couldn't save the role. ${s.display_name}'s access is unchanged. Try again.` }
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
    <section class="access" aria-labelledby="access-heading">
      <div class="page-band"><h1 id="access-heading">Operations access</h1></div>
      <p v-if="status === 'pending' && !list" role="status">Loading people…</p>
      <ProblemMessage v-else-if="pageProblem" :problem="pageProblem" :copy="{ forbidden: FORBIDDEN }" @retry="refresh()" />
      <div v-else-if="list" class="card">
        <p class="success" role="status">{{ success }}</p>
        <p v-if="onlyMe">Only you have a role so far. Give others the role their work needs.</p>
        <table class="list">
          <thead>
            <tr>
              <th scope="col">Person</th><th scope="col">Role</th><th scope="col">Since</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in list.data" :key="s.user_id">
              <td>{{ s.display_name }}</td>
              <td>{{ label(s.role) }}</td>
              <td>{{ since(s.role_since) }}</td>
              <td>
                <span v-if="s.is_you">(you) <span class="helper">{{ SELF }}</span></span>
                <button
                  v-else
                  :id="`change-${s.user_id}`"
                  type="button"
                  class="btn-primary"
                  :aria-label="`Change role for ${s.display_name}`"
                  @click="open(s)"
                >
                  Change role
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="helper">Every change appears in the access log for the finance lead.</p>
      </div>
      <OpsAccessRoleDialog
        v-if="editing"
        :name="editing.display_name"
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
.list th, .list td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); overflow-wrap: anywhere; }
.helper { margin: 2px 0; color: var(--color-ink-muted); font-size: var(--text-detail); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 600px) {
  .list thead { display: none; }
  .list tr { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-button); margin-bottom: 8px; padding: 4px; }
  .list td { display: block; border: 0; padding: 2px 4px; }
}
</style>
