// BE-8 PricingService pure parts (lld.md §2, SEQ-4): the request shape, the new price and its floor, the margin shown,
// and the history cursor. The database parts (stale check, history rows, grants) are proved by tests/acceptance/M5.
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { parse } from 'vue/compiler-sfc'
import { decodeCursor, encodeCursor, marginBasisPoints, PriceChangeRequest, priceFor } from '../../server/services/pricing'
import { ProblemError } from '../../server/utils/problem'

const problem = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    if (e instanceof ProblemError) return { slug: e.slug, ...e.extensions }
    throw e
  }
  throw new Error('no problem thrown')
}

describe('PriceChangeRequest (EP-28 body, FR-018)', () => {
  const ok = { reason: 'new protocol pricing', expected_current_price_cents: 3000 }
  it('takes a price or a margin', () => {
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 1950 }).success).toBe(true)
    expect(PriceChangeRequest.safeParse({ ...ok, margin_basis_points: 6000 }).success).toBe(true)
  })
  it('refuses both, neither, and a margin outside 0-9999', () => {
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 1950, margin_basis_points: 5000 }).success).toBe(false)
    expect(PriceChangeRequest.safeParse(ok).success).toBe(false)
    expect(PriceChangeRequest.safeParse({ ...ok, margin_basis_points: 10000 }).success).toBe(false)
    expect(PriceChangeRequest.safeParse({ ...ok, margin_basis_points: -1 }).success).toBe(false)
  })
  it('needs a reason of 1-200 characters, not just spaces', () => {
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 1950, reason: '' }).success).toBe(false)
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 1950, reason: '   ' }).success).toBe(false)
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 1950, reason: 'x'.repeat(201) }).success).toBe(false)
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 1950, reason: 'x'.repeat(200) }).success).toBe(true)
    expect(PriceChangeRequest.safeParse({ price_cents: 1950, expected_current_price_cents: 1800 }).success).toBe(false)
  })
  it('refuses unknown fields and fractional cents', () => {
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 1950, extra: 1 }).success).toBe(false)
    expect(PriceChangeRequest.safeParse({ ...ok, price_cents: 19.5 }).success).toBe(false)
  })
})

describe('priceFor: the resulting price, floor-checked (FR-018, FR-020)', () => {
  it('AE-016: a 60% margin on a $15.00 cost is $37.50', () => {
    expect(priceFor(3n, 1500, { margin_basis_points: 6000 })).toBe(3750)
  })
  it('AE-017: a new price is taken as given', () => {
    expect(priceFor(1n, 900, { price_cents: 1950 })).toBe(1950)
  })
  it('EDGE-022: 33.33% on $9.00 rounds half-up to $13.50', () => {
    expect(priceFor(1n, 900, { margin_basis_points: 3333 })).toBe(1350)
  })
  it('EDGE-005: a 99% margin on $12.00 is $1,200.00', () => {
    expect(priceFor(2n, 1200, { margin_basis_points: 9900 })).toBe(120000)
  })
  it('AE-018: $12.00 on a $12.00 cost is refused with $12.09 as the lowest allowed; $12.09 passes', () => {
    expect(problem(() => priceFor(2n, 1200, { price_cents: 1200 }))).toEqual({
      slug: 'below-price-floor',
      lowestAllowedPriceCents: 1209,
      productIds: [2],
    })
    expect(problem(() => priceFor(2n, 1200, { price_cents: 1208 })).slug).toBe('below-price-floor')
    expect(priceFor(2n, 1200, { price_cents: 1209 })).toBe(1209)
  })
  it('EDGE-004: a 0% margin is below the floor', () => {
    expect(problem(() => priceFor(2n, 1200, { margin_basis_points: 0 })).slug).toBe('below-price-floor')
  })
})

describe('marginBasisPoints: (price - cost) / price, half-up', () => {
  it('shows 60%, 50% and 33.33%', () => {
    expect(marginBasisPoints(3750, 1500)).toBe(6000)
    expect(marginBasisPoints(1800, 900)).toBe(5000)
    expect(marginBasisPoints(1350, 900)).toBe(3333)
  })
  it('rounds half-up: 2/3 of a basis point goes up', () => {
    // (300 - 1) / 300 = 9966.67 bp
    expect(marginBasisPoints(300, 1)).toBe(9967)
  })
})

describe('history cursor (EP-27, lld.md §4 Pagination)', () => {
  it('round-trips the last row time and id', () => {
    const c = encodeCursor('2026-10-10 21:00:00.123456-05', '42')
    expect(decodeCursor(c)).toEqual({ at: '2026-10-10 21:00:00.123456-05', id: '42' })
  })
  it('refuses a cursor it did not make', () => {
    expect(problem(() => decodeCursor('not-a-cursor')).slug).toBe('validation')
    expect(problem(() => decodeCursor(Buffer.from('["x","1"]').toString('base64url'))).slug).toBe('validation')
    expect(problem(() => decodeCursor(Buffer.from('["2026-10-10 21:00:00-05","1; drop"]').toString('base64url'))).slug).toBe('validation')
  })
})

