// EP-25 GET /api/ops/orders (listOpsOrders): paid orders or the review list by order number, for platform reviewers
// only (operations_specialist, finance_lead); no patient name or contact detail (FR-050, NFR-012).
import { getQuery } from 'h3'
import { assertRole, ORDER_REVIEWER_ROLES } from '../../../services/access-policy'
import { listOrders, parseOpsOrderFilter } from '../../../services/ops-order-queries'
import { requireViewer } from '../../../services/session'
import { defineApiHandler } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ORDER_REVIEWER_ROLES)
  return listOrders(viewer, parseOpsOrderFilter(getQuery(event)))
})
