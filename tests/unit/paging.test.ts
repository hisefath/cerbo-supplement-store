// BE-22 Paging (lld.md §2): every month, period, cursor and limit is read in one place; a bad value is 422
// /problems/validation, never a 500.
import { afterEach, describe, expect, it } from 'vitest'
import { freezeClock } from '../../server/services/clock'
import { decodeCursor, encodeCursor, parseLimit, parseMonth, parsePeriod } from '../../server/utils/paging'
import { ProblemError } from '../../server/utils/problem'

const problemOf = (fn: () => unknown): ProblemError | string | undefined => {
  try {
    fn()
  } catch (e) {
    return e instanceof ProblemError ? e : 'not a problem'
  }
  return undefined
}
const slugOf = (fn: () => unknown) => {
  const p = problemOf(fn)
  return p instanceof ProblemError ? p.slug : p
}
const day = (s: string) => new Date(`${s}T00:00:00Z`)

afterEach(() => freezeClock(null))

describe('cursors: base64url of [key, id]', () => {
  it('round-trips a keyed cursor, microseconds kept', () => {
    const c = encodeCursor('2026-10-03 09:00:00.123456+00', '1042')
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeCursor(c, '#/cursor', true)).toEqual({ key: '2026-10-03 09:00:00.123456+00', id: '1042' })
  })
  it('round-trips an id-only cursor', () => {
    expect(decodeCursor(encodeCursor(null, '7'), '#/cursor', false)).toEqual({ key: null, id: '7' })
  })
  it('names the pointer and says "Not a cursor from this list."', () => {
    const p = problemOf(() => decodeCursor('junk', '#/history_cursor', true))
    expect(p).toBeInstanceOf(ProblemError)
    expect((p as ProblemError).slug).toBe('validation')
    expect((p as ProblemError).extensions).toEqual({ errors: [{ pointer: '#/history_cursor', detail: 'Not a cursor from this list.' }] })
  })
  it.each([
    ['not base64 json', 'junk'],
    ['keyed list given an id-only cursor', encodeCursor(null, '7')],
    ['id with letters', encodeCursor('2026-10-03 09:00:00+00', '7a')],
    ['id too long', encodeCursor('2026-10-03 09:00:00+00', '1'.repeat(19))],
    ['key not a timestamp', encodeCursor('yesterday', '7')],
    ['key not a real instant', encodeCursor('2026-02-30 09:00:00+00', '7')],
    ['three elements', Buffer.from(JSON.stringify(['2026-10-03 09:00:00+00', '7', 'x'])).toString('base64url')],
  ])('refuses %s', (_, c) => {
    expect(slugOf(() => decodeCursor(c, '#/cursor', true))).toBe('validation')
  })
  it('refuses a keyed cursor on an id-only list', () => {
    expect(slugOf(() => decodeCursor(encodeCursor('2026-10-03 09:00:00+00', '7'), '#/cursor', false))).toBe('validation')
  })
})

describe('parseLimit: 1 to 100, default 25', () => {
  it('defaults to 25', () => {
    expect(parseLimit(undefined, '#/limit')).toBe(25)
    expect(parseLimit('', '#/limit')).toBe(25)
  })
  it('accepts 1 and 100', () => {
    expect(parseLimit('1', '#/limit')).toBe(1)
    expect(parseLimit('100', '#/limit')).toBe(100)
  })
  it.each(['0', '101', '-1', '2.5', 'ten', ['5']])('refuses %j', (raw) => {
    expect(slugOf(() => parseLimit(raw, '#/limit'))).toBe('validation')
  })
})

describe('parseMonth: YYYY-MM, default the current UTC month', () => {
  it('defaults to the clock month in UTC', () => {
    freezeClock(new Date('2026-10-31T23:30:00-05:00'))
    expect(parseMonth(undefined, '#/month')).toBe('2026-11')
    expect(parseMonth('', '#/month')).toBe('2026-11')
  })
  it('accepts a month', () => {
    expect(parseMonth('2025-10', '#/month')).toBe('2025-10')
  })
  it.each(['2026-13', '2026-00', '2026-9', 'October', '2026-09-01', ['2026-09']])('refuses %j with the S6 hint', (raw) => {
    const p = problemOf(() => parseMonth(raw, '#/month')) as ProblemError
    expect(p.slug).toBe('validation')
    expect(p.extensions).toEqual({ errors: [{ pointer: '#/month', detail: 'Pick a month like 2026-10.' }] })
  })
})

describe('parsePeriod: a month or an inclusive from-to of at most 366 days, UTC (BE-17)', () => {
  it('a month is its first day to the first of the next month', () => {
    expect(parsePeriod({ month: '2025-10' })).toEqual({ from: day('2025-10-01'), toExclusive: day('2025-11-01') })
    expect(parsePeriod({ month: '2025-12' })).toEqual({ from: day('2025-12-01'), toExclusive: day('2026-01-01') })
  })
  it('nothing given is the current month', () => {
    freezeClock(new Date('2026-10-11T12:00:00Z'))
    expect(parsePeriod({})).toEqual({ from: day('2026-10-01'), toExclusive: day('2026-11-01') })
  })
  it('from-to includes the to day', () => {
    expect(parsePeriod({ from: '2025-11-01', to: '2025-11-01' })).toEqual({ from: day('2025-11-01'), toExclusive: day('2025-11-02') })
  })
  it('366 days is the limit', () => {
    expect(parsePeriod({ from: '2024-01-01', to: '2024-12-31' })).toEqual({ from: day('2024-01-01'), toExclusive: day('2025-01-01') })
  })
  it.each([
    ['both forms', { month: '2025-10', from: '2025-10-01', to: '2025-10-31' }],
    ['from after to', { from: '2025-11-02', to: '2025-11-01' }],
    ['367 days', { from: '2025-01-01', to: '2026-01-02' }],
    ['a day that does not exist', { from: '2025-02-01', to: '2025-02-30' }],
    ['a bad month', { month: '2025-13' }],
    ['from without to', { from: '2025-10-01' }],
    ['to without from', { to: '2025-10-01' }],
    ['a repeated parameter', { from: ['2025-10-01', '2025-10-02'], to: '2025-10-31' }],
    ['a date with a time', { from: '2025-10-01T00:00', to: '2025-10-31' }],
  ])('refuses %s', (_, q) => {
    expect(slugOf(() => parsePeriod(q))).toBe('validation')
  })
})
