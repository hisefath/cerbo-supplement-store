// EP-32 POST /api/ops/stock/{productId}/adjustments (adjustStock): platform staff record a stock change with a reason.
// Providers are refused (FR-038). The Idempotency-Key header is required, since each change appends history (BE-5, D41).
import { getRouterParam, setResponseStatus } from 'h3'
import { assertRole } from '../../../../services/access-policy'
import { guard } from '../../../../services/idempotency'
import { requireViewer } from '../../../../services/session'
import { adjust, StockAdjustmentRequest } from '../../../../services/stock-adjustments'
import { defineApiHandler, parseBody, ProblemError } from '../../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['operations_specialist'])
  const id = getRouterParam(event, 'productId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  const body = await parseBody(event, StockAdjustmentRequest)
  return guard(event, viewer.userId, 'POST /api/ops/stock/{productId}/adjustments', { product_id: id, ...body }, async () => {
    const movement = await adjust(viewer, BigInt(id), body)
    setResponseStatus(event, 201)
    return movement
  })
})
