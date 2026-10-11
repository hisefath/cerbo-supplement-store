// BE-17 FinanceReportService (lld.md §2, SEQ-9): the report and the export from ledger entries alone, each read in one
// repeatable-read transaction. The SQL runs against a fake Kysely driver that records the transaction settings and
// answers each query with the AE-055 October rows; the real database is proved by tests/acceptance/M6 (AT-010 to 017).
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type CompiledQuery } from 'kysely'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildReport, csvLines, exportCsv, report } from '../../server/services/finance-report'
import type { Viewer } from '../../server/services/session'
import { ProblemError } from '../../server/utils/problem'

const fake = vi.hoisted(() => ({
  log: [] as string[], // 'begin:<isolation>', each sql, 'commit'
  inTx: false,
  outside: [] as string[], // queries run outside a transaction
}))

function run(q: CompiledQuery): { rows: any[] } {
  const s = q.sql
  fake.log.push(s)
  if (!fake.inTx) fake.outside.push(s)
  if (s.includes('group by "category"'))
    return { rows: [
      { category: 'patient_payment', cents: '9000' }, { category: 'item_cost', cents: '4500' },
      { category: 'provider_payout', cents: '4432' }, { category: 'platform_fee', cents: '68' },
    ] }
  if (s.includes('"display_name"')) return { rows: [{ provider_display_name: 'Dr. Maya Chen', practice_name: 'Willow Creek Wellness', payout_cents: '4432' }] }
  if (s.includes('having')) return { rows: [] }
  if (s.includes('group by "order_id"'))
    return { rows: [
      { order_id: '1042', patient_payment: '6000', item_cost: '3000', provider_payout: '2955', platform_fee: '45' },
      { order_id: '1043', patient_payment: '3000', item_cost: '1500', provider_payout: '1477', platform_fee: '23' },
    ] }
  return { rows: [] }
}

vi.mock('../../server/utils/db', () => ({
  useDb: () =>
    new Kysely<any>({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createQueryCompiler: () => new PostgresQueryCompiler(),
        createIntrospector: (db) => new PostgresIntrospector(db),
        createDriver: () => ({
          init: async () => {},
          acquireConnection: async () => ({
            executeQuery: async (q: CompiledQuery) => run(q) as any,
            streamQuery: () => {
              throw new Error('not used')
            },
          }),
          beginTransaction: async (_c: unknown, settings: { isolationLevel?: string }) => {
            fake.inTx = true
            fake.log.push(`begin:${settings.isolationLevel}`)
          },
          commitTransaction: async () => {
            fake.inTx = false
            fake.log.push('commit')
          },
          rollbackTransaction: async () => {
            fake.inTx = false
          },
          releaseConnection: async () => {},
          destroy: async () => {},
        }),
      },
    }),
}))

const fran: Viewer = { userId: 9n, displayName: 'Fran', role: 'finance_lead', practiceId: null, practiceName: null, idleExpiresAt: new Date('2026-10-10T12:15:00Z') }
const omar: Viewer = { ...fran, userId: 8n, role: 'operations_specialist' }
const october = { from: new Date('2025-10-01T00:00:00Z'), toExclusive: new Date('2025-11-01T00:00:00Z') }
const totals = { patient_payment: 9000, item_cost: 4500, provider_payout: 4432, platform_fee: 68 }
const zero = { patient_payment: 0, item_cost: 0, provider_payout: 0, platform_fee: 0 }

beforeEach(() => {
  fake.log.length = 0
  fake.outside.length = 0
  fake.inTx = false
})

const slugOf = async (p: Promise<unknown>) => p.then(() => undefined, (e) => (e instanceof ProblemError ? e.slug : 'not a problem'))
const collect = async (it: AsyncIterable<string>) => {
  const out: string[] = []
  for await (const l of it) out.push(l)
  return out
}

