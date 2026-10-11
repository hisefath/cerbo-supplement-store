<!-- FE-2 SignInPage (S8, EP-1; lld.md §3, SEQ-7): email and password through EP-15, then the page asked for (`next`)
     or the role's home. Public: the page guard (BE-2) lets everyone open it. -->
<script setup lang="ts">
import { safeNext } from '~/middleware/auth.global'

interface Me { role: string }

const route = useRoute()
const next = computed(() => safeNext(route.query.next))
const idle = computed(() =>
  route.query.idle
    ? `You were signed out after 15 minutes without activity.${next.value?.startsWith('/orders/') ? ' Sign in to return to your order.' : ''}`
    : null,
)

const email = ref('')
const password = ref('')
const show = ref(false)
const pending = ref(false)
const slow = ref(false)
const error = ref<string | null>(null)

useHead({ title: 'Sign in' })

async function submit() {
  if (pending.value) return // pressed twice: one sign-in
  if (!email.value.trim()) return void (error.value = 'Enter your email.')
  if (!password.value) return void (error.value = 'Enter your password.')
  error.value = null
  pending.value = true
  const timer = setTimeout(() => (slow.value = true), 10_000)
  let me: Me
  try {
    me = await $fetch<Me>('/api/session', { method: 'POST', body: { email: email.value.trim(), password: password.value } })
  } catch (err) {
    const { statusCode: status, data } = err as { statusCode?: number; data?: { title?: string } }
    password.value = ''
    error.value = signInErrorMessage({ status, online: navigator.onLine, title: data?.title })
    pending.value = false
    return
  } finally {
    clearTimeout(timer)
    slow.value = false
  }
  // Signed in: from here a failure is the next page's own, never a sign-in error. The button stays busy while the
  // next page opens, so a second press can't sign in twice.
  clearNuxtData('viewer') // ST-1 is fetched again for the signed-in person
  try {
    await navigateTo(next.value ?? ROLE_HOME[me.role] ?? '/', { replace: true })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppShell>
    <form class="sign-in card" @submit.prevent="submit">
      <div class="page-band">
        <h1>Sign in</h1>
      </div>
      <p class="helper">Test accounts only: no real identity check.</p>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-else-if="idle" role="status" class="notice">{{ idle }}</p>
      <p v-else>Sign in to continue.</p>
      <label for="email">Email</label>
      <input id="email" v-model="email" type="email" autocomplete="username" maxlength="254" />
      <label for="password">Password</label>
      <div class="row">
        <input id="password" v-model="password" :type="show ? 'text' : 'password'" autocomplete="current-password" />
        <button type="button" class="btn-secondary" aria-label="Show password" :aria-pressed="show" @click="show = !show">Show</button>
      </div>
      <button type="submit" class="btn-primary" :disabled="pending">{{ pending ? 'Signing you in…' : 'Sign in' }}</button>
      <p v-if="slow" role="status">Still signing you in. Try again if nothing happens.</p>
    </form>
  </AppShell>
</template>

<style scoped>
/* S8 on the VL-2 theme (theme.css): the title sits in the sky band at the top of the card; layout only here. */
.sign-in { max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
.sign-in .page-band { margin: calc(-1 * var(--space-card)) calc(-1 * var(--space-card)) 8px; border-radius: var(--radius-card) var(--radius-card) 0 0; }
.helper { color: var(--color-ink-muted); }
.error { border: 2px solid var(--color-danger); border-radius: var(--radius-button); color: var(--color-danger); padding: 8px 12px; }
.notice { border: 2px solid var(--color-primary); border-radius: var(--radius-button); padding: 8px 12px; }
label { font-weight: 500; }
input { min-height: 44px; font: inherit; padding: 0 12px; min-width: 0; flex: 1; color: var(--color-ink); background: var(--color-card); border: 1px solid var(--color-ink-muted); border-radius: var(--radius-button); }
.row { display: flex; gap: 8px; }
.btn-primary { width: 100%; margin-top: 8px; }
</style>
