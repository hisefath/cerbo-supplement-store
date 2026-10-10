// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// US-8 Sign in as myself (seeded accounts in the Q-1 password format; idle limit 15 minutes, NFR-008).
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL, PASSWORD } from '../support/people'

const app = useApp()

describe('US-8 sign in as myself', () => {
  it('M4_AT_032 Ana signs in, sees her own role and cannot open operations pages (AE-037, FR-039)', async () => {
    const w = app.world()
    const ana = await signIn(EMAIL.ana)
    const me = await call('/api/session', { cookie: ana })
    expect(me.status).toBe(200)
    expect(me.body).toMatchObject({ user_id: w.ana, display_name: 'Ana Ruiz', role: 'patient', practice_id: w.willowCreek })
    const omar = await signIn(EMAIL.omar)
    expect((await call('/api/ops/orders?status=paid', { cookie: omar })).status).toBe(200)
    expectProblem(await call('/api/ops/orders?status=paid', { cookie: ana }), 403, 'forbidden')
  })

  it('M4_AT_035 a wrong password is refused with one message for both cases (FR-039, NFR-007)', async () => {
    app.world()
    const ok = await call('/api/session', { method: 'POST', body: { email: EMAIL.ana, password: PASSWORD } })
    expect(ok.status).toBe(200)
    const wrong = await call('/api/session', { method: 'POST', body: { email: EMAIL.ana, password: 'not the password' } })
    expectProblem(wrong, 401, 'sign-in-failed')
    const unknown = await call('/api/session', { method: 'POST', body: { email: 'nobody@example.test', password: PASSWORD } })
    expectProblem(unknown, 401, 'sign-in-failed')
    expect(unknown.body.title).toBe(wrong.body.title)
    expect(wrong.headers.getSetCookie().some((c) => c.startsWith('session='))).toBe(false)
  })

  it('M4_AT_033 nobody signed in sees nothing of an order; the page sends them to sign in (AE-038, FR-040)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }] } })
    expect(sent.status).toBe(201)
    const id = sent.body.order_id
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}`, { cookie: ana })).status).toBe(200)
    const anon = await call(`/api/orders/${id}`)
    expectProblem(anon, 401, 'unauthenticated')
    expect(anon.text).not.toMatch(/Vitamin|3600/)
    const page = await call(`/orders/${id}`)
    expect(page.status).toBe(303)
    expect(page.headers.get('location') ?? '').toMatch(/^\/sign-in\?next=/)
  })

  it('M4_AT_034 a session idle for 16 minutes is signed out; one idle for 14 minutes is not (AE-039, FR-041, NFR-008)', async () => {
    app.world()
    const fresh = await signIn(EMAIL.drChen)
    await q("update sessions set last_seen_at = now() - interval '14 minutes'")
    const still = await call('/api/session', { cookie: fresh })
    expect(still.status).toBe(200)
    await q("update sessions set last_seen_at = now() - interval '16 minutes'")
    const idle = await call('/api/session', { cookie: fresh })
    expectProblem(idle, 401, 'unauthenticated')
    const ended = await q('select count(*)::int as n from sessions where ended_at is not null')
    expect(ended[0].n).toBe(1)
  })

  it('M4_AT_036 the notice leads to sign-in and then to the order it was about (AE-040, FR-042)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const sent = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }] } })
    expect(sent.status).toBe(201)
    const id = sent.body.order_id
    const token = (await q('select token from notices where order_id = $1', [id]))[0].token
    const notice = await call(`/api/notices/${token}`)
    expect(notice.status).toBe(200)
    expect(notice.body.sign_in_path).toMatch(/^\/sign-in\?next=/)
    expect(decodeURIComponent(notice.body.sign_in_path)).toContain(`/orders/${id}`)
    const page = await call(notice.body.sign_in_path)
    expect(page.status).toBe(200)
    expect(page.type).toContain('text/html')
  })
})
