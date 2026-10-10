<!-- FE-23 ProblemMessage (lld.md §3): turns a problem (RFC 9457) into the screen's exact copy. `copy` overrides the
     text per problem slug; `names` turns product ids into names for stock and price-floor problems. -->
<script setup lang="ts">
export interface Problem {
  type?: string
  title?: string
  status?: number
  productIds?: number[]
  unitsAvailable?: number[]
  lowestAllowedPriceCents?: number
}

const props = defineProps<{ problem: Problem | null; copy?: Record<string, string>; names?: Record<number, string> }>()
const emit = defineEmits<{ retry: [] }>()

const slug = computed(() => props.problem?.type?.replace('/problems/', '') ?? 'offline')
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const text = computed(() => {
  const p = props.problem
  if (props.copy?.[slug.value]) return props.copy[slug.value]
  switch (slug.value) {
    case 'unauthenticated':
      return 'You were signed out after 15 minutes without activity.'
    case 'insufficient-stock':
      return `Only ${p?.unitsAvailable?.[0] ?? 0} in stock. Lower the quantity.`
    case 'below-price-floor': {
      const name = props.names?.[p?.productIds?.[0] ?? -1] ?? 'A product'
      const floor = p?.lowestAllowedPriceCents === undefined ? '' : ` of ${dollars(p.lowestAllowedPriceCents)}`
      return `${name} is below its lowest allowed price${floor}. Remove it or change its price in Practice prices.`
    }
    case 'offline':
      return "You're offline. Try again when you're back online."
    default:
      return p?.title ?? 'Something went wrong on our side. Try again.'
  }
})
const retryable = computed(() => slug.value === 'internal' || slug.value === 'offline')
</script>

<template>
  <div v-if="problem" role="alert" class="problem">
    <p>{{ text }}</p>
    <NuxtLink v-if="slug === 'unauthenticated'" to="/sign-in">Sign in</NuxtLink>
    <button v-if="retryable" type="button" @click="emit('retry')">Try again</button>
  </div>
</template>

<style scoped>
.problem { border: 2px solid #b00020; padding: 8px 12px; margin: 8px 0; }
</style>
