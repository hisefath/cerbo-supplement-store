// M4-T903 demo data loader (runbook FS-8): resets the fictional world of the PRD examples in one transaction.
// Run: DEMO_RESET=yes DEMO_PASSWORD=... DATABASE_URL=<owner role> node db/seed/demo.ts
// Every user gets DEMO_PASSWORD, hashed as scrypt$N$r$p$salt$hash (acceptance Q-1, as BE-3 verifies it) with
// N = SCRYPT_COST or 16384. The password is never printed. Practice prices are not seeded: with no practice_prices
// row the catalog shows the default price (FR-017).
import { randomBytes, scrypt } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import pg from 'pg'

type Role = 'patient' | 'provider' | 'finance_lead' | 'operations_specialist' | 'sre' | 'data_analyst'

const WILLOW = 'Willow Creek Wellness'
const MAPLE = 'Maple Grove Clinic'

export const WORLD = {
  practices: [WILLOW, MAPLE],
  users: [
    { display_name: 'Dr. Maya Chen', email: 'maya.chen@example.test', role: 'provider', practice: WILLOW },
    { display_name: 'Dr. Sam Lee', email: 'sam.lee@example.test', role: 'provider', practice: MAPLE },
    { display_name: 'Ana Ruiz', email: 'ana.ruiz@example.test', role: 'patient', practice: WILLOW },
    { display_name: 'Ben Ortiz', email: 'ben.ortiz@example.test', role: 'patient', practice: WILLOW },
    { display_name: 'Carla Diaz', email: 'carla.diaz@example.test', role: 'patient', practice: MAPLE },
    { display_name: 'Omar Ortega', email: 'omar.ortega@example.test', role: 'operations_specialist', practice: null },
    { display_name: 'Sam Reyes', email: 'sam.reyes@example.test', role: 'sre', practice: null },
    { display_name: 'Dana Ito', email: 'dana.ito@example.test', role: 'data_analyst', practice: null },
    { display_name: 'Fran Fields', email: 'fran.fields@example.test', role: 'finance_lead', practice: null },
  ] as { display_name: string; email: string; role: Role; practice: string | null }[],
  products: [
    { sku: 'VITD3-2000', name: 'Vitamin D3 2000 IU', unit_cost_cents: 900, units_in_stock: 10 },
    { sku: 'MAG-GLY', name: 'Magnesium Glycinate', unit_cost_cents: 1200, units_in_stock: 5 },
    { sku: 'OMEGA3-FO', name: 'Omega-3 Fish Oil', unit_cost_cents: 1500, units_in_stock: 3 },
  ],
}

// Every M4 table (db/migrations). TRUNCATE skips the row triggers that freeze paid orders and succeeded attempts.
const M4_TABLES = [
  'ledger_entries', 'payment_attempts', 'idempotency_keys', 'notices', 'order_lines', 'orders', 'practice_prices',
  'sessions', 'sign_in_attempts', 'pay_rate_attempts', 'products', 'users', 'practices',
]

/** scrypt$N$8$1$<salt b64>$<hash b64>, the format BE-3 verifyPassword reads (Q-1, SEAM-6). */
export function hashPassword(password: string, N: number): Promise<string> {
  const salt = randomBytes(16)
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N, r: 8, p: 1, maxmem: 256 * N * 8 }, (err, key) =>
      err ? reject(err) : resolve(`scrypt$${N}$8$1$${salt.toString('base64')}$${key.toString('base64')}`),
    ),
  )
}

interface Db {
  connect(): Promise<unknown>
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>
  end(): Promise<void>
}

type Env = Record<string, string | undefined>

export async function seedDemo(env: Env, connect: (url: string) => Db = (url) => new pg.Client({ connectionString: url })) {
  if (env.DEMO_RESET !== 'yes') throw new Error('refusing to run: this empties every M4 table; set DEMO_RESET=yes')
  if (!env.DEMO_PASSWORD) throw new Error('refusing to run: set DEMO_PASSWORD in the environment')
  if (!env.DATABASE_URL) throw new Error('refusing to run: set DATABASE_URL (the owner role)')
  const N = Number(env.SCRYPT_COST) || 16384
  const hashes = await Promise.all(WORLD.users.map(() => hashPassword(env.DEMO_PASSWORD!, N)))

  const db = connect(env.DATABASE_URL)
  await db.connect()
  try {
    await db.query('begin')
    await db.query(`truncate ${M4_TABLES.join(', ')} restart identity`)
    const practiceIds = new Map<string, string>()
    for (const name of WORLD.practices) {
      const { rows } = await db.query('insert into practices (name) values ($1) returning id', [name])
      practiceIds.set(name, rows[0].id)
    }
    for (const [i, u] of WORLD.users.entries())
      await db.query(
        'insert into users (email, password_hash, display_name, role, practice_id) values ($1, $2, $3, $4, $5)',
        [u.email, hashes[i], u.display_name, u.role, u.practice && practiceIds.get(u.practice)],
      )
    for (const p of WORLD.products)
      await db.query('insert into products (sku, name, unit_cost_cents, units_in_stock) values ($1, $2, $3, $4)', [
        p.sku, p.name, p.unit_cost_cents, p.units_in_stock,
      ])
    await db.query('commit')
  } catch (e) {
    await db.query('rollback').catch(() => {})
    throw e
  } finally {
    await db.end()
  }
  return { practices: WORLD.practices.length, users: WORLD.users.length, products: WORLD.products.length }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemo(process.env).then(
    (n) => console.log(`demo reset: ${n.practices} practices, ${n.users} users, ${n.products} products`),
    (e: Error) => {
      console.error(`demo seed failed: ${e.message}`)
      process.exitCode = 1
    },
  )
}
