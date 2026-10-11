// EP-31 GET /api/ops/stock (listStock): platform staff see every product's stock and a page of stock history.
import { getQuery } from 'h3'
import { assertRole } from '../../../services/access-policy'
import { requireViewer } from '../../../services/session'
import { listStock } from '../../../services/stock-adjustments'
import { defineApiHandler } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['operations_specialist'])
  const cursor = getQuery(event).history_cursor
  return listStock(viewer, typeof cursor === 'string' && cursor !== '' ? cursor : undefined)
})
