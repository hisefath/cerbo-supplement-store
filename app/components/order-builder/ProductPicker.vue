<!-- FE-5 ProductPicker (S1): products with price and stock; Quantity + Add per product. Stateless. -->
<script setup lang="ts">
export interface CatalogItem {
  product_id: number
  name: string
  price_cents: number
  units_in_stock: number
  lowest_allowed_price_cents: number
}
export interface DraftLine {
  productId: number
  quantity: number
}

const props = defineProps<{ items: CatalogItem[]; lines: DraftLine[] }>()
const emit = defineEmits<{ add: [productId: number, quantity: number] }>()

const qty = reactive<Record<number, number>>({})
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`
const inOrder = (id: number) => props.lines.find((l) => l.productId === id)?.quantity ?? 0
function add(item: CatalogItem) {
  const q = Math.floor(Number(qty[item.product_id] ?? 1))
  if (q >= 1) emit('add', item.product_id, q)
}
</script>

<template>
  <section aria-labelledby="products-heading" class="card">
    <h2 id="products-heading">Products</h2>
    <ul class="products">
      <li v-for="item in items" :key="item.product_id">
        <div class="name">{{ item.name }}</div>
        <div>
          {{ dollars(item.price_cents) }} ·
          <template v-if="item.units_in_stock > 0">{{ item.units_in_stock }} in stock</template>
          <template v-else>Out of stock</template>
        </div>
        <form v-if="item.units_in_stock > 0" @submit.prevent="add(item)">
          <label>
            Quantity
            <input
              v-model.number="qty[item.product_id]"
              type="number"
              min="1"
              :max="Math.max(1, item.units_in_stock - inOrder(item.product_id))"
              placeholder="1"
              :aria-label="`Quantity, ${item.name}`"
              aria-describedby="qty-help"
            />
          </label>
          <button type="submit" class="btn-secondary">Add</button>
        </form>
      </li>
    </ul>
    <p id="qty-help" class="help">Up to the number in stock.</p>
  </section>
</template>

<style scoped>
.products { list-style: none; padding: 0; }
.products li { padding: 8px 0; border-bottom: 1px solid var(--color-border); }
.name { font-weight: 600; overflow-wrap: anywhere; }
input { width: 4em; margin: 0 8px; }
.help { color: var(--color-ink-muted); font-size: var(--text-detail); }
</style>
