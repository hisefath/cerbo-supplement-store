// QA-owned by define-acceptance (specs/M6-measurement-and-operations/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-10 Operations roles and access (FR-054 to FR-056, FR-058, INV-4, INV-10): EP-36 GET /api/ops/staff, EP-37 PUT
// /api/ops/staff/{userId}/role, S12 /ops/access and the role homes (lld.md "Site root and safe landing", M6 note).
// Seeded staff: Fran Fields finance_lead, Omar Ortega operations_specialist, Sam Reyes sre, Dana Ito data_analyst.
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { APP_URL, q, withClient } from '../support/db'
import { call, expectProblem, newKey } from '../support/http'
import { accessLog, as, copy, get, homeLink, page, roleOf, type Who } from './support'

const app = useApp({ paymentStubMode: 'succeed' })
const T = 120_000

async function changeRole(who: Who, userId: number, body: Record<string, unknown>, key: string | null = newKey()) {
  return call(`/api/ops/staff/${userId}/role`, { method: 'PUT', cookie: await as(who), key, body })
}

async function sqlCode(sql: string, params: unknown[]): Promise<string | undefined> {
  return withClient(APP_URL, async (c) => {
    try {
      await c.query(sql, params)
      return undefined
    } catch (e: any) {
      return e.code as string
    }
  })
}

