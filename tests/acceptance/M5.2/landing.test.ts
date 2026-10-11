// QA-owned by define-acceptance (specs/M5.2-safe-landing/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// M5.2 Safe landing (prd.md CQ-5; flows.md F7 steps 2, 2b, 2c, 2d; screens.md S15 and Global conventions): every person
// lands somewhere safe after sign-in, an unknown address links home, and a wrong-role page links home.
import { fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { q } from '../support/db'
import { call, signIn } from '../support/http'
import { EMAIL, PASSWORD, scryptHash } from '../support/people'

useApp({ paymentStubMode: 'succeed' })

const root = async (email: string) => call('/', { cookie: await signIn(email), redirect: 'manual' })
const homeLink = /<a[^>]+href="\/"[^>]*>\s*Go to your home\s*<\/a>/

describe('M5.2 safe landing', () => {
  it('M5.2_AT_001 a role with no work page lands on its home, never a 404: Ana sees "Welcome, Ana Ruiz" and what to do instead (FR-039; S15 Empty; Sam and Dana gain work pages in M6, checked by M6 AT-030)', async () => {
    const cases = [
      [EMAIL.ana, 'Welcome, Ana Ruiz', 'Your orders open from the message your practice sends you.'],
    ] as const
    for (const [email, title, copy] of cases) {
      const r = await root(email)
      expect(r.status, email).toBe(200)
      expect(r.text).toContain(title)
      expect(r.text).toContain(copy)
    }
  })

  it('M5.2_AT_002 a role with a work page goes straight to it, and that page opens: Dr. Chen the dashboard, Omar and Fran paid orders (FR-039; flows.md F7 step 2)', async () => {
    for (const [email, path] of [[EMAIL.drChen, '/practice/dashboard'], [EMAIL.omar, '/ops/orders'], [EMAIL.fran, '/ops/orders']] as const) {
      const cookie = await signIn(email)
      const r = await call('/', { cookie, redirect: 'manual' })
      expect([302, 303, 307], email).toContain(r.status)
      expect(r.headers.get('location')).toBe(path)
      const page = await call(path, { cookie, redirect: 'manual' })
      expect(page.status, `${path} for ${email}`).toBe(200)
      // a refused page also answers 200: the landing page must not be a refusal
      expect(page.text, `${path} for ${email} is not a refusal`).not.toMatch(homeLink)
    }
  })

  it('M5.2_AT_003 an address with no page answers 404 with "We couldn\'t find that page" and a "Go to your home" link; a stranger is sent to sign-in first (screens.md Page not found)', async () => {
    // asked for as a browser does (HTML), not as the API helper does (JSON)
    const res = await fetch('/no-such-page', { headers: { accept: 'text/html', cookie: await signIn(EMAIL.drChen) }, redirect: 'manual' })
    const html = await res.text()
    expect(res.status).toBe(404)
    expect(html).toMatch(/We couldn(&#39;|')t find that page/)
    expect(html).toMatch(homeLink)
    const stranger = await call('/no-such-page', { redirect: 'manual' })
    expect(stranger.status).toBe(303)
    expect(stranger.headers.get('location')).toMatch(/^\/sign-in\?next=/)
  })

  it('M5.2_AT_004 a wrong-role page says the account can\'t open it and links home: Ana on the practice dashboard; Dr. Chen sees her dashboard with no such message (FR-039, FR-058; S8 Permission denied)', async () => {
    const chen = await call('/practice/dashboard', { cookie: await signIn(EMAIL.drChen), redirect: 'manual' })
    expect(chen.status).toBe(200)
    expect(chen.text).not.toMatch(homeLink)
    const ana = await call('/practice/dashboard', { cookie: await signIn(EMAIL.ana), redirect: 'manual' })
    expect(ana.status).toBe(200)
    expect(ana.text).toMatch(/Only providers/)
    expect(ana.text).toMatch(homeLink)
    // an operations person on a page their role does not allow (FR-058): Fran, finance lead, on stock adjustments
    const fran = await call('/ops/stock', { cookie: await signIn(EMAIL.fran), redirect: 'manual' })
    expect(fran.status).toBe(200)
    expect(fran.text).toMatch(homeLink)
    expect(fran.text).not.toContain('Vitamin D3 2000 IU')
  })

  it('M5.2_AT_005 a person whose account has no role lands on their home with "Your account has no role yet", never back at sign-in (FR-039; S15 Empty, M5.2 review R2)', async () => {
    await q("insert into users (email, password_hash, display_name, role, practice_id) values ('nora.none@example.test', $1, 'Nora None', 'none', null)", [scryptHash(PASSWORD)])
    const r = await root('nora.none@example.test')
    expect(r.status).toBe(200)
    expect(r.text).toContain('Welcome, Nora None')
    expect(r.text).toContain('Your account has no role yet. Contact platform support to get access.')
  })
})
