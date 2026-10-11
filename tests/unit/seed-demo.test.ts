// M4-T903 demo data loader (runbook FS-8): its guards and its password hash format (acceptance Q-1).
import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hashPassword, RESET_TABLES, seedDemo, WORLD } from '../../db/seed/demo'
import { verifyPassword } from '../../server/services/session'

// Synthetic test value, built at run time so no literal password sits in the code.
const PW = ['unit', 'test', 'only'].join('-')

describe('seedDemo guards', () => {
  afterEach(() => vi.restoreAllMocks())

  it('refuses without DEMO_RESET=yes and never connects', async () => {
    const connect = vi.fn()
    for (const DEMO_RESET of [undefined, '', 'no', 'YES', 'true'])
      await expect(
        seedDemo({ DEMO_RESET, DEMO_PASSWORD: PW, DATABASE_URL: 'postgres://x@127.0.0.1/x' }, connect),
      ).rejects.toThrow(/DEMO_RESET=yes/)
    expect(connect).not.toHaveBeenCalled()
  })

  it('refuses without DEMO_PASSWORD and never connects', async () => {
    const connect = vi.fn()
    for (const DEMO_PASSWORD of [undefined, ''])
      await expect(
        seedDemo({ DEMO_RESET: 'yes', DEMO_PASSWORD, DATABASE_URL: 'postgres://x@127.0.0.1/x' }, connect),
      ).rejects.toThrow(/DEMO_PASSWORD/)
    expect(connect).not.toHaveBeenCalled()
  })

  it('refuses without DATABASE_URL and never connects', async () => {
    const connect = vi.fn()
    await expect(seedDemo({ DEMO_RESET: 'yes', DEMO_PASSWORD: PW }, connect)).rejects.toThrow(/DATABASE_URL/)
    expect(connect).not.toHaveBeenCalled()
  })

  it('never puts the password in an error message', async () => {
    const err = await seedDemo({ DEMO_PASSWORD: PW }, vi.fn()).catch((e: Error) => e)
    expect(String((err as Error).message)).not.toContain(PW)
  })
})

describe('hashPassword', () => {
  it('stores scrypt$N$r$p$salt$hash that sign-in verifies, with N from the argument', async () => {
    const stored = await hashPassword(PW, 1024)
    expect(stored).toMatch(/^scrypt\$1024\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/)
    expect(stored).not.toContain(PW)
    expect(await verifyPassword(PW, stored)).toBe(true)
    expect(await verifyPassword(PW + 'x', stored)).toBe(false)
  })

  it('salts each hash', async () => {
    expect(await hashPassword(PW, 1024)).not.toBe(await hashPassword(PW, 1024))
  })
})

describe('the demo world', () => {
  it('holds the PRD examples with @example.test emails', () => {
    expect(WORLD.practices).toEqual(['Willow Creek Wellness', 'Maple Grove Clinic'])
    expect(WORLD.products.map((p) => [p.name, p.unit_cost_cents, p.units_in_stock])).toEqual([
      ['Vitamin D3 2000 IU', 900, 10],
      ['Magnesium Glycinate', 1200, 5],
      ['Omega-3 Fish Oil', 1500, 3],
    ])
    const people = Object.fromEntries(WORLD.users.map((u) => [u.display_name, u.role]))
    expect(people).toEqual({
      'Dr. Maya Chen': 'provider',
      'Dr. Sam Lee': 'provider',
      'Ana Ruiz': 'patient',
      'Ben Ortiz': 'patient',
      'Carla Diaz': 'patient',
      'Omar Ortega': 'operations_specialist',
      'Sam Reyes': 'sre',
      'Dana Ito': 'data_analyst',
      'Fran Fields': 'finance_lead',
    })
    for (const u of WORLD.users) {
      expect(u.email).toMatch(/^[a-z.]+@example\.test$/)
      // users.ck_users_practice_matches_role: only patients and providers belong to a practice
      expect(u.practice !== null).toBe(u.role === 'patient' || u.role === 'provider')
    }
  })
})

// Bug (specs/bugs/demo-reset-misses-m5-tables.md): the demo reset truncates a fixed table list; a table
// left out that references a truncated one makes Postgres refuse the whole TRUNCATE.
describe('demo reset table list', () => {
  it('names every table the migrations create', () => {
    const created = readdirSync('db/migrations')
      .filter((f) => f.endsWith('.sql'))
      .flatMap((f) => [...readFileSync(`db/migrations/${f}`, 'utf8').split('-- Down Migration')[0]!.matchAll(/create table (\w+)/gi)].map((m) => m[1]!))
    expect(created.length).toBeGreaterThan(10)
    expect(created.filter((t) => !RESET_TABLES.includes(t)).sort()).toEqual([])
  })
})
