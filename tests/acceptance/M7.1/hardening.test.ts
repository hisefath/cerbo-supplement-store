// QA-owned by define-acceptance (specs/M7.1-hardening/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// M7.1 closes the threat model's cheap gaps: T-5 forged price, T-13 cost leak, T-16 cross-site write (NFR-017, D91),
// and MUT-1 (Pay waits for the order lock).
import { describe, expect, it } from 'vitest'
import { fetch, url } from '@nuxt/test-utils/e2e'
import { useApp } from '../support/app'
import { OWNER_URL, q, withClient } from '../support/db'
import { call, expectProblem, newKey, signIn } from '../support/http'
import { EMAIL } from '../support/people'

const app = useApp({ paymentStubMode: 'succeed' })

async function send(w: ReturnType<typeof app.world>) {
  const chen = await signIn(EMAIL.drChen)
  const r = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 2 }, { product_id: w.magnesium, quantity: 1 }] } })
  if (r.status !== 201) throw new Error(`send returned ${r.status}: ${r.text.slice(0, 200)}`)
  return r.body.order_id as number
}

async function startCheckout(path: string, cookie: string, headers: Record<string, string>) {
  const res = await fetch(path, { method: 'POST', headers: { accept: 'application/json', cookie, ...headers }, redirect: 'manual' })
  const text = await res.text()
  return { status: res.status, type: res.headers.get('content-type') ?? '', text, body: text ? JSON.parse(text) : undefined }
}

describe('M7.1 hardening', () => {
  it('M7.1_AT_001 a made-up unit price in the send request is refused and nothing is saved (AE-068, FR-002, T-5)', async () => {
    const w = app.world()
    const chen = await signIn(EMAIL.drChen)
    const forged = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 1, unit_price_cents: 1 }] } })
    expectProblem(forged, 422, 'validation')
    expect((await q('select count(*)::int as n from orders'))[0].n).toBe(0)
    const honest = await call('/api/orders', { method: 'POST', cookie: chen, key: newKey(), body: { patient_id: w.ana, lines: [{ product_id: w.vitaminD3, quantity: 1 }] } })
    expect(honest.status).toBe(201)
    const line = await q('select sent_unit_price_cents from order_lines where order_id = $1', [honest.body.order_id])
    expect(line[0].sent_unit_price_cents).toBeGreaterThan(1)
  })

  it('M7.1_AT_002 a patient never receives item cost, provider payout or platform fee; a reviewer does (AE-069, FR-039, T-13)', async () => {
    const w = app.world()
    const id = await send(w)
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const receipt = await call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
    expect(receipt.status).toBe(201)
    const view = await call(`/api/orders/${id}`, { cookie: ana })
    expect(view.status).toBe(200)
    expect(view.body.total_cents).toBe(6000)
    for (const text of [receipt.text, view.text]) expect(text).not.toMatch(/cost|payout|fee/i)
    const omar = await signIn(EMAIL.omar)
    const review = await call(`/api/ops/orders/${id}`, { cookie: omar })
    expect(review.status).toBe(200)
    expect(review.text).toMatch(/platform_fee_cents/)
    expect(review.text).toMatch(/provider_payout_cents/)
  })

  it('M7.1_AT_003 a write from another site is refused with nothing changed; the same write from the app works (NFR-017, D91, T-16)', async () => {
    const w = app.world()
    const id = await send(w)
    const ana = await signIn(EMAIL.ana)
    const path = `/api/orders/${id}/checkout`
    const foreign = await startCheckout(path, ana, { origin: 'https://evil.example' })
    expectProblem(foreign as any, 403, 'forbidden')
    const fetchSite = await startCheckout(path, ana, { 'sec-fetch-site': 'cross-site' })
    expectProblem(fetchSite as any, 403, 'forbidden')
    expect((await q('select status from orders where id = $1', [id]))[0].status).toBe('sent')
    const own = await startCheckout(path, ana, { origin: new URL(url('/')).origin, 'sec-fetch-site': 'same-origin' })
    expect(own.status).toBe(200)
    expect((await q('select status from orders where id = $1', [id]))[0].status).toBe('in_checkout')
  })

  it('M7.1_AT_004 Pay waits for the order lock and records nothing until it is free, then pays once (AE-070, FR-008, MUT-1)', async () => {
    const w = app.world()
    const id = await send(w)
    const ana = await signIn(EMAIL.ana)
    expect((await call(`/api/orders/${id}/checkout`, { method: 'POST', cookie: ana })).status).toBe(200)
    const attempts = async () => (await q('select count(*)::int as n from payment_attempts where order_id = $1', [id]))[0].n
    let pay: Promise<Awaited<ReturnType<typeof call>>> | undefined
    await withClient(OWNER_URL, async (c) => {
      await c.query('begin')
      await c.query('select id from orders where id = $1 for update', [id])
      pay = call(`/api/orders/${id}/payments`, { method: 'POST', cookie: ana, key: newKey() })
      await new Promise((r) => setTimeout(r, 1500))
      expect(await attempts()).toBe(0)
      await c.query('commit')
    })
    const r = await pay!
    expect(r.status).toBe(201)
    expect((await q("select count(*)::int as n from payment_attempts where order_id = $1 and status = 'succeeded'", [id]))[0].n).toBe(1)
  })
})
