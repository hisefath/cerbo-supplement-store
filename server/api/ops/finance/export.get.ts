// EP-35 GET /api/ops/finance/export (exportFinancialReport): the period as CSV, totals then one line per paid order by
// number, no patient identity (FR-051, FR-063). Logged as a privileged action: actor, period and row count only (NFR-014).
import { getQuery, setResponseHeader } from 'h3'
import { assertRole, FINANCE_ROLES } from '../../../services/access-policy'
import { exportCsv } from '../../../services/finance-report'
import { requireViewer } from '../../../services/session'
import { parsePeriod } from '../../../utils/paging'
import { defineApiHandler } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, FINANCE_ROLES)
  const period = parsePeriod(getQuery(event))
  const lines: string[] = []
  for await (const line of exportCsv(viewer, period)) lines.push(line)
  const from = period.from.toISOString().slice(0, 10)
  const to = new Date(period.toExclusive.getTime() - 86_400_000).toISOString().slice(0, 10)
  console.info('privileged_action=finance_export', { actor_id: viewer.userId.toString(), from, to, rows: lines.length - 2 })
  setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'content-disposition', `attachment; filename="financial-report-${from}-to-${to}.csv"`)
  setResponseHeader(event, 'cache-control', 'no-store')
  return lines.join('')
})
