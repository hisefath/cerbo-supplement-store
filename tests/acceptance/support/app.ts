// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// Boots the real Nuxt app for one acceptance file, connected to the test database as supplements_app (Q-3).
// External systems are faked only through LLD §9 seams: PAYMENT_STUB_MODE (SEAM-3), SCRYPT_COST (SEAM-6).
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { APP_URL, emptyTables, lockDatabase, rebuildSchema, unlockDatabase } from './db'
import { seedWorld, type World } from './people'

export function useApp(opts: { paymentStubMode?: 'succeed' | 'decline' | 'no_answer' } = {}): { world: () => World } {
  process.env.DATABASE_URL = APP_URL
  process.env.PAYMENT_STUB_MODE = opts.paymentStubMode ?? 'succeed'
  process.env.SCRYPT_COST = '1024'
  let w: World | undefined
  beforeAll(async () => {
    await lockDatabase()
    await rebuildSchema()
  }, 600_000)
  afterAll(async () => {
    await unlockDatabase()
  })
  setup({ rootDir: process.cwd(), server: true, browser: false, setupTimeout: 600_000 })
  beforeEach(async () => {
    await emptyTables()
    w = await seedWorld()
  }, 60_000)
  return {
    world: () => {
      if (!w) throw new Error('world not seeded')
      return w
    },
  }
}
