<!-- FE-1 AppShell (lld.md §3): fetches the signed-in viewer (ST-1, EP-17), provides it to pages, runs the idle
     countdown (ST-2) while someone is signed in, and shows the help footer. -->
<script setup lang="ts">
const { data: viewer } = await useFetch('/api/session', { key: 'viewer' })
provide('viewer', viewer)
const staff = computed(() => !!viewer.value && viewer.value.role !== 'patient')
</script>

<template>
  <div class="shell">
    <IdleCountdown v-if="viewer" />
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
.help { margin-top: 32px; color: #444; font-size: 14px; }
</style>
