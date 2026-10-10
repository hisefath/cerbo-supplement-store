// EP-26 GET /api/ops/orders/{orderId} (getOrderBreakdown): where every cent of one paid order went. The SRE, the data
// analyst and patients get 403 /problems/forbidden with no amounts (FR-050, FR-058, INV-7).
import { getRouterParam } from 'h3'
import { assertRole, ORDER_REVIEWER_ROLES } from '../../../services/access-policy'
import { getBreakdown } from '../../../services/ops-order-queries'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ORDER_REVIEWER_ROLES)
  const id = getRouterParam(event, 'orderId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  return getBreakdown(viewer, BigInt(id))
})
