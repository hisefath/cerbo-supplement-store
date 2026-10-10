// BE-4 AccessPolicy (lld.md §2): one place that answers who may see or do what. Deny by default; pure.
import { ProblemError } from '../utils/problem'
import type { Role, Viewer } from './session'

export interface PatientRef {
  id: bigint
  role: string
  practiceId: bigint | null
}

export interface OrderOwnership {
  patientId: bigint
  practiceId: bigint
}

export function assertRole(viewer: Viewer | null, allowed: Role[]): asserts viewer is Viewer {
  if (!viewer) throw new ProblemError('unauthenticated')
  if (!allowed.includes(viewer.role)) throw new ProblemError('forbidden')
}

/** The order's patient, or a provider of its practice. Unknown and forbidden look the same (FR-009). */
export function assertCanViewOrder(viewer: Viewer, order: OrderOwnership): void {
  const ok =
    (viewer.role === 'patient' && viewer.userId === order.patientId) ||
    (viewer.role === 'provider' && viewer.practiceId === order.practiceId)
  if (!ok) throw new ProblemError('not-found')
}

/** A provider acting on a patient of their own practice (FR-009, LINV-3). */
export function assertCanActOnPatient(viewer: Viewer, patient: PatientRef | undefined): asserts patient is PatientRef {
  const ok =
    patient !== undefined &&
    viewer.role === 'provider' &&
    patient.role === 'patient' &&
    viewer.practiceId !== null &&
    patient.practiceId === viewer.practiceId
  if (!ok) throw new ProblemError('not-found')
}
