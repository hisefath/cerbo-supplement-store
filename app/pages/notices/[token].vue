<!-- FE-3 NoticePage (S9, EP-2): the stand-in message. Names only the practice (FR-044). -->
<script setup lang="ts">
import type { Problem } from '~/components/ProblemMessage.vue'

const route = useRoute()
const { data: notice, error } = await useFetch<{ practice_name: string; sign_in_path: string }>(
  `/api/notices/${encodeURIComponent(String(route.params.token))}`,
)
useHead({ title: () => (notice.value ? `Message from ${notice.value.practice_name}` : 'Message') })
</script>

<template>
  <AppShell>
    <article v-if="notice" class="card">
      <h1>Message from {{ notice.practice_name }}</h1>
      <p>{{ notice.practice_name }} sent you a supplement order. Sign in to view and pay.</p>
      <NuxtLink :to="notice.sign_in_path" class="button">Sign in to view</NuxtLink>
      <p class="note">Stand-in message: in a real launch this arrives by email or text.</p>
    </article>
    <ProblemMessage
      v-else-if="error"
      :problem="(error.data as Problem) ?? null"
      :copy="{ 'not-found': 'We can\'t find this order.' }"
    />
  </AppShell>
</template>

<style scoped>
.card { max-width: 480px; margin: 0 auto; overflow-wrap: anywhere; }
.button { display: block; text-align: center; min-height: 44px; line-height: 44px; background: #1a4d8f; color: #fff; text-decoration: none; }
.note { color: #444; font-size: 14px; }
</style>
