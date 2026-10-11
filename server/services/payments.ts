// BE-10 PaymentService (lld.md §2, SEQ-2, SM-1, SM-2): take one test payment for a held order and record its split
// and ledger. Two short transactions around the gateway call, so a slow answer never holds a lock (D42). Stock is
// reserved in transaction 1 and given back when the payment fails (BE-13, FR-026, FR-027).
import { sql } from 'kysely'
import { useDb } from '../utils/db'
import { errorFacts, ProblemError } from '../utils/problem'
import { now } from './clock'
import { assertIsOrderPatient } from './access-policy'
import { allocateFee, assertSplitBalances, payoutCents, platformFeeCents, SplitMismatch, type Split } from './money'
import { expireHoldIfDueForPatient, type OrderLine } from './orders'
import { charge } from './payment-gateway'
import type { Viewer } from './session'
import { releaseForOrder, reserveForOrder } from './stock'

export interface Receipt {
  order_id: number
  amount_paid_cents: number
  paid_at: string
  lines: OrderLine[]
  is_test_payment: true
}

export interface SplitLine {
  quantity: number
  heldUnitPriceCents: number | null
  unitCostCents: number
}

/** The order's split at its held prices: one fee on the total (FR-011), payout = paid − cost − fee (FR-012), and each
 *  line's share of the fee (Q-2). */
export function computeSplit(lines: SplitLine[]): { split: Split; feeSharesCents: number[] } {
  if (lines.some((l) => l.heldUnitPriceCents === null)) throw new Error('every line needs a held price (INV-8)')
  const amounts = lines.map((l) => l.heldUnitPriceCents! * l.quantity)
  const amountPaidCents = amounts.reduce((a, b) => a + b, 0)
  const itemCostCents = lines.reduce((s, l) => s + l.unitCostCents * l.quantity, 0)
  const fee = platformFeeCents(amountPaidCents)
  return {
    split: {
      amountPaidCents,
      itemCostCents,
      platformFeeCents: fee,
      providerPayoutCents: payoutCents(amountPaidCents, itemCostCents, fee),
    },
    feeSharesCents: allocateFee(amounts, fee),
  }
}

// SEC-9 (TH-3): EP-23 is rate-limited like EP-15 sign-in (session.ts countAttempt): more than 10 payment attempts in
// 15 minutes for one person or one address answers 429 /problems/rate-limited.
const MAX_PAY_ATTEMPTS = 10
const PAY_WINDOW_MS = 15 * 60 * 1000
const PAY_LOCK = 6023 // advisory-lock class for EP-23 attempt keys (two-int form: its own key space)

/**
 * Refuses the payment attempt (429) when its person or address already has 10 in the window; otherwise records it.
 * Locks the person and the address first, so parallel attempts count and record one at a time. EP-23 calls it inside
 * the idempotency guard, so a replayed stored response is never counted.
 */
export async function countPayAttempt(userId: bigint, ip: string): Promise<void> {
  const t = now()
  const since = new Date(t.getTime() - PAY_WINDOW_MS)
  const user = userId.toString()
  await useDb()
    .transaction()
    .execute(async (trx) => {
      // always person then address, so two attempts can never wait on each other in a circle
      for (const key of [`user:${user}`, `ip:${ip}`])
        await sql`select pg_advisory_xact_lock(${PAY_LOCK}, hashtext(${key}))`.execute(trx)
      const recent = await trx
        .selectFrom('pay_rate_attempts')
        .select(['user_id', 'ip', 'attempted_at'])
        .where('attempted_at', '>', since)
        .where((eb) => eb.or([eb('user_id', '=', user), eb('ip', '=', ip)]))
        .orderBy('attempted_at')
        .execute()
      let retryAt = 0
      for (const mine of [recent.filter((a) => String(a.user_id) === user), recent.filter((a) => a.ip === ip)]) {
        // the next attempt is allowed once all but the newest 9 have left the window
        if (mine.length >= MAX_PAY_ATTEMPTS)
          retryAt = Math.max(retryAt, mine[mine.length - MAX_PAY_ATTEMPTS]!.attempted_at.getTime() + PAY_WINDOW_MS)
      }
      if (retryAt)
        throw new ProblemError('rate-limited', { retryAfterSeconds: Math.ceil((retryAt - t.getTime()) / 1000) })
      await trx.insertInto('pay_rate_attempts').values({ user_id: user, ip, attempted_at: t }).execute()
      await trx.deleteFrom('pay_rate_attempts').where('attempted_at', '<=', since).execute()
    })
}

