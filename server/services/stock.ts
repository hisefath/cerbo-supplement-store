// BE-13 StockService (lld.md §2, SEQ-2, INV-5): stock counts change only through recorded movements that never go
// below zero. reserveForOrder and releaseForOrder run inside BE-10's payment transactions; product rows are always
// locked in id order, so two payments for the same products wait on each other instead of deadlocking (AE-024).
import type { Transaction } from 'kysely'
import type { Database } from '../utils/db-types'
import { ProblemError } from '../utils/problem'

export interface StockNeed {
  productId: string
  quantity: number
  unitsInStock: number
}

/** The lines that want more than is in stock, named as /problems/insufficient-stock names them; null when none. */
export function shortOfStock(needs: StockNeed[]): { productIds: number[]; unitsAvailable: number[] } | null {
  const short = needs.filter((n) => n.quantity > n.unitsInStock)
  if (short.length === 0) return null
  return { productIds: short.map((n) => Number(n.productId)), unitsAvailable: short.map((n) => n.unitsInStock) }
}

/** Units of each product an order's sale movements took and its releases have not yet given back. */
export function outstandingByProduct(moves: { product_id: string; change: number }[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const m of moves) out.set(m.product_id, (out.get(m.product_id) ?? 0) - m.change)
  for (const [id, n] of out) if (n <= 0) out.delete(id)
  return out
}

const byId = (a: string, b: string) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0)

async function lockProducts(tx: Transaction<Database>, productIds: string[]) {
  return tx.selectFrom('products').select(['id', 'units_in_stock']).where('id', 'in', productIds).orderBy('id').forUpdate().execute()
}

async function move(tx: Transaction<Database>, orderId: string, productId: string, change: number, kind: 'sale' | 'sale_release') {
  const p = await tx
    .updateTable('products')
    .set((eb) => ({ units_in_stock: eb('units_in_stock', '+', change) }))
    .where('id', '=', productId)
    .returning('units_in_stock')
    .executeTakeFirstOrThrow()
  await tx
    .insertInto('stock_movements')
    .values({ product_id: productId, change, kind, reason: `Order ${orderId}`, order_id: orderId, units_after: p.units_in_stock })
    .execute()
}

/** FR-026, FR-027: lowers stock by each line's quantity with a `sale` movement, or refuses the whole order with
 *  /problems/insufficient-stock naming the short items (the caller's transaction then rolls back: no charge). */
export async function reserveForOrder(tx: Transaction<Database>, orderId: bigint): Promise<void> {
  const id = orderId.toString()
  const lines = await tx.selectFrom('order_lines').select(['product_id', 'quantity']).where('order_id', '=', id).execute()
  if (lines.length === 0) return
  const stock = new Map((await lockProducts(tx, lines.map((l) => l.product_id))).map((p) => [p.id, p.units_in_stock]))
  const short = shortOfStock(lines.map((l) => ({ productId: l.product_id, quantity: l.quantity, unitsInStock: stock.get(l.product_id) ?? 0 })))
  if (short) throw new ProblemError('insufficient-stock', short)
  for (const l of [...lines].sort((a, b) => byId(a.product_id, b.product_id))) await move(tx, id, l.product_id, -l.quantity, 'sale')
}

/** FR-035, FM-1, FM-3: gives back what the order reserved and has not yet returned, with `sale_release` movements.
 *  Returns nothing when nothing is out, so calling it twice for one reservation is harmless. */
export async function releaseForOrder(tx: Transaction<Database>, orderId: bigint): Promise<void> {
  const id = orderId.toString()
  const moves = await tx
    .selectFrom('stock_movements')
    .select(['product_id', 'change'])
    .where('order_id', '=', id)
    .where('kind', 'in', ['sale', 'sale_release'])
    .execute()
  const out = outstandingByProduct(moves)
  if (out.size === 0) return
  const productIds = [...out.keys()].sort(byId)
  await lockProducts(tx, productIds)
  for (const p of productIds) await move(tx, id, p, out.get(p)!, 'sale_release')
}
