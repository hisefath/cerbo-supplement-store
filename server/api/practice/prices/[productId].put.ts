// EP-28 PUT /api/practice/prices/{productId} (changePrice): a provider changes their own practice's price for one
// product, with a reason. The Idempotency-Key header is required, since each change appends history (BE-5, D41).
import { getRouterParam } from 'h3'
import { assertRole } from '../../../services/access-policy'
import { guard } from '../../../services/idempotency'
import { changePrice, PriceChangeRequest } from '../../../services/pricing'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, parseBody, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['provider'])
  const id = getRouterParam(event, 'productId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  const body = await parseBody(event, PriceChangeRequest)
  return guard(event, viewer.userId, 'PUT /api/practice/prices/{productId}', { product_id: id, ...body }, () =>
    changePrice(viewer, BigInt(id), body),
  )
})
