// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// Synthetic people, practices and products from the PRD's acceptance examples. All fictional, @example.test only.
// Passwords are stored in the format the human approved in Q-1:
//   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>   (Node's built-in scrypt, 64-byte hash)
// Tests use a low cost (N=1024) for speed; the stored value carries its own cost (LLD SEAM-6).
import { randomBytes, scryptSync } from 'node:crypto'
import { q } from './db'

export const PASSWORD = 'correct horse battery staple'

export function scryptHash(password: string, N = 1024, r = 8, p = 1): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64, { N, r, p })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export interface World {
  willowCreek: number
  mapleGrove: number
  drChen: number
  drLee: number
  ana: number
  ben: number
  carla: number
  omar: number
  sam: number
  dana: number
  fran: number
  vitaminD3: number
  magnesium: number
  omega3: number
}

export const EMAIL = {
  drChen: 'maya.chen@example.test',
  drLee: 'sam.lee@example.test',
  ana: 'ana.ruiz@example.test',
  ben: 'ben.ortiz@example.test',
  carla: 'carla.diaz@example.test',
  omar: 'omar.ortega@example.test',
  sam: 'sam.reyes@example.test',
  dana: 'dana.ito@example.test',
  fran: 'fran.fields@example.test',
} as const

async function insertUser(email: string, name: string, role: string, practiceId: number | null): Promise<number> {
  const rows = await q<{ id: string }>(
    'insert into users (email, password_hash, display_name, role, practice_id) values ($1, $2, $3, $4, $5) returning id',
    [email, scryptHash(PASSWORD), name, role, practiceId],
  )
  return Number(rows[0].id)
}

// Products and costs from the PRD's acceptance examples (AE-001 to AE-015).
export async function seedWorld(): Promise<World> {
  const practice = async (name: string) =>
    Number((await q<{ id: string }>('insert into practices (name) values ($1) returning id', [name]))[0].id)
  const willowCreek = await practice('Willow Creek Wellness')
  const mapleGrove = await practice('Maple Grove Clinic')
  const product = async (sku: string, name: string, cost: number, stock: number) =>
    Number(
      (
        await q<{ id: string }>(
          'insert into products (sku, name, unit_cost_cents, units_in_stock) values ($1, $2, $3, $4) returning id',
          [sku, name, cost, stock],
        )
      )[0].id,
    )
  return {
    willowCreek,
    mapleGrove,
    drChen: await insertUser(EMAIL.drChen, 'Dr. Maya Chen', 'provider', willowCreek),
    drLee: await insertUser(EMAIL.drLee, 'Dr. Sam Lee', 'provider', mapleGrove),
    ana: await insertUser(EMAIL.ana, 'Ana Ruiz', 'patient', willowCreek),
    ben: await insertUser(EMAIL.ben, 'Ben Ortiz', 'patient', willowCreek),
    carla: await insertUser(EMAIL.carla, 'Carla Diaz', 'patient', mapleGrove),
    omar: await insertUser(EMAIL.omar, 'Omar Ortega', 'operations_specialist', null),
    sam: await insertUser(EMAIL.sam, 'Sam Reyes', 'sre', null),
    dana: await insertUser(EMAIL.dana, 'Dana Ito', 'data_analyst', null),
    fran: await insertUser(EMAIL.fran, 'Fran Fields', 'finance_lead', null),
    vitaminD3: await product('VD3-2000', 'Vitamin D3 2000 IU', 900, 10),
    magnesium: await product('MAG-GLY', 'Magnesium Glycinate', 1200, 5),
    omega3: await product('OMEGA3-FO', 'Omega-3 Fish Oil', 1500, 3),
  }
}

export async function setPracticePrice(w: World, productId: number, priceCents: number): Promise<void> {
  await q(
    `insert into practice_prices (practice_id, product_id, price_cents, set_by) values ($1, $2, $3, $4)
     on conflict (practice_id, product_id) do update set price_cents = excluded.price_cents`,
    [w.willowCreek, productId, priceCents, w.drChen],
  )
}
