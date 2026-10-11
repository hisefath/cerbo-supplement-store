<!-- FE-1 AppShell (lld.md §3): fetches the signed-in viewer (ST-1, EP-17), provides it to pages, runs the idle
     countdown (ST-2) while someone is signed in, shows the app menu (M5: S5 and S6 for providers, S7 for operations
     specialists) and the help footer. -->
<script setup lang="ts">
const { data: viewer } = await useFetch('/api/session', { key: 'viewer' })
provide('viewer', viewer)
const staff = computed(() => !!viewer.value && viewer.value.role !== 'patient')
const menu = computed(() => {
  const role = viewer.value?.role
  if (role === 'provider') return [{ to: '/practice/prices', label: 'Practice prices' }, { to: '/practice/dashboard', label: 'Practice dashboard' }]
  if (role === 'operations_specialist') return [{ to: '/ops/stock', label: 'Stock adjustments' }]
  return []
})

// Sign out (screens.md Global conventions; EP-16): end the session, forget the viewer, then open sign-in. A session that
// already ended answers 401, which still means signed out.
async function signOutNow() {
  await $fetch('/api/session', { method: 'DELETE' }).catch(() => null)
  clearNuxtData('viewer')
  await navigateTo({ path: '/sign-in', query: { signed_out: '1' } })
}
</script>

<template>
  <div class="shell">
    <IdleCountdown v-if="viewer" />
    <div v-if="viewer" class="bar">
      <nav v-if="menu.length" aria-label="App menu" class="menu">
        <NuxtLink v-for="item in menu" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
      </nav>
      <button type="button" class="btn-secondary sign-out" @click="signOutNow">Sign out</button>
    </div>
    <main>
      <slot />
    </main>
    <footer class="help">
      {{ staff ? 'Questions? Contact platform support' : 'Questions? Contact your practice' }}
    </footer>
  </div>
</template>

<style scoped>
/* VL-2 page frame (lld.md FE-1, D81): pale page and type come from theme.css; layout only here. */
.shell { max-width: 1280px; margin: 0 auto; padding: 16px; }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 16px; }
.menu { display: flex; flex-wrap: wrap; gap: 16px; }
.sign-out { margin-left: auto; }
.menu a { font-weight: 500; text-decoration: none; }
.menu a.router-link-active { text-decoration: underline; text-underline-offset: 4px; }
.help { margin-top: var(--space-section); padding-top: 16px; border-top: 1px solid var(--color-border); color: var(--color-ink-muted); font-size: var(--text-detail); }
</style>