describe('buildReport: the equation, gross and net (FR-060 to FR-062, FR-065)', () => {
  it('AE-055/056/057: October balances; gross is all payments, net the fees', () => {
    const r = buildReport(october, totals, [], [])
    expect(r).toMatchObject({
      from: '2025-10-01', to: '2025-10-31',
      patient_payments_cents: 9000, item_cost_cents: 4500, provider_payouts_cents: 4432, platform_fees_cents: 68,
      balanced: true, gap_cents: 0, gap_order_ids: [], gross_revenue_cents: 9000, net_revenue_cents: 68,
    })
  })
  it('AE-059: one cent short is not balanced, gap 1, names the order', () => {
    const r = buildReport(october, { ...totals, platform_fee: 67 }, [], [1042])
    expect(r).toMatchObject({ balanced: false, gap_cents: 1, gap_order_ids: [1042] })
  })
  it('parts over the payments give a negative gap', () => {
    expect(buildReport(october, { ...totals, item_cost: 4501 }, [], [1042])).toMatchObject({ balanced: false, gap_cents: -1 })
  })
  it('AE-060: an empty period is all zeros and balanced', () => {
    expect(buildReport({ from: new Date('2025-09-01T00:00:00Z'), toExclusive: new Date('2025-10-01T00:00:00Z') }, zero, [], [])).toEqual({
      from: '2025-09-01', to: '2025-09-30', patient_payments_cents: 0, item_cost_cents: 0, provider_payouts_cents: 0, platform_fees_cents: 0,
      balanced: true, gap_cents: 0, gap_order_ids: [], gross_revenue_cents: 0, net_revenue_cents: 0, payouts_by_provider: [],
    })
  })
})

describe('csvLines: header, the four totals, one line per order in whole cents (FR-063, Q-6)', () => {
  it('AE-058: two order lines and no patient', () => {
    const lines = csvLines(totals, [
      { order_id: 1043, ...zero, patient_payment: 3000 },
      { order_id: 1042, ...zero, patient_payment: 6000 },
    ])
    expect(lines).toEqual([
      'order,patient_payment_cents,item_cost_cents,provider_payout_cents,platform_fee_cents\r\n',
      'total,9000,4500,4432,68\r\n',
      '1042,6000,0,0,0\r\n',
      '1043,3000,0,0,0\r\n',
    ])
    expect(lines.join('').split(/[,\r\n]+/).filter(Boolean).every((cell) => !/^[=+\-@]/.test(cell))).toBe(true)
  })
})

describe('report and exportCsv read inside one repeatable-read transaction (BE-17, EDGE-039)', () => {
  it('report: every query between begin repeatable read and commit', async () => {
    const r = await report(fran, october)
    expect(r).toMatchObject({ patient_payments_cents: 9000, platform_fees_cents: 68, balanced: true })
    expect(r.payouts_by_provider).toEqual([{ provider_display_name: 'Dr. Maya Chen', practice_name: 'Willow Creek Wellness', payout_cents: 4432 }])
    expect(fake.log[0]).toBe('begin:repeatable read')
    expect(fake.log.at(-1)).toBe('commit')
    expect(fake.log.filter((l) => l.startsWith('begin'))).toHaveLength(1)
    expect(fake.log.length).toBeGreaterThanOrEqual(5) // begin, totals, payouts, gaps, commit
    expect(fake.outside).toEqual([])
  })
  it('report: only ledger entries for the period, never orders amounts', async () => {
    await report(fran, october)
    const sqls = fake.log.filter((l) => l.startsWith('select'))
    for (const s of sqls) {
      expect(s).toContain('from "ledger_entries"')
      expect(s).toContain('"occurred_at" >=')
      expect(s).toContain('"occurred_at" <')
      expect(s).not.toContain('amount_paid_cents')
    }
  })
  it('exportCsv: totals and order lines from one repeatable-read transaction', async () => {
    const lines = await collect(exportCsv(fran, october))
    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe('total,9000,4500,4432,68\r\n')
    expect(lines[2]).toBe('1042,6000,3000,2955,45\r\n')
    expect(fake.log[0]).toBe('begin:repeatable read')
    expect(fake.log.at(-1)).toBe('commit')
    expect(fake.log.filter((l) => l.startsWith('begin'))).toHaveLength(1)
    expect(fake.outside).toEqual([])
  })
  it('FR-051: anyone but the finance lead is refused before any read', async () => {
    expect(await slugOf(report(omar, october))).toBe('forbidden')
    expect(await slugOf(collect(exportCsv(omar, october)))).toBe('forbidden')
    expect(fake.log).toEqual([])
  })
})
