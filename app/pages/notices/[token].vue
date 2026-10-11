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
      <div class="page-band">
        <h1>Message from {{ notice.practice_name }}</h1>
      </div>
      <p>{{ notice.practice_name }} sent you a supplement order. Sign in to view and pay.</p>
      <NuxtLink :to="notice.sign_in_path" class="button btn-primary">Sign in to view</NuxtLink>
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
/* S3 on the VL-2 theme (theme.css): the title sits in the sky band at the top of the card; layout only here. */
.card { max-width: 480px; margin: 0 auto; overflow-wrap: anywhere; }
.card .page-band { margin: calc(-1 * var(--space-card)) calc(-1 * var(--space-card)) 16px; border-radius: var(--radius-card) var(--radius-card) 0 0; }
.button { display: block; box-sizing: border-box; text-align: center; line-height: 44px; text-decoration: none; }
.note { color: var(--color-ink-muted); font-size: var(--text-detail); }
</style>
