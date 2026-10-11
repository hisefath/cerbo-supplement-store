# Verifier review — M5 pass 1 (scope: M5-T001 only)

- Date: 2026-10-10 · Diff: `.handoff/reviews/M5-diff.patch` (8 files) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.handoff/reviews/M5-diff.patch`; in worktree `.claude/worktrees/m5-t001/`: `specs/M5-prices-and-stock/tasks/T001.md`, `specs/M5-prices-and-stock/acceptance.md`, `tests/acceptance/M5/prices.test.ts`, `docs/architecture/lld.md` (§1 practice_prices, price_changes, invariants, Database roles and migrations; §2 BE-1 to BE-8, BE-20; §3 FE-13, FE-14, ST-6; §4 EP-27, EP-28, Problem types, Idempotency, Pagination; SEQ-4), `docs/architecture/contracts/openapi.yaml` (listPrices, changePrice, PracticePrice, PriceChange, PriceList, PriceChangeRequest), `docs/design/screens.md#S5`, `server/services/money.ts`, `server/services/idempotency.ts`, `app/pages/ops/orders/index.vue` (pattern check only)

## Findings

No tests-that-lie findings (checked: `tests/unit/pricing.test.ts`. It has no mocks or stubs, and every assertion can fail. Its expected values come from acceptance.md (3750, 1950, 1209, 120000, 1350, 3333), not from what the code returns. There are no skips, sleeps, clock calls or swallowed exceptions. `tests/acceptance/**` is not in the diff.)

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | spec-fidelity | P2 | high | app/components/practice-prices/PriceChangeDialog.vue:52 | The dialog sets `aria-modal`, but nothing keeps focus inside it. Tab moves out to the page behind it. S5 Accessibility requires the dialog to keep focus "inside until closed". | `role="dialog"` `aria-modal="true"` … `@keydown.esc="emit('cancel')"` (only Esc is handled; there is no focus trap and the background is not made `inert`) | fix |
| R2 | correctness | P2 | med | server/services/pricing.ts:15 | `price_cents` has no upper bound. A margin near 9999 multiplies the cost by up to 10000. Either way a result above 2^31−1 overflows the `integer` column (PG 22003) and the user gets 500 `/problems/internal` instead of a 422. No data is lost, because the transaction rolls back. Note that openapi `Cents` has no maximum either. | `price_cents: z.int().positive().optional(),` (`practice_prices.price_cents` is `integer`, lld.md §1) | file |
| R3 | spec-fidelity | P3 | high | app/pages/practice/prices.vue:22 | The page title and h1 are "Practice prices". S5 Microcopy and acceptance Demo smoke step 1 expect "Practice prices · Willow Creek Wellness". EP-27's PriceList has no practice name, so the page has no source for it. | `useHead({ title: 'Practice prices' })` · line 117 `<h1 id="prices-heading">Practice prices</h1>` | file |
| R4 | correctness | P3 | high | app/pages/practice/prices.vue:98 | Every server `validation` problem shows "Enter a new price or a margin, not both." Example: a price of "0" passes the client check, because `toHundredths('0')` returns 0, not null. The server rejects it with `positive()`, and the user sees the both-fields message, which is wrong. | `} else if (slug === 'validation') { errors.value = { form: 'Enter a new price or a margin, not both.' }` (client check at line 64 only rejects `null`) | fix |
| R5 | spec-fidelity | P3 | high | server/services/pricing.ts:87 | EP-27 answers an unknown `history_cursor` with 422 `/problems/validation`. That status is not in the EP-27 contract, which lists 401 and 403 only (openapi listPrices; lld.md EP-27 row). | `throw new ProblemError('validation', { errors: [{ pointer: '#/query/history_cursor', detail: 'Unknown cursor.' }] })` | file |
| R6 | correctness | P3 | low | server/services/pricing.ts:140 | The second-page history path has no database-level test. That path is the row-value keyset `(changed_at, id) < (…)` plus `decodeCursor`'s `Date.parse` of PostgreSQL's `timestamptz::text`. The unit test covers only a `-05` offset string, and no acceptance AT covers EP-27 pagination. Whether a UTC session's `+00` text passes `Date.parse` needs a run to confirm. | `history.where(sql<boolean>\`(price_changes.changed_at, price_changes.id) < (${after.at}::timestamptz, ${after.id}::bigint)\`)` | file |
| R7 | correctness | P3 | med | app/pages/practice/prices.vue:159 | "Show 25 more" swaps the history for the next page instead of adding to it. The earlier lines disappear, and there is no way back except the browser's back button. S5 says only "history shows 25 lines at a time", so this may be intended. | `<NuxtLink v-if="list.history_next_cursor" :to="{ query: { history_cursor: list.history_next_cursor } }">Show 25 more</NuxtLink>` | keep |
| R8 | simplicity | P3 | med | server/services/pricing.ts:185 | BE-8 works out the current price inline with `defaultPriceCents` and the database's `now()`. lld.md BE-8 says it should depend on BE-7 (`currentPrices`, "practice price, else the default") and on BE-20 Clock. The result is a second copy of the price-or-default rule. I did not read BE-7's code to confirm a shared helper exists. | `const old = row?.price_cents ?? defaultPriceCents(product.unit_cost_cents)` | file |
| R9 | spec-fidelity | P3 | high | tests/unit/pricing.test.ts:62 | The unit test's EDGE labels don't match acceptance.md. 0% is EDGE-004 and 99% is EDGE-005 (acceptance.md:127-128), but the test calls 0% "EDGE-005" and files 99% under "EDGE-022" (line 49). Separately, `toHundredths`, the UI's dollar and percent parser on the money path, has no test. | `it('EDGE-005: a 0% margin is below the floor', …` | fix |

