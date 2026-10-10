// EP-23 POST /api/orders/{orderId}/payments (payOrder): the patient pays with the test payment (FR-006, FR-007).
// The Idempotency-Key header is required; a repeat gets the first payment's result without charging again (BE-5,
// FR-008).
import { getRouterParam, setResponseStatus } from 'h3'
import { guard } from '../../../services/idempotency'
import { pay } from '../../../services/payments'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = getRouterParam(event, 'orderId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  return guard(event, viewer.userId, 'POST /api/orders/{orderId}/payments', { orderId: id }, async (key) => {
    const receipt = await pay(viewer, BigInt(id), key)
    setResponseStatus(event, 201)
    return receipt
  })
})
