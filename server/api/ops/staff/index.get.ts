// EP-36 GET /api/ops/staff (listStaff): the SRE sees the operations people and their roles (FR-054).
import { assertRole, SRE_ROLES } from '../../../services/access-policy'
import { requireViewer } from '../../../services/session'
import { listStaff } from '../../../services/staff-access'
import { defineApiHandler } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, SRE_ROLES)
  return listStaff(viewer)
})