No security findings (checked: `assertRole(['provider'])` on both routes; practice scope comes from `viewer.practiceId`, never from input; the path id must match `^\d{1,18}$`; the body uses `strictObject`, so no mass assignment; cursor values go in as bound parameters, and `decodeCursor` checks their shape; EP-28 is wrapped in the BE-5 `guard` with the product id in the request hash; grants follow INV-4, with SELECT and INSERT only on `price_changes`; no secrets, PHI or new dependencies; every changed path is inside T001's `Owns:`).

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-018 / AE-016 | server/services/pricing.ts:58 (`priceFor` → `priceFromMargin`), :186-198 upsert | tests/acceptance/M5/prices.test.ts:33 (AT-001); tests/unit/pricing.test.ts:43 | covered |
| FR-018 / AE-017 | server/services/pricing.ts:59 (price taken as given) | prices.test.ts:57 (AT-002); pricing.test.ts:46 | covered |
| FR-018 validation (exactly one, reason 1-200) | server/services/pricing.ts:13-23 | prices.test.ts:217 (AT-011); pricing.test.ts:17-40 | covered (R4: the UI shows the wrong message for some validation problems) |
| FR-018 stale form (`expected_current_price_cents`, 409) | server/services/pricing.ts:174-199 | prices.test.ts:173 (AT-008); the true race (EDGE-029) is not tested by design | covered |
| FR-018 per-practice scope | server/services/pricing.ts:90-93, :186-190; route `assertRole` | prices.test.ts:185 (AT-009) | covered |
| FR-018 margin rounding and boundaries (EDGE-004, 005, 022) | money.ts `priceFromMargin`; pricing.ts:52-54 `marginBasisPoints` | prices.test.ts:237, :248 (AT-012, AT-013) | covered |
| FR-019 | server/services/pricing.ts:200-210 (history insert), :114-150 (EP-27 history) | prices.test.ts:33 (AT-001), :202 (AT-010) | covered (R6: pagination has no DB-level test) |
| FR-020 / AE-018 | server/services/pricing.ts:58-62 | prices.test.ts:66 (AT-003); pricing.test.ts:53 | covered |
| FR-021 / AE-019 | db/migrations/1760000012000_price-changes.sql:22 (`grant select, insert on price_changes`) | prices.test.ts:78 (AT-004) | covered |
| AT-008 to AT-013 (Done-when set) | as above | prices.test.ts:173-255 | covered (not run by me: no shell) |
| S5 screen (FE-13, FE-14, ST-6) | app/pages/practice/prices.vue, app/components/practice-prices/PriceChangeDialog.vue | none (no browser tool, by acceptance.md design) | partial (R1, R3, R4, R7) |

## Not reviewed

- `.handoff/runs/**` and every worker self-report: never read, by rule. The supervisor's prompt quoted none.
- Test execution and `make check`: I had no shell in this session, so whether AT-001 to AT-004 and AT-008 to AT-013 pass is unconfirmed.
- Grep and Glob were not available in this session (Read only). Because of that I could not open:
  - The M4 migrations. I could not check the grants `supplements_app` already holds on `practice_prices`, or whether any `ALTER DEFAULT PRIVILEGES` would give it UPDATE or DELETE on the new `price_changes`. AT-004 would catch the second case.
  - The down migration's `revoke insert, update on practice_prices`. If M4 already granted these, rolling back would strip grants M4 depends on.
- `server/utils/problem.ts` (`parseBody`, how `ProblemError` extensions are mapped), `server/services/session.ts` (`Viewer.displayName`, `practiceId`), `server/services/access-policy.ts`, and BE-7 `catalog`: not read. I assumed their behaviour from lld.md.
- Page guard for EP-7 `/practice/prices`: the page has no route meta. An existing page (`app/pages/ops/orders/index.vue`) follows the same pattern, so I assumed a global middleware but did not read it.
- `docs/product/prd.md`: not opened. I took the FR-018 to FR-021 and AE-016 to AE-019 text verbatim from T001.md. `docs/architecture/hld.md` and `docs/decisions/DECISION_JOURNAL.md` were not read either.
- Other M5 tasks (T002 to T006) and the M5 milestone diff beyond T001's files: out of scope for this pass.
