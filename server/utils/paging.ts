// BE-22 Paging (lld.md §2): every list query's month, period, cursor and limit is read here, so a bad value is always
// 422 /problems/validation and never a 500. Cursor = base64url of the JSON array [key, id].
import { now } from '../services/clock'
import { ProblemError } from './problem'

/** `YYYY-MM`, a UTC calendar month. */
export type YearMonth = string

/** A UTC period: [from, toExclusive). */
export interface Period {
  from: Date
  toExclusive: Date
}

const DAY_MS = 86_400_000
const MAX_PERIOD_DAYS = 366
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const KEY = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?\+00$/
const ID = /^\d{1,18}$/

const invalid = (pointer: string, detail: string) => new ProblemError('validation', { errors: [{ pointer, detail }] })

export const encodeCursor = (key: string | null, id: string): string => Buffer.from(JSON.stringify([key, id])).toString('base64url')

export function decodeCursor(cursor: string, pointer: string, keyed: boolean): { key: string | null; id: string } {
  let v: unknown
  try {
    v = JSON.parse(Buffer.from(cursor, 'base64url').toString())
  } catch {
    v = null
  }
  if (Array.isArray(v) && v.length === 2 && typeof v[1] === 'string' && ID.test(v[1])) {
    const [key, id] = v as [unknown, string]
    if (!keyed && key === null) return { key: null, id }
    // A real instant only: "2026-02-30 …" must not reach PostgreSQL's cast.
    if (keyed && typeof key === 'string' && KEY.test(key) && sameInstant(key)) return { key, id }
  }
  throw invalid(pointer, 'Not a cursor from this list.')
}

function sameInstant(key: string): boolean {
  const d = new Date(key.replace(' ', 'T').replace(/\+00$/, 'Z'))
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 19) === key.slice(0, 19).replace(' ', 'T')
}

export function parseLimit(raw: unknown, pointer: string): number {
  if (raw === undefined || raw === '') return 25
  const n = typeof raw === 'string' && /^\d{1,3}$/.test(raw) ? Number(raw) : 0
  if (n < 1 || n > 100) throw invalid(pointer, 'Pick a number from 1 to 100.')
  return n
}

export function parseMonth(raw: unknown, pointer: string): YearMonth {
  if (raw === undefined || raw === '') return now().toISOString().slice(0, 7)
  if (typeof raw !== 'string' || !MONTH.test(raw)) throw invalid(pointer, 'Pick a month like 2026-10.')
  return raw
}

function parseDate(raw: unknown, pointer: string): Date {
  const d = typeof raw === 'string' && DATE.test(raw) ? new Date(`${raw}T00:00:00Z`) : null
  if (!d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) throw invalid(pointer, 'Pick a date like 2026-10-01.')
  return d
}

/** BE-17's period: `month`, or `from` and `to` (inclusive, from ≤ to, at most 366 days); none = the current month. */
export function parsePeriod(query: { month?: unknown; from?: unknown; to?: unknown }): Period {
  const has = (v: unknown) => v !== undefined && v !== ''
  if (has(query.from) || has(query.to)) {
    if (has(query.month)) throw invalid('#/month', 'Pick a month, or a start and end date, not both.')
    const from = parseDate(query.from, '#/from')
    const toExclusive = new Date(parseDate(query.to, '#/to').getTime() + DAY_MS)
    const days = (toExclusive.getTime() - from.getTime()) / DAY_MS
    if (days < 1) throw invalid('#/to', 'Pick an end date on or after the start date.')
    if (days > MAX_PERIOD_DAYS) throw invalid('#/to', 'Pick at most 366 days.')
    return { from, toExclusive }
  }
  const [y, m] = parseMonth(query.month, '#/month').split('-').map(Number) as [number, number]
  return { from: new Date(Date.UTC(y, m - 1, 1)), toExclusive: new Date(Date.UTC(y, m, 1)) }
}
