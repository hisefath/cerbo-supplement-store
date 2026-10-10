// BE-5 IdempotencyGuard (lld.md §2, §4 Idempotency, SM-3): what a repeat of a remembered key gets.
import { describe, expect, it, vi } from 'vitest'
import { decide, requestHash, storesResponse } from '../../server/services/idempotency'
import { answerWithin } from '../../server/services/payment-gateway'
import { ProblemError } from '../../server/utils/problem'

const ROUTE = 'POST /api/orders'
const hash = requestHash({ patient_id: 1, lines: [{ product_id: 2, quantity: 1 }] })
const row = (over: Partial<Parameters<typeof decide>[0]> = {}): Parameters<typeof decide>[0] => ({
  route: ROUTE,
  request_hash: hash,
  status: 'completed',
  response_status: 201,
  response_body: { order_id: 1001 },
  abandoned: false,
  ...over,
})

function problemOf(fn: () => unknown): string {
  try {
    fn()
  } catch (e) {
    if (e instanceof ProblemError) return e.slug
    throw e
  }
  return 'no problem'
}

describe('requestHash: SHA-256 of the canonical request', () => {
  it('is 32 bytes, the same for the same request and different for a different one', () => {
    expect(hash.length).toBe(32)
    expect(requestHash({ patient_id: 1, lines: [{ product_id: 2, quantity: 1 }] }).equals(hash)).toBe(true)
    expect(requestHash({ patient_id: 1, lines: [{ product_id: 2, quantity: 2 }] }).equals(hash)).toBe(false)
  })
})

describe('decide: a repeat of a key that already has a row (SM-3)', () => {
  it('completed + same request -> replay the stored response unchanged (FR-008)', () => {
    expect(decide(row(), ROUTE, hash)).toEqual({ replay: { status: 201, body: { order_id: 1001 } } })
  })
  it('same key, different body -> 422 idempotency-mismatch', () => {
    expect(problemOf(() => decide(row(), ROUTE, requestHash({ other: true })))).toBe('idempotency-mismatch')
  })
  it('same key on a different route -> 422 idempotency-mismatch', () => {
    expect(problemOf(() => decide(row(), 'POST /api/orders/{orderId}/payments', hash))).toBe('idempotency-mismatch')
  })
  it('still in flight -> 409 idempotency-in-flight', () => {
    expect(problemOf(() => decide(row({ status: 'in_flight', response_status: null, response_body: null }), ROUTE, hash))).toBe(
      'idempotency-in-flight',
    )
  })
  it('in flight for 60 s or more -> the new request takes it over (FM-6)', () => {
    expect(decide(row({ status: 'in_flight', response_status: null, response_body: null, abandoned: true }), ROUTE, hash)).toEqual({
      takeOver: true,
    })
  })
  it('an abandoned row with a different body is still a mismatch', () => {
    const r = row({ status: 'in_flight', response_status: null, response_body: null, abandoned: true })
    expect(problemOf(() => decide(r, ROUTE, requestHash({ other: true })))).toBe('idempotency-mismatch')
  })
})

describe('storesResponse: guard completes only a success; every problem and 5xx releases the key (BE-5, SEQ-1, SEQ-2)', () => {
  it('2xx is stored and replayed', () => {
    expect(storesResponse(200)).toBe(true)
    expect(storesResponse(201)).toBe(true)
  })
  it('4xx problems, the 502 of a failed payment and other 5xx release the key so the same key can be retried', () => {
    for (const status of [400, 404, 409, 422, 500, 502, 503]) expect(storesResponse(status)).toBe(false)
  })
})

describe('answerWithin: BE-11 counts an exception or no answer within the limit as no_answer (FM-2)', () => {
  it('passes the gateway answer through', async () => {
    await expect(answerWithin(Promise.resolve({ outcome: 'succeeded' }))).resolves.toEqual({ outcome: 'succeeded' })
  })
  it('a gateway exception is no_answer', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(answerWithin(Promise.reject(new Error('boom')))).resolves.toEqual({ outcome: 'failed', reason: 'no_answer' })
    quiet.mockRestore()
  })
  it('a gateway that never answers is no_answer once the limit passes', async () => {
    vi.useFakeTimers()
    try {
      const r = answerWithin(new Promise<never>(() => {}))
      await vi.runAllTimersAsync()
      await expect(r).resolves.toEqual({ outcome: 'failed', reason: 'no_answer' })
    } finally {
      vi.useRealTimers()
    }
  })
})
