// BE-4 assertCanChangeRole and BE-18 changeRole, pure parts (lld.md §2, SEQ-10): who may change a role, the EP-37 body,
// and the stale-role and last-finance-lead checks. The locked database path, the refused-row logging and the idempotent
// replay are proved by tests/acceptance/M6/roles.test.ts (AT-018 to AT-029).
import { describe, expect, it } from 'vitest'
import { assertCanChangeRole } from '../../server/services/access-policy'
import type { Role, Viewer } from '../../server/services/session'
import { checkChange, RoleChangeRequest } from '../../server/services/staff-access'
import { ProblemError } from '../../server/utils/problem'

function problem(fn: () => unknown): ProblemError {
  try {
    fn()
  } catch (e) {
    if (e instanceof ProblemError) return e
    throw e
  }
  throw new Error('expected a ProblemError')
}

const viewer = (userId: bigint, role: Role): Viewer => ({
  userId,
  displayName: 'Someone',
  role,
  practiceId: null,
  practiceName: null,
  idleExpiresAt: new Date(0),
})

describe('assertCanChangeRole', () => {
  const omar = { id: 2n, role: 'operations_specialist' as Role, practiceId: null }

  it('lets the SRE change someone else (AE-051)', () => {
    expect(() => assertCanChangeRole(viewer(3n, 'sre'), omar)).not.toThrow()
  })

  it.each(['finance_lead', 'operations_specialist', 'data_analyst', 'none', 'provider', 'patient'] as Role[])(
    'refuses a %s with forbidden (AE-052, FR-055)',
    (role) => {
      expect(problem(() => assertCanChangeRole(viewer(1n, role), omar)).slug).toBe('forbidden')
    },
  )

  it('refuses the SRE on their own account with self-role-change (AE-053, FR-056)', () => {
    expect(problem(() => assertCanChangeRole(viewer(3n, 'sre'), { id: 3n, role: 'sre', practiceId: null })).slug).toBe('self-role-change')
  })

  it('checks forbidden before self-role-change', () => {
    expect(problem(() => assertCanChangeRole(viewer(1n, 'finance_lead'), { id: 1n, role: 'finance_lead', practiceId: null })).slug).toBe('forbidden')
  })
})

describe('checkChange', () => {
  const input = (role: string, expected_role: string, confirm_no_finance_lead = false) => ({ role, expected_role, confirm_no_finance_lead })

  it('passes when the expected role is the current one', () => {
    expect(() => checkChange('none', input('data_analyst', 'none'), 1)).not.toThrow()
  })

  it('refuses a stale expected role with the current role', () => {
    const p = problem(() => checkChange('data_analyst', input('finance_lead', 'none'), 1))
    expect(p.slug).toBe('stale-role')
    expect(p.extensions).toEqual({ currentRole: 'data_analyst' })
  })

  it('refuses removing the last finance lead without the confirmation', () => {
    expect(problem(() => checkChange('finance_lead', input('none', 'finance_lead'), 0)).slug).toBe('last-finance-lead')
  })

  it('allows removing the last finance lead with the confirmation', () => {
    expect(() => checkChange('finance_lead', input('none', 'finance_lead', true), 0)).not.toThrow()
  })

  it('allows removing a finance lead while another remains', () => {
    expect(() => checkChange('finance_lead', input('none', 'finance_lead'), 1)).not.toThrow()
  })

  it('does not apply the finance-lead rule when the finance lead keeps the role', () => {
    expect(() => checkChange('finance_lead', input('finance_lead', 'finance_lead'), 0)).not.toThrow()
  })
})

describe('RoleChangeRequest', () => {
  const ok = { role: 'data_analyst', reason: 'new hire', expected_role: 'none' }

  it('accepts a staff role, a reason up to 200 characters and any expected role', () => {
    expect(RoleChangeRequest.safeParse(ok).success).toBe(true)
    expect(RoleChangeRequest.safeParse({ ...ok, reason: 'y'.repeat(200) }).success).toBe(true)
    expect(RoleChangeRequest.safeParse({ ...ok, expected_role: 'provider' }).success).toBe(true)
    expect(RoleChangeRequest.parse(ok).confirm_no_finance_lead).toBe(false)
  })

  it.each([
    ['an empty reason', { ...ok, reason: '' }],
    ['a reason over 200 characters', { ...ok, reason: 'x'.repeat(201) }],
    ['a non-staff role', { ...ok, role: 'provider' }],
    ['an unknown expected role', { ...ok, expected_role: 'admin' }],
    ['a missing expected role', { role: 'data_analyst', reason: 'new hire' }],
    ['an unknown field', { ...ok, practice_id: 1 }],
  ])('refuses %s', (_name, body) => {
    expect(RoleChangeRequest.safeParse(body).success).toBe(false)
  })
})
