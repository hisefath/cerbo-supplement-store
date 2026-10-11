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

/** Only the order's own patient may check out and pay (SM-1 guard); anyone else gets not-found (FR-009). */
export function assertIsOrderPatient(viewer: Viewer, order: OrderOwnership): void {
  if (!(viewer.role === 'patient' && viewer.userId === order.patientId)) throw new ProblemError('not-found')
}

/** Platform reviewers: who may open the paid-order list and an order breakdown (EP-5, EP-6, EP-25, EP-26, FR-052). */
export const ORDER_REVIEWER_ROLES: Role[] = ['operations_specialist', 'finance_lead']
/** Platform health: EP-10, EP-33 (FR-053). */
export const PLATFORM_HEALTH_ROLES: Role[] = ['finance_lead', 'operations_specialist', 'data_analyst']
/** The finance lead only: EP-11, EP-13, EP-34, EP-35, EP-38 (FR-051). */
export const FINANCE_ROLES: Role[] = ['finance_lead']
/** Site reliability: EP-12, EP-14, EP-36, EP-39. */
export const SRE_ROLES: Role[] = ['sre']

/** The person whose role BE-18 would change (lld.md BE-4). */
export interface StaffRef {
  id: bigint
  role: Role
  practiceId: bigint | null
}

/** Only the SRE changes roles, and never their own (FR-055, FR-056): forbidden is checked before self-role-change. */
export function assertCanChangeRole(actor: Viewer, target: StaffRef): void {
  if (!SRE_ROLES.includes(actor.role)) throw new ProblemError('forbidden')
  if (actor.userId === target.id) throw new ProblemError('self-role-change')
}
