// EP-42 GET /api/orders (listMyOrders): the signed-in patient's own orders, newest sent first (FR-039, AE-067);
// anyone else gets 403, a stranger 401.
import { getQuery } from 'h3'
import { assertRole } from '../../services/access-policy'
import { listOrdersForPatient } from '../../services/orders'
import { requireViewer } from '../../services/session'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['patient'])
  const { cursor, limit } = getQuery(event)
  return listOrdersForPatient(viewer, { cursor, limit })
})
