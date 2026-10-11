// EP-30 GET /api/practice/orders (listPracticeOrders): a provider sees a page of their practice's orders sent in a
// UTC month, with patient, total, status and times (FR-045).
import { getQuery } from 'h3'
import { assertRole } from '../../services/access-policy'
import { now } from '../../services/clock'
import { orders, parseOrdersQuery } from '../../services/practice-dashboard'
import { requireViewer } from '../../services/session'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['provider'])
  return orders(viewer, parseOrdersQuery(getQuery(event), now()))
})
