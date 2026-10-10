// EP-19 POST /api/orders (sendOrder): sends an order to a patient. The Idempotency-Key header is required; a repeat
// gets the first response (BE-5, D41).
import { setResponseStatus } from 'h3'
import { z } from 'zod'
import { assertRole } from '../../services/access-policy'
import { guard } from '../../services/idempotency'
import { sendOrder } from '../../services/orders'
import { requireViewer } from '../../services/session'
import { defineApiHandler, parseBody } from '../../utils/problem'

const SendOrderRequest = z.strictObject({
  patient_id: z.int().positive(),
  lines: z.array(z.strictObject({ product_id: z.int().positive(), quantity: z.int().min(1) })).min(1),
})

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['provider'])
  const body = await parseBody(event, SendOrderRequest)
  return guard(event, viewer.userId, 'POST /api/orders', body, async () => {
    const order = await sendOrder(viewer, {
      patientId: BigInt(body.patient_id),
      lines: body.lines.map((l) => ({ productId: BigInt(l.product_id), quantity: l.quantity })),
    })
    setResponseStatus(event, 201)
    return order
  })
})
