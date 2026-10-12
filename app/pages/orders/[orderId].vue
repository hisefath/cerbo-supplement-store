<!-- FE-7 PatientOrderPage (S2, EP-4): the patient reviews her order (EP-21), then FE-8 holds prices and pays, then
     FE-9 shows the receipt. Someone else's order shows only "We can't find this order." (FR-009). -->
<script setup lang="ts">
import type { Receipt, ReceiptLine } from '~/components/checkout/ReceiptView.vue'
import type { Problem } from '~/components/ProblemMessage.vue'

interface OrderView {
  order_id: number
  status: string
  practice_name: string
  provider_display_name: string
  lines: ReceiptLine[]
  total_cents: number
  price_changes: { product_id: number; name: string; old_price_cents: number; new_price_cents: number }[]
  prices_held_until: string | null
  paid_at: string | null
  is_test_payment: true
  hold_ended: boolean
}

const route = useRoute()
const orderId = Number(route.params.orderId)
const { data: order, error, refresh, status } = await useFetch<OrderView>(`/api/orders/${orderId}`) // ST-8
const receipt = ref<Receipt | null>(null)
// ponytail: FE-8 emits no "checkout started" event, so step 1 stays above the checkout instead of being replaced by
// it; Back remounts FE-8 (a new step 1 press). Upgrade: FE-8 emits `started`, then hide this section on it.
const checkoutKey = ref(0)

useHead({ title: 'Your supplement order' })
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const shownReceipt = computed<Receipt | null>(() => {
  if (receipt.value) return receipt.value
  const o = order.value
  if (o?.status !== 'paid' || !o.paid_at) return null
  return { order_id: o.order_id, amount_paid_cents: o.total_cents, paid_at: o.paid_at, lines: o.lines, is_test_payment: true }
})
const canPay = computed(() => ['sent', 'in_checkout', 'payment_failed'].includes(order.value?.status ?? ''))
async function back() {
  checkoutKey.value++
  await refresh()
}
</script>

<template>
  <AppShell>
    <main class="order">
      <p v-if="status === 'pending'" role="status">Loading your order…</p>
      <ProblemMessage
        v-else-if="error"
        :problem="(error.data as Problem) ?? null"
        :copy="{ 'not-found': 'We can\'t find this order.', unauthenticated: 'You were signed out after 15 minutes without activity. Sign in to return to your order.' }"
        @retry="refresh"
      />
      <CheckoutReceiptView v-else-if="shownReceipt" :receipt="shownReceipt" />
      <template v-else-if="order">
        <section aria-labelledby="order-heading">
          <div class="page-band">
            <h1 id="order-heading">Your supplement order</h1>
            <p>From {{ order.provider_display_name }}, {{ order.practice_name }}</p>
          </div>
          <div class="card">
            <p v-if="order.status === 'cancelled'" role="status">This order was cancelled by your practice.</p>
            <p v-if="order.status === 'needs_review'" role="status">We couldn't complete this payment. No money was taken. Your practice will contact you.</p>
            <p v-if="order.hold_ended" role="status">Your 30-minute price hold ended. These are the current prices.</p>
            <ul class="notices">
              <li v-for="c in order.price_changes" :key="c.product_id">
                <span aria-hidden="true">(i)</span> {{ c.name }} price changed: {{ dollars(c.old_price_cents) }} to {{ dollars(c.new_price_cents) }}.
              </li>
            </ul>
            <ul class="lines">
              <li v-for="l in order.lines" :key="l.product_id">
                <span class="name">{{ l.name }}</span>
                <span>{{ l.quantity }} x {{ dollars(l.unit_price_cents) }}</span>
                <span>{{ dollars(l.line_total_cents) }}</span>
              </li>
            </ul>
            <dl class="total">
              <dt>Total due</dt>
              <dd>{{ dollars(order.total_cents) }}</dd>
          </dl>
          </div>
        </section>
        <CheckoutStep v-if="canPay" :key="checkoutKey" :order="order" @back="back" @paid="(r: Receipt) => (receipt = r)" />
      </template>
      <p class="help">Questions? Contact your practice.</p>
    </main>
  </AppShell>
</template>

<style scoped>
/* S2 on the VL-2 theme (theme.css): title in the sky band, the order on a white card; layout only here. */
.order { max-width: 560px; margin: 0 auto; }
.order .card { margin-bottom: var(--space-section); }
.notices, .lines { list-style: none; padding: 0; }
.notices { color: var(--color-ink-muted); }
.lines li { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-variant-numeric: tabular-nums; }
.name { overflow-wrap: anywhere; }
.total { display: grid; grid-template-columns: 1fr auto; margin: 0; padding-top: 8px; font-variant-numeric: tabular-nums; }
.total dd { margin: 0; font-weight: 600; }
.help { color: var(--color-ink-muted); }
</style>
