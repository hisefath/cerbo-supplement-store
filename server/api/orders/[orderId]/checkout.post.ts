// EP-22 POST /api/orders/{orderId}/checkout (startCheckout): the patient starts checkout; prices held 30 minutes.
import { getRouterParam } from 'h3'
import { startCheckout } from '../../../services/orders'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = getRouterParam(event, 'orderId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  return startCheckout(viewer, BigInt(id))
})
