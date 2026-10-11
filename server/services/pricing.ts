// BE-8 PricingService (lld.md §2, SEQ-4): a practice's price changes only through a recorded, floor-checked change.
// Reads `products`; writes `practice_prices` and the append-only `price_changes` (INV-4) in one transaction.
import { sql } from 'kysely'
import { z } from 'zod'
import { useDb } from '../utils/db'
import { ProblemError } from '../utils/problem'
import { defaultPriceCents, lowestAllowedPriceCents, priceFromMargin } from './money'
import type { Viewer } from './session'

const HISTORY_PAGE = 25
/** D83: the highest price, given or from a margin ($100,000.00). */
const MAX_PRICE_CENTS = 10_000_000

/** EP-28 body (openapi PriceChangeRequest): exactly one of price_cents or margin_basis_points, and a reason. */
export const PriceChangeRequest = z
  .strictObject({
    price_cents: z.int().positive().max(MAX_PRICE_CENTS, 'Enter a price of $100,000.00 or less.').optional(),
    margin_basis_points: z.int().min(0).max(9999).optional(),
    reason: z.string().trim().min(1, 'Add a reason so others know why the price changed.').max(200),
    expected_current_price_cents: z.int().positive(),
  })
  .refine((b) => (b.price_cents === undefined) !== (b.margin_basis_points === undefined), {
    message: 'Enter a new price or a margin, not both.',
    path: ['price_cents'],
  })
export type PriceChangeInput = z.infer<typeof PriceChangeRequest>

export interface PracticePrice {
  product_id: number
  name: string
  unit_cost_cents: number
  price_cents: number
  margin_basis_points: number
  is_default: boolean
  set_by_display_name: string | null
  lowest_allowed_price_cents: number
}

export interface PriceChange {
  product_name: string
  changed_by_display_name: string
  changed_at: Date
  old_price_cents: number
  new_price_cents: number
  reason: string
}

export interface PriceList {
  prices: PracticePrice[]
  history: PriceChange[]
  history_next_cursor: string | null
}

/** (price − cost) ÷ price in basis points, rounded half-up (openapi PracticePrice.margin_basis_points). */
export function marginBasisPoints(priceCents: number, unitCostCents: number): number {
  return Math.floor(((priceCents - unitCostCents) * 20000 + priceCents) / (2 * priceCents))
}

/** The price a change asks for, or /problems/validation at its field when it passes $100,000.00 (D83), or
 *  /problems/below-price-floor with the lowest allowed price (FR-018, FR-020). */
export function priceFor(productId: bigint, unitCostCents: number, input: { price_cents?: number; margin_basis_points?: number }): number {
  const price = input.price_cents ?? priceFromMargin(unitCostCents, input.margin_basis_points!)
  if (price > MAX_PRICE_CENTS) {
    const pointer = input.price_cents === undefined ? '#/margin_basis_points' : '#/price_cents'
    throw new ProblemError('validation', { errors: [{ pointer, detail: 'That makes the price more than $100,000.00.' }] })
  }
  const lowest = lowestAllowedPriceCents(unitCostCents)
  if (price < lowest) throw new ProblemError('below-price-floor', { lowestAllowedPriceCents: lowest, productIds: [Number(productId)] })
  return price
}

/** Opaque history cursor: the last row's changed_at (PostgreSQL text, microseconds kept) and id. */
export function encodeCursor(at: string, id: string): string {
  return Buffer.from(JSON.stringify([at, id])).toString('base64url')
}

export function decodeCursor(cursor: string): { at: string; id: string } {
  let v: unknown
  try {
    v = JSON.parse(Buffer.from(cursor, 'base64url').toString())
  } catch {
    v = undefined
  }
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'string' &&
    !Number.isNaN(Date.parse(v[0])) &&
    typeof v[1] === 'string' &&
    /^\d{1,18}$/.test(v[1])
  ) {
    return { at: v[0], id: v[1] }
  }
  throw new ProblemError('validation', { errors: [{ pointer: '#/query/history_cursor', detail: 'Unknown cursor.' }] })
}

function practiceOf(viewer: Viewer): string {
  if (viewer.practiceId === null) throw new ProblemError('forbidden')
  return viewer.practiceId.toString()
}

function toPracticePrice(
  r: { id: string; name: string; unit_cost_cents: number },
  price: number | null,
  setBy: string | null,
): PracticePrice {
  const p = price ?? defaultPriceCents(r.unit_cost_cents)
  return {
    product_id: Number(r.id),
    name: r.name,
    unit_cost_cents: r.unit_cost_cents,
    price_cents: p,
    margin_basis_points: marginBasisPoints(p, r.unit_cost_cents),
    is_default: price === null,
    set_by_display_name: price === null ? null : setBy,
    lowest_allowed_price_cents: lowestAllowedPriceCents(r.unit_cost_cents),
  }
}

