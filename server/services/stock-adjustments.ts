// BE-13 StockService, staff side (lld.md §2, SEQ-6): adjust and listStock. Platform staff change stock only through an
// `adjustment` movement that records who, why and the count after (FR-030, INV-4); stock never goes below zero (INV-5).
// reserveForOrder and releaseForOrder stay in stock.ts (M5-T002).
import { sql } from 'kysely'
import { z } from 'zod'
import { useDb } from '../utils/db'
import { ProblemError } from '../utils/problem'
import { decodeCursor, encodeCursor } from './pricing'
import type { Viewer } from './session'

const HISTORY_PAGE = 25

/** EP-32 body (openapi StockAdjustmentRequest). confirm_large_change is the S7 form's own check; the server accepts it. */
export const StockAdjustmentRequest = z.strictObject({
  change: z.int().refine((n) => n !== 0, 'Enter a whole number, like 12 or -3.'),
  reason: z.string().trim().min(1, 'Add a reason so others know why stock changed.').max(200),
  expected_units_in_stock: z.int().min(0),
  confirm_large_change: z.boolean().default(false),
})
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentRequest>

export interface StockMovement {
  product_name: string
  change: number
  kind: 'sale' | 'sale_release' | 'adjustment'
  reason: string
  actor_display_name: string | null
  created_at: Date
  units_in_stock_after: number
}

export interface StockList {
  products: { product_id: number; name: string; units_in_stock: number }[]
  history: StockMovement[]
  history_next_cursor: string | null
}

/** The count after the change, or /problems/stale-stock (the form saw an old count) or /problems/insufficient-stock
 *  (it would go below zero). */
export function checkAdjustment(productId: bigint, unitsInStock: number, input: { change: number; expected_units_in_stock: number }): number {
  if (input.expected_units_in_stock !== unitsInStock) throw new ProblemError('stale-stock', { unitsInStock })
  const after = unitsInStock + input.change
  if (after < 0) throw new ProblemError('insufficient-stock', { productIds: [Number(productId)], unitsAvailable: [unitsInStock] })
  return after
}

/** EP-32: one transaction locks the product, checks the count, updates it and appends the movement (SEQ-6 step 5). */
export async function adjust(viewer: Viewer, productId: bigint, input: StockAdjustmentInput): Promise<StockMovement> {
  return useDb().transaction().execute(async (tx) => {
    const p = await tx
      .selectFrom('products')
      .select(['id', 'name', 'units_in_stock'])
      .where('id', '=', productId.toString())
      .forUpdate()
      .executeTakeFirst()
    if (!p) throw new ProblemError('not-found')
    const after = checkAdjustment(productId, p.units_in_stock, input)
    await tx.updateTable('products').set({ units_in_stock: after }).where('id', '=', p.id).execute()
    const m = await tx
      .insertInto('stock_movements')
      .values({ product_id: p.id, change: input.change, kind: 'adjustment', reason: input.reason, actor_id: viewer.userId.toString(), units_after: after })
      .returning('created_at')
      .executeTakeFirstOrThrow()
    return {
      product_name: p.name,
      change: input.change,
      kind: 'adjustment',
      reason: input.reason,
      actor_display_name: viewer.displayName,
      created_at: m.created_at,
      units_in_stock_after: after,
    }
  })
}

/** EP-31: every product's count, plus one page of every stock movement, newest first (FR-029, FR-030). */
export async function listStock(_viewer: Viewer, historyCursor?: string): Promise<StockList> {
  const after = historyCursor ? decodeCursor(historyCursor) : undefined
  const db = useDb()
  const products = await db.selectFrom('products').select(['id', 'name', 'units_in_stock']).orderBy('name').execute()
  let history = db
    .selectFrom('stock_movements')
    .innerJoin('products', 'products.id', 'stock_movements.product_id')
    .leftJoin('users', 'users.id', 'stock_movements.actor_id')
    .select([
      'stock_movements.id',
      sql<string>`stock_movements.created_at::text`.as('at'),
      'products.name as product_name',
      'stock_movements.change',
      'stock_movements.kind',
      'stock_movements.reason',
      'users.display_name as actor_display_name',
      'stock_movements.created_at',
      'stock_movements.units_after as units_in_stock_after',
    ])
  if (after) history = history.where(sql<boolean>`(stock_movements.created_at, stock_movements.id) < (${after.at}::timestamptz, ${after.id}::bigint)`)
  const page = await history.orderBy('stock_movements.created_at', 'desc').orderBy('stock_movements.id', 'desc').limit(HISTORY_PAGE + 1).execute()
  const shown = page.slice(0, HISTORY_PAGE)
  const last = shown.at(-1)
  return {
    products: products.map((p) => ({ product_id: Number(p.id), name: p.name, units_in_stock: p.units_in_stock })),
    history: shown.map(({ id: _id, at: _at, ...h }) => h),
    history_next_cursor: page.length > HISTORY_PAGE && last ? encodeCursor(last.at, last.id) : null,
  }
}
