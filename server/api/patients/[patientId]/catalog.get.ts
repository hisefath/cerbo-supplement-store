// EP-18 GET /api/patients/{patientId}/catalog (getCatalog): products at this practice's prices, with stock.
import { getRouterParam } from 'h3'
import { assertRole } from '../../../services/access-policy'
import { catalogForPatient } from '../../../services/catalog'
import { requireViewer } from '../../../services/session'
import { defineApiHandler, ProblemError } from '../../../utils/problem'

export default defineApiHandler(async (event) => {
  const viewer = await requireViewer(event)
  assertRole(viewer, ['provider'])
  const id = getRouterParam(event, 'patientId') ?? ''
  if (!/^\d{1,18}$/.test(id)) throw new ProblemError('not-found')
  return catalogForPatient(viewer, BigInt(id))
})
