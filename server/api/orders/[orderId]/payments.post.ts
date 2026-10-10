// EP-23 POST /api/orders/{orderId}/payments (payOrder): the patient pays with the test payment (FR-006, FR-007).
// The Idempotency-Key header is required; a repeat gets the first payment's result without charging again (BE-5,
// FR-008). More than 10 attempts in 15 minutes for one person or address is 429 (SEC-9); a replay is not counted.
import { getRouterParam, setResponseStatus } from 'h3'
import { guard } from '../../../services/idempotency'
import { countPayAttempt, pay } from '../../../services/payments'
import { clientAddress, requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = getRouterParam(event, 'orderId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  return guard(event, viewer.userId, 'POST /api/orders/{orderId}/payments', { orderId: id }, async (key) => {
    await countPayAttempt(viewer.userId, clientAddress(event))
    const receipt = await pay(viewer, BigInt(id), key)
    setResponseStatus(event, 201)
    return receipt
  })
})
