// EP-29 GET /api/practice/dashboard (getPracticeDashboard): a provider sees their practice's attention items, sales
// per product and stock for a UTC month (FR-028, FR-029, FR-046, FR-047).
import { getQuery } from 'h3'
import { assertRole } from '../../services/access-policy'
import { now } from '../../services/clock'
import { dashboard, parseMonth } from '../../services/practice-dashboard'
import { requireViewer } from '../../services/session'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['provider'])
  return dashboard(viewer, parseMonth(getQuery(event).month, now()))
})
