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
</script>

<template>
  <div class="shell">
    <IdleCountdown v-if="viewer" />
    <nav v-if="menu.length" aria-label="App menu" class="menu">
      <NuxtLink v-for="item in menu" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
    </nav>
    <main>
      <slot />
    </main>
    <footer class="help">
      {{ staff ? 'Questions? Contact platform support' : 'Questions? Contact your practice' }}
    </footer>
  </div>
</template>

<style scoped>
.shell { max-width: 1280px; margin: 0 auto; padding: 16px; font-family: system-ui, sans-serif; color: #1a1a1a; }
.menu { display: flex; gap: 16px; margin-bottom: 16px; }
.help { margin-top: 32px; color: #444; font-size: 14px; }
</style>
