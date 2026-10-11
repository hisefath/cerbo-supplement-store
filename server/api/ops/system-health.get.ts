// EP-39 GET /api/ops/system-health (getSystemHealth): the SRE's availability, error rate and slow page share for a
// month (FR-059, D87); anyone else 403 (FR-058).
import { getQuery } from 'h3'
import { assertRole, SRE_ROLES } from '../../services/access-policy'
import { systemHealth } from '../../services/request-metrics'
import { requireViewer } from '../../services/session'
import { parseMonth } from '../../utils/paging'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, SRE_ROLES)
  return systemHealth(viewer, parseMonth(getQuery(event).month, '#/month'))
})
