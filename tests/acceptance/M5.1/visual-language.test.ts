// QA-owned by define-acceptance (specs/M5.1-visual-refresh/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// M5.1 visual refresh (D75, D80, D81): the look changes, behaviour does not. These checks guard what the restyle
// must keep true: readable contrast (NFR-015), nothing loaded from another origin (NFR-016), one theme file
// (lld.md Theme paragraph) and the sky header band on every work screen (screens.md Visual language, VL-2).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { useApp } from '../support/app'
import { call, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })
const THEME = 'app/assets/css/theme.css'

// WCAG 2.2 relative luminance and contrast ratio
function luminance(hex: string): number {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x! + 0.05) / (y! + 0.05)
}
function tokens(): Record<string, string> {
  const css = readFileSync(THEME, 'utf8')
  const out: Record<string, string> = {}
  for (const m of css.matchAll(/(--color-[a-z-]+)\s*:\s*#([0-9a-fA-F]{6})\s*;/g)) {
    expect(out[m[1]!], `${m[1]} is declared once`).toBeUndefined()
    out[m[1]!] = m[2]!.toUpperCase()
  }
  return out
}
function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? vueFiles(p) : p.endsWith('.vue') ? [p] : []
  })
}
async function page(path: string, email: string) {
  const r = await call(path, { cookie: await signIn(email), redirect: 'manual' })
  expect(r.status, `${path} as ${email}`).toBe(200)
  return r
}

describe('M5.1 visual language', () => {
  it('M5.1_AT_001 every colour pair in the theme meets WCAG 2.2 AA: text 4.5:1 on page, card, primary and band; focus ring 3:1 on white (NFR-015)', () => {
    expect(existsSync(THEME), `${THEME} exists (lld.md Theme)`).toBe(true)
    const t = tokens()
    const need: [string, string, number][] = [
      ['--color-ink', '--color-card', 4.5],
      ['--color-ink', '--color-page', 4.5],
      ['--color-ink-muted', '--color-card', 4.5],
      ['--color-ink-muted', '--color-page', 4.5],
      ['--color-on-primary', '--color-primary', 4.5],
      ['--color-danger', '--color-card', 4.5],
      ['--color-on-band', '--color-band-from', 4.5],
      ['--color-on-band', '--color-band-to', 4.5],
      ['--color-focus', '--color-card', 3],
      ['--color-primary', '--color-card', 4.5],
    ]
    const failing = need
      .map(([fg, bg, min]) => ({ pair: `${fg} on ${bg}`, fg: t[fg], bg: t[bg], min }))
      .filter((p) => !p.fg || !p.bg || ratio(p.fg, p.bg) < p.min)
      .map((p) => `${p.pair}: ${p.fg && p.bg ? ratio(p.fg, p.bg).toFixed(2) : 'missing'} < ${p.min}`)
    expect(failing).toEqual([])
    // triangulation: the pale glow is decoration only and would fail as a text background
    expect(ratio(t['--color-on-band']!, t['--color-band-glow']!)).toBeLessThan(3)
  })

  it('M5.1_AT_002 no colour value is written outside the theme file: no hex or rgb() colour in any page or component (lld.md Theme)', () => {
    const offenders = vueFiles('app').flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ f, i: i + 1, line }))
        .filter(({ line }) => /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b(?![-\w])|rgba?\(/.test(line) && !/^\s*(\/\/|<!--|\*)/.test(line))
        .map(({ f, i }) => `${f}:${i}`),
    )
    expect(vueFiles('app').length).toBeGreaterThan(10)
    expect(offenders).toEqual([])
  })

  it('M5.1_AT_003 the prices page loads its styles and fonts only from its own origin, including a self-hosted font file (NFR-016, D81)', async () => {
    const r = await page('/practice/prices', EMAIL.drChen)
    // The CSP header is set only on production builds (nuxt.config.ts $production); the deploy smoke SM-6 and SM-7
    // check it on the running app. Here: every asset the page asks for is same-origin.
    const refs = [...r.text.matchAll(/<(?:link|script)[^>]+(?:href|src)="([^"]+)"/g)].map((m) => m[1]!)
    expect(refs.length).toBeGreaterThan(0)
    expect(refs.filter((u) => /^(https?:)?\/\//.test(u))).toEqual([])
    const sheets = refs.filter((u) => u.endsWith('.css'))
    let css = [...r.text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
    for (const u of sheets) css += '\n' + (await (await fetch(u)).text())
    const urls = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]!)
    expect(urls.filter((u) => /^(https?:)?\/\//.test(u))).toEqual([])
    const fonts = urls.filter((u) => /\.woff2(\?|$)/.test(u))
    expect(fonts.length, 'at least one self-hosted .woff2 font').toBeGreaterThan(0)
    expect((await fetch(fonts[0]!)).status).toBe(200)
  })

  it('M5.1_AT_004 each work screen puts its title in the sky header band: prices and dashboard (Dr. Chen), stock (Omar), Ana order page, and the sign-in page (FR-005, FR-018, FR-028, FR-030, FR-045; screens.md VL-2 header band; lld.md page-band)', async () => {
    const w = app.world()
    const banded = (html: string) => /class="[^"]*\bpage-band\b[^"]*"[^>]*>[\s\S]*?<h1\b/.test(html)
    // live twin: the pages answer 200 with their h1 before the band is required
    for (const [path, email] of [['/practice/prices', EMAIL.drChen], ['/practice/dashboard', EMAIL.drChen], ['/ops/stock', EMAIL.omar]] as const) {
      const r = await page(path, email)
      expect(r.text).toMatch(/<h1\b/)
      expect(banded(r.text), `${path} title inside .page-band`).toBe(true)
    }
    const chen = await signIn(EMAIL.drChen)
    const o = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 1 }] } })
    expect(o.status).toBe(201)
    const ana = await page(`/orders/${o.body.order_id}`, EMAIL.ana)
    expect(banded(ana.text), 'the patient order page title inside .page-band').toBe(true)
    const s = await call('/sign-in')
    expect(s.status).toBe(200)
    expect(banded(s.text), '/sign-in title inside .page-band').toBe(true)
  })

  it('M5.1_AT_005 opening the site root lands each person on their role home, never a missing page: Dr. Chen the practice dashboard, Omar an operations page, a stranger sign-in (flows.md F7 step 2; bug specs/bugs/root-url-404-after-sign-in.md)', async () => {
    const home = async (email: string | null) => {
      const r = await call('/', { cookie: email ? await signIn(email) : undefined, redirect: 'manual' })
      return { status: r.status, location: r.headers.get('location') }
    }
    const stranger = await home(null)
    expect(stranger.status).toBe(303)
    expect(stranger.location).toMatch(/^\/sign-in\?next=/)
    const chen = await home(EMAIL.drChen)
    expect([302, 303, 307]).toContain(chen.status)
    expect(chen.location).toBe('/practice/dashboard')
    expect((await home(EMAIL.omar)).location).toMatch(/^\/ops\//)
  })
})
