// EP-23 POST /api/orders/{orderId}/payments (payOrder): the patient pays with the test payment (FR-006, FR-007).
// The Idempotency-Key header is required; storing and replaying it (BE-5) arrives with M4-T003.
import { getRequestHeader, getRouterParam, setResponseStatus } from 'h3'
import { pay } from '../../../services/payments'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = getRouterParam(event, 'orderId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  const key = getRequestHeader(event, 'idempotency-key')
  if (!key) throw new ProblemError('idempotency-key-missing')
  if (key.length > 255) {
    throw new ProblemError('validation', { errors: [{ pointer: '#/headers/Idempotency-Key', detail: 'At most 255 characters.' }] })
  }
  const receipt = await pay(viewer, BigInt(id), key)
  setResponseStatus(event, 201)
  return receipt
})
