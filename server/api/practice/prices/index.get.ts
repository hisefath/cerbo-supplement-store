// EP-27 GET /api/practice/prices (listPrices): a provider sees their practice's prices and a page of price history.
import { getQuery } from 'h3'
import { assertRole } from '../../../services/access-policy'
import { listPrices } from '../../../services/pricing'
import { requireViewer } from '../../../services/session'
import { defineApiHandler } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['provider'])
  const cursor = getQuery(event).history_cursor
  return listPrices(viewer, typeof cursor === 'string' && cursor !== '' ? cursor : undefined)
})
