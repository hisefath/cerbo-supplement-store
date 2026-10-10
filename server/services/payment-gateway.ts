// BE-11 PaymentGateway (lld.md §2, SEAM-3): the one seam a real payment provider will replace. The stub moves no real
// money (FR-007) and answers by PAYMENT_STUB_MODE, read per call: succeed (the default), decline or no_answer.
export interface ChargeRequest {
  orderId: bigint
  amountCents: number
  idempotencyKey: string
}

export type ChargeResult = { outcome: 'succeeded' } | { outcome: 'failed'; reason: 'declined' | 'no_answer' }

// ponytail: no_answer answers at once instead of after the 10 s timeout; a real provider client adds the timeout.
export async function charge(_request: ChargeRequest): Promise<ChargeResult> {
  const mode = process.env.PAYMENT_STUB_MODE ?? 'succeed'
  switch (mode) {
    case 'succeed':
      return { outcome: 'succeeded' }
    case 'decline':
      return { outcome: 'failed', reason: 'declined' }
    case 'no_answer':
      return { outcome: 'failed', reason: 'no_answer' }
    default:
      throw new Error(`PAYMENT_STUB_MODE must be succeed, decline or no_answer, not "${mode}"`)
  }
}
