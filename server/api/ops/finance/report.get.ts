// EP-34 GET /api/ops/finance/report (getFinancialReport): the finance lead's period report (FR-051, FR-060 to FR-065).
import { getQuery } from 'h3'
import { assertRole, FINANCE_ROLES } from '../../../services/access-policy'
import { report } from '../../../services/finance-report'
import { requireViewer } from '../../../services/session'
import { parsePeriod } from '../../../utils/paging'
import { defineApiHandler } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, FINANCE_ROLES)
  return report(viewer, parsePeriod(getQuery(event)))
})
