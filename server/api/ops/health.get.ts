// EP-33 GET /api/ops/health (getPlatformHealth): the month's order funnel, measures and volume per practice, totals
// only (FR-032, FR-048, FR-049, FR-053); anyone outside PLATFORM_HEALTH_ROLES 403 (FR-058).
import { getQuery } from 'h3'
import { assertRole, PLATFORM_HEALTH_ROLES } from '../../services/access-policy'
import { health } from '../../services/platform-health'
import { requireViewer } from '../../services/session'
import { parseMonth } from '../../utils/paging'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, PLATFORM_HEALTH_ROLES)
  return health(viewer, parseMonth(getQuery(event).month, '#/month'))
})
