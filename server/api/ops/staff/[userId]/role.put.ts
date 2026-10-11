// EP-37 PUT /api/ops/staff/{userId}/role (changeRole): grant, change or remove an operations role with a reason. No role
// pre-check here (lld.md BE-1): every signed-in caller reaches BE-18, which refuses and logs anyone but the SRE (FR-055).
// The Idempotency-Key header is required, since each change appends to the access log (BE-5, D41).
import { getRouterParam } from 'h3'
import { guard } from '../../../../services/idempotency'
import { requireViewer } from '../../../../services/session'
import { changeRole, RoleChangeRequest } from '../../../../services/staff-access'
import { defineApiHandler, parseBody, ProblemError } from '../../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = getRouterParam(event, 'userId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  const body = await parseBody(event, RoleChangeRequest)
  return guard(event, viewer.userId, 'PUT /api/ops/staff/{userId}/role', { user_id: id, ...body }, () => changeRole(viewer, BigInt(id), body))
})
