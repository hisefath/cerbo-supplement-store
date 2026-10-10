// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// Test database helpers. They only ever touch the throwaway `supplements_test` database (docker-compose.yml).
// Roles and the migrations folder follow the human's answers Q-3 and Q-4 in acceptance.md.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const HOST = process.env.TEST_DB_HOST ?? '127.0.0.1'
const PORT = Number(process.env.TEST_DB_PORT ?? 54329)
const DB = 'supplements_test'
const ROLE_PASSWORD = 'local-test-only'

if (!DB.includes('test')) throw new Error('refusing to touch a database whose name does not contain "test"')

export const ADMIN_URL = `postgres://supplements_test:${ROLE_PASSWORD}@${HOST}:${PORT}/${DB}`
export const OWNER_URL = `postgres://supplements_owner:${ROLE_PASSWORD}@${HOST}:${PORT}/${DB}`
export const APP_URL = `postgres://supplements_app:${ROLE_PASSWORD}@${HOST}:${PORT}/${DB}`

const MIGRATIONS_DIR = resolve(process.cwd(), 'db/migrations')

export async function withClient<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: url })
  await c.connect()
  try {
    return await fn(c)
  } finally {
    await c.end()
  }
}

// One acceptance file at a time may use the database: each file holds this lock from its first to its last test.
let lockClient: pg.Client | undefined
export async function lockDatabase(): Promise<void> {
  lockClient = new pg.Client({ connectionString: ADMIN_URL })
  await lockClient.connect()
  await lockClient.query('select pg_advisory_lock(424242)')
}
export async function unlockDatabase(): Promise<void> {
  if (!lockClient) return
  await lockClient.query('select pg_advisory_unlock(424242)')
  await lockClient.end()
  lockClient = undefined
}

// Q-3: supplements_owner runs migrations and owns the tables; the app connects as supplements_app.
// Q-4: the schema is rebuilt from plain SQL files in db/migrations with node-pg-migrate.
export async function rebuildSchema(): Promise<{ migrations: number }> {
  await withClient(ADMIN_URL, async (c) => {
    for (const role of ['supplements_owner', 'supplements_app']) {
      const found = await c.query('select 1 from pg_roles where rolname = $1', [role])
      if (found.rowCount === 0) await c.query(`create role ${role} login password '${ROLE_PASSWORD}'`)
    }
    await c.query('drop schema if exists public cascade')
    await c.query('create schema public authorization supplements_owner')
    await c.query('grant usage on schema public to supplements_app')
  })
  const files = existsSync(MIGRATIONS_DIR) ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')) : []
  if (files.length > 0) {
    execFileSync('npx', ['node-pg-migrate', 'up', '-m', 'db/migrations', '--database-url-var', 'MIGRATE_DATABASE_URL'], {
      env: { ...process.env, MIGRATE_DATABASE_URL: OWNER_URL },
      stdio: 'pipe',
    })
  }
  return { migrations: files.length }
}

// Empty every application table between tests (identities restart, so the first order is 1001 again).
export async function emptyTables(): Promise<void> {
  await withClient(OWNER_URL, async (c) => {
    const t = await c.query(
      "select tablename from pg_tables where schemaname = 'public' and tablename <> 'pgmigrations'",
    )
    if (t.rowCount && t.rowCount > 0) {
      const names = t.rows.map((r) => `"${r.tablename}"`).join(', ')
      await c.query(`truncate ${names} restart identity cascade`)
    }
  })
}

export async function q<T extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  return withClient(OWNER_URL, async (c) => (await c.query<T>(sql, params)).rows)
}