export async function pay(viewer: Viewer, orderId: bigint, idempotencyKey: string): Promise<Receipt> {
  const db = useDb()
  await expireHoldIfDueForPatient(viewer, orderId)

  // Transaction 1: lock the order, check the hold and the split, record the attempt as processing, reserve the stock.
  const prepared = await db.transaction().execute(async (trx) => {
    const o = await trx
      .selectFrom('orders')
      .select([
        'id',
        'patient_id',
        'practice_id',
        'provider_id',
        'status',
        sql<boolean>`prices_held_until > now()`.as('hold_live'),
        sql<boolean>`checkout_started_at is not null`.as('checkout_started'),
      ])
      .where('id', '=', orderId.toString())
      .forUpdate()
      .executeTakeFirst()
    if (!o) throw new ProblemError('not-found')
    assertIsOrderPatient(viewer, { patientId: BigInt(o.patient_id), practiceId: BigInt(o.practice_id) })
    // The reconcile above already sent an ended hold back to sent: Pay still answers that the hold ended (FR-037).
    if (o.status === 'sent' && o.checkout_started) throw new ProblemError('checkout-expired')
    if (o.status !== 'in_checkout') throw new ProblemError('invalid-transition', { from: o.status, event: 'pay' })
    if (!o.hold_live) throw new ProblemError('checkout-expired')

    const lines = await trx
      .selectFrom('order_lines')
      .innerJoin('products', 'products.id', 'order_lines.product_id')
      .select([
        'order_lines.id',
        'order_lines.product_id',
        'order_lines.product_name',
        'order_lines.quantity',
        'order_lines.held_unit_price_cents',
        'products.unit_cost_cents',
      ])
      .where('order_lines.order_id', '=', o.id)
      .orderBy('order_lines.id')
      .execute()
    const { split, feeSharesCents } = computeSplit(
      lines.map((l) => ({ quantity: l.quantity, heldUnitPriceCents: l.held_unit_price_cents, unitCostCents: l.unit_cost_cents })),
    )
    try {
      assertSplitBalances(split)
      // ponytail: a negative payout would be refused by ck_orders_payout_nonneg after charging; review it before.
      if (split.providerPayoutCents < 0) throw new SplitMismatch(split)
    } catch (e) {
      if (!(e instanceof SplitMismatch)) throw e
      // FR-013: no charge; the order is listed for review. Committed, then refused below.
      await trx.updateTable('orders').set({ status: 'needs_review' }).where('id', '=', o.id).execute()
      return null
    }
    // LINV-6: a second payment while one is processing loses on uq_payment_attempts_one_processing, before it reserves
    // anything, so it answers 409 even when the first one took the last units (R3).
    const attempt = await trx
      .insertInto('payment_attempts')
      .values({ order_id: o.id, idempotency_key: idempotencyKey, amount_cents: split.amountPaidCents })
      .returning('id')
      .executeTakeFirstOrThrow()
      .catch((e: unknown) => {
        throw (e as { code?: string }).code === '23505' ? new ProblemError('invalid-transition', { from: 'in_checkout', event: 'pay' }) : e
      })
    // FR-026, AE-024: products locked in id order, after the order; short stock refuses here, so the rollback leaves no
    // attempt, no charge.
    await reserveForOrder(trx, orderId)
    return { order: o, lines, split, feeSharesCents, attemptId: attempt.id }
  })
  if (!prepared) throw new ProblemError('order-under-review')
  const { order, lines, split, feeSharesCents, attemptId } = prepared

  // FM-3: a failure that is not the gateway's answer (a configuration error, a database error, the order no longer
  // in_checkout) rolls transaction 2 back and leaves the order as it is. The attempt is closed without a reason, so the
  // next Pay is not blocked by uq_payment_attempts_one_processing (R1). A gateway exception or no answer within 10 s is
  // the gateway's no_answer (BE-11).
  let paidAt: Date
  try {
    const result = await charge({ orderId, amountCents: split.amountPaidCents, idempotencyKey })
    if (result.outcome === 'failed') {
      // SM-1, SM-2, FR-035: the gateway's failure marks the attempt failed and the order payment_failed.
      await failAttempt(attemptId, order.id, result.reason)
      throw new ProblemError('payment-failed')
    }
    paidAt = await recordPayment(order, lines, split, feeSharesCents, attemptId)
  } catch (e) {
    await closeAttempt(attemptId, order.id).catch((err) => console.error('could not close payment attempt', attemptId, errorFacts(err)))
    throw e
  }

  return {
    order_id: Number(order.id),
    amount_paid_cents: split.amountPaidCents,
    paid_at: paidAt.toISOString(),
    lines: lines.map((l) => ({
      product_id: Number(l.product_id),
      name: l.product_name,
      quantity: l.quantity,
      unit_price_cents: l.held_unit_price_cents!,
      line_total_cents: l.held_unit_price_cents! * l.quantity,
    })),
    is_test_payment: true,
  }
}

