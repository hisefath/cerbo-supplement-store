// BE-11 PaymentGateway (lld.md §2, SEAM-3): the one seam a real payment provider will replace. The stub moves no real
// money (FR-007) and answers by PAYMENT_STUB_MODE, read per call: succeed (the default), decline or no_answer.
import { errorFacts } from '../utils/problem'

export interface ChargeRequest {
  orderId: bigint
  amountCents: number
  idempotencyKey: string
}

export type ChargeResult = { outcome: 'succeeded' } | { outcome: 'failed'; reason: 'declined' | 'no_answer' }

const NO_ANSWER: ChargeResult = { outcome: 'failed', reason: 'no_answer' }

/** BE-11 contract: no answer within 10 s, or an exception, counts as `no_answer` (FM-2). */
export async function answerWithin(answer: Promise<ChargeResult>, ms = 10_000): Promise<ChargeResult> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<ChargeResult>((resolve) => {
    timer = setTimeout(() => resolve(NO_ANSWER), ms)
  })
  try {
    return await Promise.race([answer, timeout])
  } catch (e) {
    console.error('payment gateway error, counted as no_answer', errorFacts(e))
    return NO_ANSWER
  } finally {
    clearTimeout(timer)
  }
}

const MODES = ['succeed', 'decline', 'no_answer'] as const

/** A bad PAYMENT_STUB_MODE is a configuration error, not the gateway's answer: it rejects. */
export async function charge(request: ChargeRequest): Promise<ChargeResult> {
  const mode = process.env.PAYMENT_STUB_MODE ?? 'succeed'
  if (!(MODES as readonly string[]).includes(mode)) {
    throw new Error(`PAYMENT_STUB_MODE must be succeed, decline or no_answer, not "${mode}"`)
  }
  return answerWithin(stub(request, mode as (typeof MODES)[number]))
}

// The stub's no_answer mode answers at once so tests stay fast; answerWithin enforces the 10 s for a gateway that hangs.
async function stub(_request: ChargeRequest, mode: (typeof MODES)[number]): Promise<ChargeResult> {
  if (mode === 'succeed') return { outcome: 'succeeded' }
  if (mode === 'decline') return { outcome: 'failed', reason: 'declined' }
  return NO_ANSWER
}
