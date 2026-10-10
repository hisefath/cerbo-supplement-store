// EP-21 GET /api/orders/{orderId} (getOrder): the order's patient or a provider of its practice sees the order;
// anyone else gets 404 /problems/not-found, never 403 (FR-009). No PATCH or PUT exists on an order (FR-068).
import { getRouterParam } from 'h3'
import { getOrderForViewer } from '../../../services/orders'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = getRouterParam(event, 'orderId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  return getOrderForViewer(viewer, BigInt(id))
})
