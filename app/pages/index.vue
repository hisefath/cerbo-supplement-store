<!-- FE-25 HomePage (S15; lld.md Site root and safe landing): a role with a work page goes straight to it (ROLE_HOME);
     a role with none yet sees its home with what to do instead. The page guard (BE-2) has already sent a stranger to
     sign-in; if the session still can't be read, sign-in it is. Redirects only to fixed paths. -->
<script setup lang="ts">
interface Me { role: string; display_name: string }

const me = await useRequestFetch()<Me>('/api/session').catch(() => null)
const pages = me ? ROLE_PAGES[me.role] : undefined
if (!me || !pages) await navigateTo('/sign-in', { replace: true, redirectCode: 302 })
else if (pages[0]) await navigateTo(pages[0].path, { replace: true, redirectCode: 302 })

const ROLE_NAMES: Record<string, string> = { patient: 'Patient', sre: 'Site reliability', data_analyst: 'Data analyst', none: 'No role' }
const EMPTY: Record<string, string> = {
  patient: 'Your orders open from the message your practice sends you.',
  sre: 'Nothing to open yet: system health and operations access will appear here when they are ready.',
  data_analyst: 'Nothing to open yet: platform health and the volume report will appear here when they are ready.',
  none: 'Your account has no role yet. Contact platform support to get access.',
}
const title = `Welcome, ${me?.display_name ?? ''}`
useHead({ title })
</script>

<template>
  <AppShell>
    <div class="page-band">
      <h1>{{ title }}</h1>
      <p>{{ ROLE_NAMES[me?.role ?? ''] }}</p>
    </div>
    <section class="card">
      <h2>Your pages</h2>
      <ul v-if="pages?.length">
        <li v-for="p in pages" :key="p.path"><NuxtLink :to="p.path">{{ p.title }}</NuxtLink></li>
      </ul>
      <p v-else>{{ EMPTY[me?.role ?? ''] }}</p>
    </section>
  </AppShell>
</template>

<style scoped>
/* S15 on the VL-2 theme (theme.css): layout only here. */
h1 { overflow-wrap: anywhere; }
li a { display: inline-block; min-height: 24px; }
</style>