// FE-14's plain <script> block (the parser, the validation copy, the focus trap), loaded from the real .vue file:
// vitest here has no Vue plugin, and the block imports nothing.
const sfc = parse(readFileSync(new URL('../../app/components/practice-prices/PriceChangeDialog.vue', import.meta.url), 'utf8'))
const js = ts.transpileModule(sfc.descriptor.script!.content, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const dialog = await import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(js.outputText).toString('base64')}`)
const { toHundredths, fieldErrors, trapTab } = dialog as {
  toHundredths: (s: string) => number | null
  fieldErrors: (e: { pointer: string; detail: string }[] | undefined, floor: number) => Record<string, string>
  trapTab: (e: { shiftKey: boolean; preventDefault: () => void }, root: unknown, active: unknown) => void
}

describe('toHundredths: the dialog\'s dollar and percent parser (S5, money path)', () => {
  it('reads dollars and percents as whole hundredths', () => {
    expect(toHundredths('37.50')).toBe(3750)
    expect(toHundredths('37.5')).toBe(3750)
    expect(toHundredths('19')).toBe(1900)
    expect(toHundredths(' 60 ')).toBe(6000)
    expect(toHundredths('33.33')).toBe(3333)
    expect(toHundredths('0.01')).toBe(1)
    expect(toHundredths('0')).toBe(0)
    expect(toHundredths('9999999.99')).toBe(999999999)
  })
  it('refuses what is not a plain amount: empty, signs, symbols, commas, a third decimal, too many digits', () => {
    for (const bad of ['', ' ', '.5', '5.', '-1', '+1', '$37.50', '1,000', '37.505', '1e3', '12345678', 'abc', '37.50%'])
      expect(toHundredths(bad), bad).toBeNull()
  })
})

describe('fieldErrors: a 422 validation problem as S5 copy under its field (R4)', () => {
  it('a $0.00 price shows the floor copy, not the both-fields copy', () => {
    expect(fieldErrors([{ pointer: '#/price_cents', detail: 'Too small: expected number to be >0' }], 1209)).toEqual({
      price: 'That price is below the lowest allowed, $12.09. Enter $12.09 or more.',
    })
  })
  it('keeps "not both" only for both-or-neither', () => {
    expect(fieldErrors([{ pointer: '#/price_cents', detail: 'Enter a new price or a margin, not both.' }], 1209)).toEqual({
      price: 'Enter a new price or a margin, not both.',
    })
  })
  it('puts a reason problem under Reason and a margin problem under the price field', () => {
    expect(
      fieldErrors(
        [
          { pointer: '#/reason', detail: 'Add a reason so others know why the price changed.' },
          { pointer: '#/margin_basis_points', detail: 'Too big: expected number to be <=9999' },
        ],
        1209,
      ),
    ).toEqual({ reason: 'Add a reason so others know why the price changed.', price: 'Enter a margin from 0 to 99.99.' })
  })
  it('anything else goes under the form; no details falls back to the save-failed copy', () => {
    expect(fieldErrors([{ pointer: '#/expected_current_price_cents', detail: 'Invalid input' }], 1209)).toEqual({ form: 'Invalid input' })
    expect(fieldErrors(undefined, 1209)).toEqual({ form: "We couldn't save the new price. The old price still applies. Try again." })
  })
})

describe('trapTab: focus stays inside the dialog (S5 Accessibility, R1)', () => {
  const el = () => ({ focus: vi.fn() })
  const [first, mid, last] = [el(), el(), el()]
  const root = { querySelectorAll: () => [first, mid, last], contains: (x: unknown) => [first, mid, last].includes(x as never) }
  const tab = (shiftKey: boolean, active: unknown) => {
    const e = { shiftKey, preventDefault: vi.fn() }
    trapTab(e, root, active)
    return e.preventDefault.mock.calls.length
  }
  it('Tab on the last control wraps to the first; Shift+Tab on the first wraps to the last', () => {
    expect(tab(false, last)).toBe(1)
    expect(first.focus).toHaveBeenCalledOnce()
    expect(tab(true, first)).toBe(1)
    expect(last.focus).toHaveBeenCalledOnce()
  })
  it('leaves Tab inside the dialog to the browser', () => {
    expect(tab(false, mid)).toBe(0)
    expect(tab(true, mid)).toBe(0)
    expect(tab(false, first)).toBe(0)
  })
})
