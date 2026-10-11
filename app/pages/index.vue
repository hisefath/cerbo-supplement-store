<!-- Site root: sends the signed-in person to their role's home (flows.md F7 step 2). The page guard (BE-2) has already
     sent a stranger to sign-in; if the session still can't be read, sign-in it is (lld.md Site root). -->
<script setup lang="ts">
const me = await useRequestFetch()<{ role: string }>('/api/session').catch(() => null)
await navigateTo((me && ROLE_HOME[me.role]) ?? '/sign-in', { replace: true, redirectCode: 302 })
</script>

<template>
  <div />
</template>
