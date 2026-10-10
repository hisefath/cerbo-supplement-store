// EP-20 POST /api/orders/{orderId}/cancel (cancelOrder): a provider of the order's practice cancels a sent or
// payment-failed order (FR-066); a live checkout or a paid order is refused with 409 (FR-067). Anyone else, or an
// unknown id, gets 404 /problems/not-found (FR-009). No idempotency key: a repeat returns the cancelled order.
import { getRouterParam } from 'h3'
import { cancelOrder } from '../../../services/orders'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = getRouterParam(event, 'orderId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  return cancelOrder(viewer, BigInt(id))
})
