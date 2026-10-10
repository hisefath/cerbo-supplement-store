// One Kysely instance per server process, connected as supplements_app through DATABASE_URL (Q-3, D39).
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './db-types'

let instance: Kysely<Database> | undefined

export function useDb(): Kysely<Database> {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    instance = new Kysely<Database>({ dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString }) }) })
  }
  return instance
}
