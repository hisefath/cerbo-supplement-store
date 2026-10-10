// BE-7 CatalogService (lld.md §2, SEQ-1 steps 3-4): products at the practice's current prices, with stock.
import { useDb } from '../utils/db'
import { assertCanActOnPatient, type PatientRef } from './access-policy'
import { defaultPriceCents, lowestAllowedPriceCents } from './money'
import type { Viewer } from './session'

export interface CatalogItem {
  product_id: number
  name: string
  price_cents: number
  units_in_stock: number
  lowest_allowed_price_cents: number
}

export interface Catalog {
  patient_display_name: string
  items: CatalogItem[]
}

export async function loadPatient(patientId: bigint): Promise<(PatientRef & { displayName: string }) | undefined> {
  const u = await useDb()
    .selectFrom('users')
    .select(['id', 'role', 'practice_id', 'display_name'])
    .where('id', '=', patientId.toString())
    .executeTakeFirst()
  return u && {
    id: BigInt(u.id),
    role: u.role,
    practiceId: u.practice_id === null ? null : BigInt(u.practice_id),
    displayName: u.display_name,
  }
}

export async function catalogForPatient(viewer: Viewer, patientId: bigint): Promise<Catalog> {
  const patient = await loadPatient(patientId)
  assertCanActOnPatient(viewer, patient)
  const rows = await useDb()
    .selectFrom('products')
    .leftJoin('practice_prices', (j) =>
      j.onRef('practice_prices.product_id', '=', 'products.id').on('practice_prices.practice_id', '=', patient.practiceId!.toString()),
    )
    .select(['products.id', 'products.name', 'products.unit_cost_cents', 'products.units_in_stock', 'practice_prices.price_cents'])
    .orderBy('products.name')
    .execute()
  return {
    patient_display_name: patient.displayName,
    items: rows.map((r) => ({
      product_id: Number(r.id),
      name: r.name,
      price_cents: r.price_cents ?? defaultPriceCents(r.unit_cost_cents),
      units_in_stock: r.units_in_stock,
      lowest_allowed_price_cents: lowestAllowedPriceCents(r.unit_cost_cents),
    })),
  }
}

/** The practice price, else the default (FR-017, FR-022). */
export async function currentPrices(practiceId: bigint, productIds: bigint[]): Promise<Map<bigint, number>> {
  const prices = new Map<bigint, number>()
  if (productIds.length === 0) return prices
  const ids = productIds.map(String)
  const rows = await useDb()
    .selectFrom('products')
    .leftJoin('practice_prices', (j) =>
      j.onRef('practice_prices.product_id', '=', 'products.id').on('practice_prices.practice_id', '=', practiceId.toString()),
    )
    .select(['products.id', 'products.unit_cost_cents', 'practice_prices.price_cents'])
    .where('products.id', 'in', ids)
    .execute()
  for (const r of rows) prices.set(BigInt(r.id), r.price_cents ?? defaultPriceCents(r.unit_cost_cents))
  return prices
}