/** EP-27: every product at this practice's price, plus one page of its history, newest first (FR-017, FR-019). */
export async function listPrices(viewer: Viewer, historyCursor?: string): Promise<PriceList> {
  const practiceId = practiceOf(viewer)
  const after = historyCursor ? decodeCursor(historyCursor) : undefined
  const db = useDb()
  const rows = await db
    .selectFrom('products')
    .leftJoin('practice_prices', (j) => j.onRef('practice_prices.product_id', '=', 'products.id').on('practice_prices.practice_id', '=', practiceId))
    .leftJoin('users', 'users.id', 'practice_prices.set_by')
    .select(['products.id', 'products.name', 'products.unit_cost_cents', 'practice_prices.price_cents', 'users.display_name'])
    .orderBy('products.name')
    .execute()
  let history = db
    .selectFrom('price_changes')
    .innerJoin('products', 'products.id', 'price_changes.product_id')
    .innerJoin('users', 'users.id', 'price_changes.changed_by')
    .select([
      'price_changes.id',
      sql<string>`price_changes.changed_at::text`.as('at'),
      'price_changes.changed_at',
      'products.name as product_name',
      'users.display_name as changed_by_display_name',
      'price_changes.old_price_cents',
      'price_changes.new_price_cents',
      'price_changes.reason',
    ])
    .where('price_changes.practice_id', '=', practiceId)
  if (after) history = history.where(sql<boolean>`(price_changes.changed_at, price_changes.id) < (${after.at}::timestamptz, ${after.id}::bigint)`)
  const page = await history.orderBy('price_changes.changed_at', 'desc').orderBy('price_changes.id', 'desc').limit(HISTORY_PAGE + 1).execute()
  const more = page.length > HISTORY_PAGE
  const shown = page.slice(0, HISTORY_PAGE)
  const last = shown.at(-1)
  return {
    prices: rows.map((r) => toPracticePrice(r, r.price_cents, r.display_name)),
    history: shown.map(({ id: _id, at: _at, ...h }) => h),
    history_next_cursor: more && last ? encodeCursor(last.at, last.id) : null,
  }
}

/** EP-28: sets the practice price and records the change, or refuses (floor, stale form, unknown product). */
export async function changePrice(viewer: Viewer, productId: bigint, input: PriceChangeInput): Promise<PracticePrice> {
  const practiceId = practiceOf(viewer)
  const product = await useDb()
    .selectFrom('products')
    .select(['id', 'name', 'unit_cost_cents'])
    .where('id', '=', productId.toString())
    .executeTakeFirst()
  if (!product) throw new ProblemError('not-found')
  const price = priceFor(productId, product.unit_cost_cents, input)

  await useDb().transaction().execute(async (tx) => {
    const current = async () => {
      const row = await tx
        .selectFrom('practice_prices')
        .select(['price_cents', 'set_by'])
        .where('practice_id', '=', practiceId)
        .where('product_id', '=', product.id)
        .forUpdate()
        .executeTakeFirst()
      return row ?? null
    }
    const stale = async (): Promise<never> => {
      const row = await current()
      const by = row
        ? await tx.selectFrom('users').select('display_name').where('id', '=', row.set_by).executeTakeFirst()
        : undefined
      throw new ProblemError('stale-price', {
        currentPriceCents: row?.price_cents ?? defaultPriceCents(product.unit_cost_cents),
        changedBy: by?.display_name ?? null,
      })
    }
    const row = await current()
    const old = row?.price_cents ?? defaultPriceCents(product.unit_cost_cents)
    if (old !== input.expected_current_price_cents) await stale()
    // The row lock covers an existing price; the WHERE covers two first changes racing to insert one.
    const set = await tx
      .insertInto('practice_prices')
      .values({ practice_id: practiceId, product_id: product.id, price_cents: price, set_by: viewer.userId.toString() })
      .onConflict((oc) =>
        oc
          .columns(['practice_id', 'product_id'])
          .doUpdateSet({ price_cents: price, set_by: viewer.userId.toString(), set_at: sql<Date>`now()` })
          .where('practice_prices.price_cents', '=', old),
      )
      .returning('price_cents')
      .executeTakeFirst()
    if (!set) await stale()
    await tx
      .insertInto('price_changes')
      .values({
        practice_id: practiceId,
        product_id: product.id,
        old_price_cents: old,
        new_price_cents: price,
        reason: input.reason,
        changed_by: viewer.userId.toString(),
      })
      .execute()
  })
  return toPracticePrice(product, price, viewer.displayName)
}
