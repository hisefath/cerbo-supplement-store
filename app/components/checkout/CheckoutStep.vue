<!-- FE-8 CheckoutStep (S2 step 2, SEQ-2 steps 4-15): starts checkout (EP-22), shows the price hold and the test-payment
     label, and pays once (EP-23). Owns ST-4: one Idempotency-Key per pay press, kept for retries of that press. -->
<script setup lang="ts">
import type { Problem } from '../ProblemMessage.vue'
import type { Receipt } from './ReceiptView.vue'

export interface CheckoutOrder {
  order_id: number
  total_cents: number
  lines: { product_id: number; name: string }[]
}
interface Checkout {
  order_id: number
  total_cents: number
  prices_held_until: string
}

const props = defineProps<{ order: CheckoutOrder }>()
const emit = defineEmits<{ paid: [receipt: Receipt]; back: [] }>()

const checkout = ref<Checkout | null>(null)
const key = ref<string | null>(null) // ST-4
const busy = ref(false)
const slow = ref(false)
const problem = ref<Problem | null>(null)

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const heldUntil = computed(() =>
  checkout.value ? new Date(checkout.value.prices_held_until).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
)
const total = computed(() => checkout.value?.total_cents ?? props.order.total_cents)
// FR-026, S2: name every item the payment found short of stock, by its name on this order.
const soldOut = computed(() => {
  const names = (problem.value?.productIds ?? []).map(
    (id) => props.order.lines.find((l) => l.product_id === id)?.name ?? 'An item',
  )
  if (names.length === 0) names.push('An item')
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `${list} sold out before you paid. Nothing was charged. Contact your practice to change your order.`
})

async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
  busy.value = true
  problem.value = null
  const timer = setTimeout(() => (slow.value = true), 10_000)
  try {
    return await fn()
  } catch (e: unknown) {
    problem.value = (e as { data?: Problem }).data ?? null
    if (!problem.value) problem.value = { type: '/problems/offline' }
  } finally {
    clearTimeout(timer)
    busy.value = false
    slow.value = false
  }
}

async function start() {
  const c = await run(() => $fetch<Checkout>(`/api/orders/${props.order.order_id}/checkout`, { method: 'POST' }))
  if (c) checkout.value = c
}

async function payNow() {
  key.value ??= crypto.randomUUID()
  const r = await run(() =>
    $fetch<Receipt>(`/api/orders/${props.order.order_id}/payments`, {
      method: 'POST',
      headers: { 'idempotency-key': key.value! },
    }),
  )
  if (r) emit('paid', r)
  // The hold ended unpaid, or the order already moved on (paid, failed, cancelled): back to the order, which
  // refetches EP-21 and shows its real state (FE-7, FR-037; M5-pass7 R2).
  else if (problem.value?.type === '/problems/checkout-expired' || problem.value?.type === '/problems/invalid-transition')
    emit('back')
  // A refused payment took no money; the next press is a new request (FR-035).
  else if (problem.value?.type && problem.value.type !== '/problems/offline') key.value = null
}
</script>

<template>
  <section aria-labelledby="checkout-heading" class="checkout card">
    <template v-if="!checkout">
      <ProblemMessage :problem="problem" :copy="{ offline: 'You\'re offline. No money was taken. Try again when you\'re back online.' }" @retry="start" />
      <button type="button" class="btn-primary" :disabled="busy" @click="start">Continue to payment</button>
    </template>
    <template v-else>
      <h2 id="checkout-heading">Checkout</h2>
      <p>Your prices are held for 30 minutes, until {{ heldUntil }}.</p>
      <dl>
        <dt>Total</dt>
        <dd>{{ dollars(total) }}</dd>
      </dl>
      <p class="test">Test payment: no real money moves.</p>
      <p v-if="busy" role="status">{{ slow ? 'This is taking longer than usual. Don\'t pay again; we\'ll show the result here.' : 'Processing your payment…' }}</p>
      <ProblemMessage
        :problem="problem"
        :copy="{
          'payment-failed': 'Your payment didn\'t go through. No money was taken. Try again.',
          'order-under-review': 'We couldn\'t complete this payment. No money was taken. Your practice will contact you.',
          'insufficient-stock': soldOut,
          internal: 'We couldn\'t complete your payment. No money was taken. Try again.',
          offline: 'You\'re offline. No money was taken. Try again when you\'re back online.',
        }"
        @retry="payNow"
      />
      <button type="button" class="btn-primary" :disabled="busy" @click="payNow">Pay {{ dollars(total) }}</button>
      <button type="button" class="btn-secondary" @click="emit('back')">Back to order</button>
    </template>
  </section>
</template>

<style scoped>
/* S2 step 2 on the VL-2 theme (theme.css): a white card with the glowing primary button; layout only here. */
.checkout { max-width: 560px; margin: 0 auto; }
dl { display: grid; grid-template-columns: 1fr auto; font-variant-numeric: tabular-nums; }
dd { margin: 0; text-align: right; font-weight: 600; }
.test { color: var(--color-ink-muted); }
.btn-primary, .btn-secondary { display: block; width: 100%; margin: 8px 0; }
.btn-primary { font-weight: 600; }
</style>
