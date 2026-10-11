<!-- FE-26 ErrorPage (lld.md Site root and safe landing; screens.md Global conventions "Page not found"): every page
     error, inside FE-1's frame. 404: "We couldn't find that page"; anything else: "Something went wrong on our side".
     Both offer "Go to your home" (/), which leads a signed-out person to sign-in. Nuxt keeps the status code. -->
<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (notFound.value ? "We couldn't find that page" : 'Something went wrong on our side. Try again in a moment.'))
useHead({ title })
</script>

<template>
  <AppShell>
    <div class="page-band">
      <h1>{{ title }}</h1>
    </div>
    <section class="card">
      <p v-if="notFound">The link may be old or mistyped.</p>
      <a href="/" class="btn-primary" @click="clearError({ redirect: '/' })">Go to your home</a>
    </section>
  </AppShell>
</template>
