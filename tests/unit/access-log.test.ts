// BE-18 accessLog, pure parts (lld.md §2, EP-38): the row → AccessLogEntry mapping and the 422s that come before any
// query. The month filter, the (created_at, id) keyset and the role check are proved against the test database by
// tests/acceptance/M6/access-log.test.ts (AT-031 to AT-033).
import { describe, expect, it } from 'vitest'
import type { Viewer } from '../../server/services/session'
import { accessLog, accessLogEntry } from '../../server/services/staff-access'
import { encodeCursor } from '../../server/utils/paging'
import { ProblemError } from '../../server/utils/problem'

const fran: Viewer = { userId: 1n, displayName: 'Fran', role: 'finance_lead', practiceId: null, practiceName: null, idleExpiresAt: new Date(0) }

async function slugOf(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return e instanceof ProblemError ? `${e.slug}` : 'not a problem'
  }
  return 'no error'
}

describe('accessLogEntry', () => {
  it('maps a joined row to openapi AccessLogEntry', () => {
    const at = new Date('2025-10-20T14:12:00Z')
    expect(
      accessLogEntry({ id: '7', created_at: at, key: 'x', actor: 'Sam Reyes', target: 'Dana Ito', from_role: 'none', to_role: 'data_analyst', reason: 'new hire', outcome: 'granted' }),
    ).toEqual({ at: '2025-10-20T14:12:00.000Z', actor_display_name: 'Sam Reyes', target_display_name: 'Dana Ito', from_role: 'none', to_role: 'data_analyst', reason: 'new hire', outcome: 'granted' })
  })
})

describe('accessLog rejects a bad month, cursor or limit with 422 validation before reading', () => {
  it.each([
    ['month 2025-13', () => accessLog(fran, '2025-13')],
    ['a cursor that is not one', () => accessLog(fran, '2025-10', 'not-a-cursor')],
    ['an id-only cursor (another list)', () => accessLog(fran, '2025-10', encodeCursor(null, '5'))],
    ['limit 0', () => accessLog(fran, '2025-10', undefined, 0)],
    ['limit 101', () => accessLog(fran, '2025-10', undefined, 101)],
  ])('%s', async (_name, run) => {
    expect(await slugOf(run())).toBe('validation')
  })
})