describe('US-10 operations roles', () => {
  it('M6_AT_018 Sam grants Dana the data analyst role with "new hire" and the access log records Sam, Dana, the roles, the time and the reason; a removal is logged too (AE-051, FR-054, NFR-014)', async () => {
    const w = app.world()
    await q("update users set role = 'none' where id = $1", [w.dana])
    const r = await changeRole('sam', w.dana, { role: 'data_analyst', reason: 'new hire', expected_role: 'none' })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ user_id: w.dana, display_name: 'Dana Ito', role: 'data_analyst', is_you: false })
    expect(Math.abs(Date.parse(r.body.role_since) - Date.now())).toBeLessThan(60_000)
    expect((await roleOf(w.dana)).role).toBe('data_analyst')
    expect(await accessLog()).toEqual([{ actor_id: w.sam, target_user_id: w.dana, from_role: 'none', to_role: 'data_analyst', reason: 'new hire', outcome: 'granted' }])
    const at = (await q('select created_at from access_log'))[0].created_at as Date
    expect(Math.abs(at.getTime() - Date.now())).toBeLessThan(60_000)
    const removal = await changeRole('sam', w.omar, { role: 'none', reason: 'left the team', expected_role: 'operations_specialist' })
    expect(removal.status).toBe(200)
    expect((await roleOf(w.omar)).role).toBe('none')
    expect((await accessLog())[1]).toEqual({ actor_id: w.sam, target_user_id: w.omar, from_role: 'operations_specialist', to_role: 'none', reason: 'left the team', outcome: 'granted' })
  }, T)

  it('M6_AT_019 Fran, the finance lead, cannot grant Omar the SRE role: 403, Omar unchanged, the refused attempt logged (AE-052, FR-055, INV-10)', async () => {
    const w = app.world()
    const twin = await changeRole('sam', w.dana, { role: 'operations_specialist', reason: 'cover shift', expected_role: 'data_analyst' })
    expect(twin.status).toBe(200)
    const r = await changeRole('fran', w.omar, { role: 'sre', reason: 'backup on call', expected_role: 'operations_specialist' })
    expectProblem(r, 403, 'forbidden')
    expect(await roleOf(w.omar)).toEqual({ role: 'operations_specialist', role_changed_at: null })
    const log = await accessLog()
    expect(log).toHaveLength(2)
    expect(log[1]).toEqual({ actor_id: w.fran, target_user_id: w.omar, from_role: 'operations_specialist', to_role: 'sre', reason: 'backup on call', outcome: 'refused' })
  }, T)

  it('M6_AT_020 Sam cannot give himself the finance lead role: 403 self-role-change, his role unchanged, the refused attempt logged (AE-053, FR-056, INV-10)', async () => {
    const w = app.world()
    const twin = await changeRole('sam', w.dana, { role: 'operations_specialist', reason: 'cover shift', expected_role: 'data_analyst' })
    expect(twin.status).toBe(200)
    const r = await changeRole('sam', w.sam, { role: 'finance_lead', reason: 'month end', expected_role: 'sre' })
    expectProblem(r, 403, 'self-role-change')
    expect(await roleOf(w.sam)).toEqual({ role: 'sre', role_changed_at: null })
    const log = await accessLog()
    expect(log).toHaveLength(2)
    expect(log[1]).toEqual({ actor_id: w.sam, target_user_id: w.sam, from_role: 'sre', to_role: 'finance_lead', reason: 'month end', outcome: 'refused' })
  }, T)

  it('M6_AT_021 the SRE sees the operations team (no patients or providers) with "you" on his own row; others get 403 and S12 "Only the SRE can change operations roles." (FR-054, FR-058)', async () => {
    const w = app.world()
    const r = await get('/api/ops/staff', 'sam')
    expect(r.status).toBe(200)
    const names = r.body.data.map((s: any) => s.display_name).sort()
    expect(names).toEqual(['Dana Ito', 'Fran Fields', 'Omar Ortega', 'Sam Reyes'])
    expect(r.body.data.filter((s: any) => s.is_you).map((s: any) => s.user_id)).toEqual([w.sam])
    for (const who of ['fran', 'omar', 'dana'] as const) expectProblem(await get('/api/ops/staff', who), 403, 'forbidden')
    const ok = await page('/ops/access', 'sam')
    expect(ok.status).toBe(200)
    expect(ok.html).toContain('Operations access')
    expect(ok.html).toContain('Dana Ito')
    const fran = await page('/ops/access', 'fran')
    expect(fran.html).toMatch(copy('Only the SRE can change operations roles.'))
    expect(fran.html).toMatch(homeLink)
    expect(fran.html).not.toContain('Omar Ortega')
  }, T)

  it('M6_AT_022 the same role change sent twice with one Idempotency-Key changes and logs once; no key is 400 and changes nothing (FR-054, EP-37)', async () => {
    const w = app.world()
    const key = newKey()
    const body = { role: 'finance_lead', reason: 'second approver', expected_role: 'data_analyst' }
    const a = await changeRole('sam', w.dana, body, key)
    const b = await changeRole('sam', w.dana, body, key)
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(b.body).toEqual(a.body)
    expect(await accessLog()).toHaveLength(1)
    const noKey = await changeRole('sam', w.omar, { role: 'sre', reason: 'backup', expected_role: 'operations_specialist' }, null)
    expectProblem(noKey, 400, 'idempotency-key-missing')
    expect((await roleOf(w.omar)).role).toBe('operations_specialist')
    expect(await accessLog()).toHaveLength(1)
  }, T)

  it('M6_AT_023 a change whose expected role is stale is 409 with the current role, changes nothing and is not logged; with the right expected role it saves (FR-054, EP-37)', async () => {
    const w = app.world()
    const r = await changeRole('sam', w.dana, { role: 'finance_lead', reason: 'second approver', expected_role: 'none' })
    expectProblem(r, 409, 'stale-role')
    expect(r.body.currentRole).toBe('data_analyst')
    expect((await roleOf(w.dana)).role).toBe('data_analyst')
    expect(await accessLog()).toHaveLength(0)
    const ok = await changeRole('sam', w.dana, { role: 'finance_lead', reason: 'second approver', expected_role: 'data_analyst' })
    expect(ok.status).toBe(200)
    expect(await accessLog()).toHaveLength(1)
  }, T)

  it('M6_AT_024 removing the last finance lead needs confirm_no_finance_lead; with a second finance lead it does not (FR-054, EP-37 last-finance-lead)', async () => {
    const w = app.world()
    const alone = await changeRole('sam', w.fran, { role: 'none', reason: 'leave', expected_role: 'finance_lead' })
    expectProblem(alone, 422, 'last-finance-lead')
    expect((await roleOf(w.fran)).role).toBe('finance_lead')
    expect(await accessLog()).toHaveLength(0)
    expect((await changeRole('sam', w.dana, { role: 'finance_lead', reason: 'cover', expected_role: 'data_analyst' })).status).toBe(200)
    expect((await changeRole('sam', w.fran, { role: 'none', reason: 'leave', expected_role: 'finance_lead' })).status).toBe(200)
    const last = await changeRole('sam', w.dana, { role: 'none', reason: 'cover ended', expected_role: 'finance_lead' })
    expectProblem(last, 422, 'last-finance-lead')
    expect((await roleOf(w.dana)).role).toBe('finance_lead')
    const confirmed = await changeRole('sam', w.dana, { role: 'none', reason: 'cover ended', expected_role: 'finance_lead', confirm_no_finance_lead: true })
    expect(confirmed.status).toBe(200)
    expect((await roleOf(w.dana)).role).toBe('none')
    expect((await accessLog()).map((l: any) => l.outcome)).toEqual(['granted', 'granted', 'granted'])
  }, T)

  it('M6_AT_025 a role change aimed at a provider, a patient or an unknown id is 404 and logs nothing (FR-054, BE-18 order of checks)', async () => {
    const w = app.world()
    expect((await changeRole('sam', w.dana, { role: 'operations_specialist', reason: 'cover', expected_role: 'data_analyst' })).status).toBe(200)
    for (const [id, expected] of [[w.drChen, 'provider'], [w.ana, 'patient'], [999999, 'none']] as const) {
      expectProblem(await changeRole('sam', id, { role: 'finance_lead', reason: 'x', expected_role: expected }), 404, 'not-found')
    }
    expect((await roleOf(w.drChen)).role).toBe('provider')
    expect((await roleOf(w.ana)).role).toBe('patient')
    expect(await accessLog()).toHaveLength(1)
  }, T)

  it('M6_AT_026 the reason is 1 to 200 characters and the role one of the five staff roles; invalid bodies are 422 and log nothing (FR-054, RoleChangeRequest)', async () => {
    const w = app.world()
    const base = { role: 'finance_lead', expected_role: 'data_analyst' }
    for (const body of [
      { ...base, reason: '' },
      { ...base, reason: 'x'.repeat(201) },
      { ...base, role: 'provider', reason: 'x' },
      { ...base, reason: 'x', practice_id: w.willowCreek },
    ]) expectProblem(await changeRole('sam', w.dana, body), 422, 'validation')
    expect(await accessLog()).toHaveLength(0)
    expect((await roleOf(w.dana)).role).toBe('data_analyst')
    const ok = await changeRole('sam', w.dana, { ...base, reason: 'y'.repeat(200) })
    expect(ok.status).toBe(200)
    expect((await accessLog())[0].reason).toBe('y'.repeat(200))
  }, T)

  it('M6_AT_027 the app cannot change or delete an access log entry (INV-4, NFR-013)', async () => {
    const w = app.world()
    expect((await changeRole('sam', w.dana, { role: 'finance_lead', reason: 'second approver', expected_role: 'data_analyst' })).status).toBe(200)
    const read = await withClient(APP_URL, async (c) => (await c.query('select count(*)::int as n from access_log')).rows[0].n)
    expect(read).toBe(1)
    expect(await sqlCode("update access_log set reason = 'edited'", [])).toBe('42501')
    expect(await sqlCode('delete from access_log', [])).toBe('42501')
    expect((await accessLog())[0].reason).toBe('second approver')
  }, T)

  it('M6_AT_028 a removed role takes effect on the person\'s next request: Dana\'s live session loses platform health (FR-058, FR-054)', async () => {
    const w = app.world()
    expect((await get('/api/ops/health', 'dana')).status).toBe(200)
    expect((await changeRole('sam', w.dana, { role: 'none', reason: 'contract ended', expected_role: 'data_analyst' })).status).toBe(200)
    expectProblem(await get('/api/ops/health', 'dana'), 403, 'forbidden')
  }, T)

  it('M6_AT_029 two role changes for one person at the same moment: exactly one saves and is logged, the other is 409 stale-role (FR-054, INV-10)', async () => {
    const w = app.world()
    const [a, b] = await Promise.all([
      changeRole('sam', w.dana, { role: 'finance_lead', reason: 'first', expected_role: 'data_analyst' }),
      changeRole('sam', w.dana, { role: 'operations_specialist', reason: 'second', expected_role: 'data_analyst' }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const winner = a.status === 200 ? a : b
    expectProblem(a.status === 409 ? a : b, 409, 'stale-role')
    const log = await accessLog()
    expect(log.filter((l: any) => l.outcome === 'granted')).toHaveLength(1)
    expect((await roleOf(w.dana)).role).toBe(winner.body.role)
  }, T)

  it('M6_AT_030 Sam lands on System health and Dana on Platform health after sign-in, instead of the "Nothing to open yet" home; Fran still lands on Paid orders (FR-039; lld.md ROLE_PAGES M6 note)', async () => {
    for (const [who, path, title] of [['sam', '/ops/system', 'System health'], ['dana', '/ops/health', 'Platform health']] as const) {
      const root = await call('/', { cookie: await as(who) })
      expect([302, 303, 307], who).toContain(root.status)
      expect(root.headers.get('location'), who).toBe(path)
      const p = await page(path, who)
      expect(p.status).toBe(200)
      expect(p.html).toContain(title)
      expect(p.html).not.toMatch(homeLink)
    }
    const fran = await call('/', { cookie: await as('fran') })
    expect(fran.headers.get('location')).toBe('/ops/orders')
  }, T)
})
