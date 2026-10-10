// M4-T902 GET /version: the build identity from build-info.json at the application root (process.cwd()).
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SHA = 'ab1fc5e7b9d1ca21f3c759aeb521ade1283fccff'
let root: string

async function get() {
  vi.resetModules() // the route keeps the file once read; each test starts a fresh server
  const handler = (await import('../../server/routes/version.get')).default
  const app = createApp().use(createRouter().get('/version', handler))
  return toWebHandler(app)(new Request('http://localhost/version'))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'version-'))
  vi.spyOn(process, 'cwd').mockReturnValue(root)
})
afterEach(() => vi.restoreAllMocks())

describe('GET /version', () => {
  it('answers 200 with only commit and built_at, no-store', async () => {
    writeFileSync(join(root, 'build-info.json'), JSON.stringify({ commit: SHA, built_at: '2026-10-10T21:00:00Z', extra: 'x' }))
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
    expect(await res.json()).toEqual({ commit: SHA, built_at: '2026-10-10T21:00:00Z' })
  })

  it('answers 503 "unknown build" when build-info.json is missing', async () => {
    const res = await get()
    expect(res.status).toBe(503)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('unknown build')
  })

  it('answers 503 when the file is not a valid build identity', async () => {
    writeFileSync(join(root, 'build-info.json'), JSON.stringify({ commit: 'HEAD', built_at: 'yesterday' }))
    const res = await get()
    expect(res.status).toBe(503)
    expect(await res.text()).toBe('unknown build')
  })

  it('finds the file written after a first miss (no cached miss)', async () => {
    vi.resetModules()
    const handler = (await import('../../server/routes/version.get')).default
    const fetch = toWebHandler(createApp().use(createRouter().get('/version', handler)))
    expect((await fetch(new Request('http://localhost/version'))).status).toBe(503)
    writeFileSync(join(root, 'build-info.json'), JSON.stringify({ commit: SHA, built_at: '2026-10-10T21:00:00Z' }))
    expect((await fetch(new Request('http://localhost/version'))).status).toBe(200)
  })
})
