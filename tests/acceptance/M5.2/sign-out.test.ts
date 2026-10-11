// QA-owned by define-acceptance (specs/M5.2-safe-landing/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// Sign out (screens.md Global conventions "Sign out"; FR-041; lld.md EP-16): every signed-in frame offers it, it ends the
// session, and the sign-in page confirms it. Asked for by the human: "theres no logout button, please make one".
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { call, expectProblem, signIn } from '../support/http'
import { EMAIL } from '../support/people'

useApp({ paymentStubMode: 'succeed' })
const signOutButton = /<button[^>]*>\s*Sign out\s*<\/button>/

describe('sign out', () => {
  it('M5.2_AT_006 Dr. Chen\'s frame has a Sign out button; signing out ends her session and the sign-in page says "You signed out."; a stranger sees no Sign out (FR-041, EP-16)', async () => {
    const chen = await signIn(EMAIL.drChen)
    const page = await call('/practice/dashboard', { cookie: chen, redirect: 'manual' })
    expect(page.status).toBe(200)
    expect(page.text).toMatch(signOutButton)
    const stranger = await call('/sign-in', { redirect: 'manual' })
    expect(stranger.status).toBe(200)
    expect(stranger.text).not.toMatch(signOutButton)
    expect((await call('/api/session', { method: 'DELETE', cookie: chen })).status).toBe(204)
    expectProblem(await call('/api/session', { cookie: chen }), 401, 'unauthenticated')
    const after = await call('/sign-in?signed_out=1', { redirect: 'manual' })
    expect(after.status).toBe(200)
    expect(after.text).toContain('You signed out.')
  })
})
