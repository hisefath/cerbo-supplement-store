// EP-38 GET /api/ops/access-log (listAccessLog): the finance lead reviews role grants, removals and refused attempts a
// month at a time (FR-057, SEQ-11); anyone else gets 403 and none of it (FR-058, INV-10).
import { getQuery } from 'h3'
import { assertRole, FINANCE_ROLES } from '../../services/access-policy'
import { requireViewer } from '../../services/session'
import { accessLog } from '../../services/staff-access'
import { parseLimit, parseMonth } from '../../utils/paging'
import { defineApiHandler, ProblemError } from '../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, FINANCE_ROLES)
  const query = getQuery(event)
  const cursor = query.cursor
  if (cursor !== undefined && typeof cursor !== 'string') {
    throw new ProblemError('validation', { errors: [{ pointer: '#/cursor', detail: 'Not a cursor from this list.' }] })
  }
  return accessLog(viewer, parseMonth(query.month, '#/month'), cursor, parseLimit(query.limit, '#/limit'))
})
