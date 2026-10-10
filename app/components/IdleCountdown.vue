<!-- ST-2 idle countdown (lld.md §3, owned by FE-1 AppShell): when 15 minutes pass with no request moving the server's
     last_seen_at, opens the sign-in page with the idle message (FR-041). It restarts on each of the person's own API
     calls, because each one moves last_seen_at (BE-3.resolve). It only shows that page sooner; the server's 15-minute
     rule decides: before leaving, it asks EP-17 whether the session really ended. -->
<script setup lang="ts">
import type { Ref } from 'vue'

const IDLE_MS = 15 * 60 * 1000
const RETRY_MS = 30 * 1000
const viewer = inject<Ref<{ idle_expires_at: string } | null | undefined>>('viewer', ref(null))
const route = useRoute()
let timer: ReturnType<typeof setTimeout> | undefined
let observer: PerformanceObserver | undefined

// Delays only, never the server's or the client's wall-clock times, so a skewed client clock cannot fire it early.
// One second late, so the server agrees the session is idle when EP-17 is asked.
function armIn(ms: number) {
  clearTimeout(timer)
  timer = setTimeout(check, Math.max(0, ms) + 1000)
}

// Another tab may have kept the session live, so the server decides. 200: still live (the answer restarts the
// countdown). 401: ended, so open sign-in. Anything else (offline, 5xx): unknown, ask again shortly.
async function check() {
  try {
    viewer.value = await $fetch('/api/session')
    armIn(IDLE_MS)
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode !== 401) return armIn(RETRY_MS)
    clearNuxtData('viewer') // the old viewer is gone; the sign-in page fetches ST-1 again
    await navigateTo({ path: '/sign-in', query: { next: route.fullPath, idle: '1' } })
  }
}

// A viewer was just fetched (or set), so the server's last_seen_at is no older than now.
function arm() {
  if (viewer.value) armIn(IDLE_MS)
  else clearTimeout(timer)
}

// Resource timing sees every fetch the page makes, so no API call has to know about the countdown. A 401 means the
// session already ended, so it restarts nothing. The countdown runs from when the answer arrived.
function onRequests(list: PerformanceObserverEntryList) {
  for (const e of list.getEntries() as PerformanceResourceTiming[]) {
    const url = new URL(e.name)
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/') || e.responseStatus === 401) continue
    if (viewer.value) armIn(e.responseEnd + IDLE_MS - performance.now())
  }
}

onMounted(() => {
  arm()
  observer = new PerformanceObserver(onRequests)
  observer.observe({ type: 'resource' })
})
watch(() => viewer.value?.idle_expires_at, arm)
onBeforeUnmount(() => {
  clearTimeout(timer)
  observer?.disconnect()
})
</script>

<template>
  <span hidden />
</template>
