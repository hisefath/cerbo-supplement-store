// QA-owned by define-acceptance (specs/M6-measurement-and-operations/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-10 Review the access log (FR-057, FR-058, NFR-014): EP-38 GET /api/ops/access-log and S13 /ops/access-log.
// Entries are made through EP-37, then their time is moved into October 2025 (access_log is append-only for the app;
// the test owner role may still write it).
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey } from '../support/http'
import { as, copy, get, homeLink, page } from './support'

const app = useApp({ paymentStubMode: 'succeed' })
const T = 120_000

async function grantAndRefusal(): Promise<void> {
  const w = app.world()
  await q("update users set role = 'none' where id = $1", [w.dana])
  const sam = await as('sam')
  const g = await call(`/api/ops/staff/${w.dana}/role`, { method: 'PUT', cookie: sam, key: newKey(), body: { role: 'data_analyst', reason: 'new hire', expected_role: 'none' } })
  expect(g.status).toBe(200)
  const s = await call(`/api/ops/staff/${w.sam}/role`, { method: 'PUT', cookie: sam, key: newKey(), body: { role: 'finance_lead', reason: 'month end', expected_role: 'sre' } })
  expectProblem(s, 403, 'self-role-change')
  await q("update access_log set created_at = '2025-10-20T14:12:00Z' where outcome = 'granted'")
  await q("update access_log set created_at = '2025-10-21T09:00:00Z' where outcome = 'refused'")
}

describe('US-10 access log', () => {
  it('M6_AT_031 Fran opens October\'s access log and sees Sam\'s grant to Dana and his refused self-change, newest first; September is empty (AE-054, FR-057)', async () => {
    await grantAndRefusal()
    const r = await get('/api/ops/access-log?month=2025-10', 'fran')
    expect(r.status).toBe(200)
    expect(r.body.next_cursor).toBeNull()
    expect(r.body.data).toHaveLength(2)
    expect(r.body.data[0]).toMatchObject({ actor_display_name: 'Sam Reyes', target_display_name: 'Sam Reyes', from_role: 'sre', to_role: 'finance_lead', reason: 'month end', outcome: 'refused' })
    expect(r.body.data[1]).toMatchObject({ actor_display_name: 'Sam Reyes', target_display_name: 'Dana Ito', from_role: 'none', to_role: 'data_analyst', reason: 'new hire', outcome: 'granted' })
    expect(Date.parse(r.body.data[1].at)).toBe(Date.parse('2025-10-20T14:12:00Z'))
    const sept = await get('/api/ops/access-log?month=2025-09', 'fran')
    expect(sept.body).toMatchObject({ data: [], next_cursor: null })
    const s13 = await page('/ops/access-log?month=2025-10', 'fran')
    expect(s13.status).toBe(200)
    for (const t of ['Access log', 'Dana Ito', 'new hire', 'Refused']) expect(s13.html).toContain(t)
    const empty = await page('/ops/access-log?month=2025-09', 'fran')
    expect(empty.html).toMatch(copy('No roles changed in September 2025.'))
  }, T)

  it('M6_AT_032 only the finance lead reviews the access log: Sam (the actor), Omar and Dana get 403, and S13 tells Sam "Only the finance lead reviews the access log." (FR-057, FR-058, NFR-014, INV-10)', async () => {
    await grantAndRefusal()
    expect((await get('/api/ops/access-log?month=2025-10', 'fran')).status).toBe(200)
    for (const who of ['sam', 'omar', 'dana'] as const) {
      const r = await get('/api/ops/access-log?month=2025-10', who)
      expectProblem(r, 403, 'forbidden')
      expect(r.text).not.toContain('new hire')
    }
    const s13 = await page('/ops/access-log?month=2025-10', 'sam')
    expect(s13.html).toMatch(copy('Only the finance lead reviews the access log.'))
    expect(s13.html).toMatch(homeLink)
    expect(s13.html).not.toContain('new hire')
  }, T)

  it('M6_AT_033 26 entries in a month come as 25 then 1, newest first, with no repeats; a bad cursor, limit or month is 422 (FR-057, BE-22)', async () => {
    const w = app.world()
    for (let i = 0; i < 26; i++) {
      await q(
        "insert into access_log (actor_id, target_user_id, from_role, to_role, reason, outcome, created_at) values ($1, $2, 'data_analyst', 'data_analyst', $3, 'granted', $4)",
        [w.sam, w.dana, `entry ${i}`, new Date(Date.UTC(2025, 9, 1, i))],
      )
    }
    const p1 = await get('/api/ops/access-log?month=2025-10', 'fran')
    expect(p1.status).toBe(200)
    expect(p1.body.data).toHaveLength(25)
    expect(p1.body.data[0].reason).toBe('entry 25')
    expect(typeof p1.body.next_cursor).toBe('string')
    const p2 = await get(`/api/ops/access-log?month=2025-10&cursor=${encodeURIComponent(p1.body.next_cursor)}`, 'fran')
    expect(p2.body.data.map((e: any) => e.reason)).toEqual(['entry 0'])
    expect(p2.body.next_cursor).toBeNull()
    for (const bad of ['cursor=not-a-cursor', 'limit=101', 'limit=0', 'month=2025-13']) {
      const r = await get(`/api/ops/access-log?month=2025-10&${bad}`.replace('month=2025-10&month=2025-13', 'month=2025-13'), 'fran')
      expectProblem(r, 422, 'validation')
    }
  }, T)
})