/** SM-2 processing -> failed, SM-1 in_checkout -> payment_failed: no money recorded, stock returned (FR-035, FM-1). */
async function failAttempt(attemptId: string, orderId: string, reason: 'declined' | 'no_answer'): Promise<void> {
  await useDb()
    .transaction()
    .execute(async (trx) => {
      await trx.selectFrom('orders').select('id').where('id', '=', orderId).forUpdate().execute()
      const closed = await trx
        .updateTable('payment_attempts')
        .set({ status: 'failed', failure_reason: reason, finished_at: sql`now()` })
        .where('id', '=', attemptId)
        .where('status', '=', 'processing')
        .executeTakeFirst()
      if (closed.numUpdatedRows === 1n) await releaseForOrder(trx, BigInt(orderId))
      await trx.updateTable('orders').set({ status: 'payment_failed' }).where('id', '=', orderId).where('status', '=', 'in_checkout').execute()
    })
}

/** SM-2 processing -> failed with no failure_reason: not the gateway's answer, so the order is left alone (FM-3), but
 *  the stock transaction 1 reserved is given back, or the next Pay would reserve it a second time. */
export async function closeAttempt(attemptId: string, orderId: string): Promise<void> {
  await useDb()
    .transaction()
    .execute(async (trx) => {
      await trx.selectFrom('orders').select('id').where('id', '=', orderId).forUpdate().execute()
      const closed = await trx
        .updateTable('payment_attempts')
        .set({ status: 'failed', finished_at: sql`now()` })
        .where('id', '=', attemptId)
        .where('status', '=', 'processing')
        .executeTakeFirst()
      if (closed.numUpdatedRows === 1n) await releaseForOrder(trx, BigInt(orderId))
    })
}

/** Transaction 2: the split, the paid lines, four ledger entries, attempt succeeded, order paid. The order row is
 *  locked before its lines, as in BE-9 startCheckout (R4). The deferred ct_ledger_entries_balance check runs at commit. */
async function recordPayment(
  order: { id: string; practice_id: string; provider_id: string },
  lines: { id: string; held_unit_price_cents: number | null; unit_cost_cents: number }[],
  split: Split,
  feeSharesCents: number[],
  attemptId: string,
): Promise<Date> {
  return useDb()
    .transaction()
    .execute(async (trx) => {
      const locked = await trx.selectFrom('orders').select('status').where('id', '=', order.id).forUpdate().executeTakeFirst()
      if (locked?.status !== 'in_checkout') throw new ProblemError('invalid-transition', { from: locked?.status, event: 'pay' })
      for (const [i, l] of lines.entries()) {
        await trx
          .updateTable('order_lines')
          .set({ paid_unit_price_cents: l.held_unit_price_cents, unit_cost_cents_at_payment: l.unit_cost_cents, fee_share_cents: feeSharesCents[i]! })
          .where('id', '=', l.id)
          .execute()
      }
      const paid = await trx
        .updateTable('orders')
        .set({
          status: 'paid',
          paid_at: sql`now()`,
          amount_paid_cents: split.amountPaidCents,
          item_cost_cents: split.itemCostCents,
          provider_payout_cents: split.providerPayoutCents,
          platform_fee_cents: split.platformFeeCents,
        })
        .where('id', '=', order.id)
        .where('status', '=', 'in_checkout')
        .returning('paid_at')
        .executeTakeFirstOrThrow()
      const entries = [
        ['patient_payment', split.amountPaidCents],
        ['item_cost', split.itemCostCents],
        ['provider_payout', split.providerPayoutCents],
        ['platform_fee', split.platformFeeCents],
      ] as const
      await trx
        .insertInto('ledger_entries')
        .values(
          entries.map(([category, amount_cents]) => ({
            order_id: order.id,
            payment_attempt_id: attemptId,
            practice_id: order.practice_id,
            provider_id: order.provider_id,
            category,
            amount_cents,
            occurred_at: paid.paid_at!,
          })),
        )
        .execute()
      const done = await trx
        .updateTable('payment_attempts')
        .set({ status: 'succeeded', finished_at: paid.paid_at! })
        .where('id', '=', attemptId)
        .where('status', '=', 'processing')
        .executeTakeFirst()
      if (done.numUpdatedRows !== 1n) throw new Error(`payment attempt ${attemptId} is no longer processing`)
      return paid.paid_at!
    })
}
