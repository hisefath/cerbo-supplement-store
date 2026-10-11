---
milestone: M5
slug: prices-and-stock
artifact: acceptance
status: draft
written_by: define-acceptance (software-factory-kit 0.1)
written_at: 2026-10-10 20:32 CDT (UTC-0500)
base_sha: c1e3d70
inputs: "docs/product/prd.md@998ed94 (G1), docs/architecture/lld.md@9708841 (G3), docs/architecture/hld.md@fea2e18 (G2), docs/design/screens.md@bff1dd4 (G-ux)"
tests: tests/acceptance/M5/
gate: G4
---

# M5 acceptance: prices and stock

## Scope

In-scope ids for M5, from the `## Milestone cut` row of `docs/product/prd.md` (Scope and Proves columns) and
what those FRs reach. Every count comes from the command listed under the table for that kind.

| Kind | Ids | Count |
|---|---|---|
| FR | FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-037, FR-038, FR-045, FR-046, FR-047, FR-069 | 19 |
| AE | AE-016, AE-017, AE-018, AE-019, AE-020, AE-021, AE-022, AE-023, AE-024, AE-025, AE-026, AE-027, AE-035, AE-036, AE-042, AE-043, AE-044, AE-066 | 18 |
| EC (PRD edge cases) | EC-2, EC-4, EC-5, EC-6, EC-7, EC-12, EC-13 | 7 |
| NFR | NFR-001, NFR-003, NFR-004, NFR-013, NFR-014 | 5 |
| SC (Proves column) | none: the M5 Proves column lists AE ids only | 0 |
| INV (hld.md §7) and LINV (lld.md §7) | INV-4, INV-5, INV-6, INV-8, LINV-1 | 5 |
| Screens and states | S2 Your supplement order (notices, held prices), S5 Practice prices, S6 Practice dashboard, S7 Stock adjustments | 4 |
| State machines and sequences | SM-1 Order lifecycle (hold ends), SM-2 Payment attempt (stock reserve and release); SEQ-2 pay, SEQ-4 change a price, SEQ-5 practice dashboard, SEQ-6 stock adjustment | 6 |
| Regression pins (Q-1, FINDINGS F21, M5-R02) | FR-006, FR-008, FR-013, FR-039, FR-066, FR-067 (M4 behaviours its review fixed) | 6 |

Counted with (one command per kind; pipes are fine here, never inside the table):

```sh
FR:  sed -n '/^## Milestone cut/,/^## /p' docs/product/prd.md | grep -E '^\| M5 ' | grep -oE 'FR-[0-9]{3}' | sort -u | wc -l
AE:  grep -oE '^- \*\*AE-0(1[6-9]|2[0-7]|3[56]|4[2-4]|66)\*\*' docs/product/prd.md | wc -l
EC:  grep -E '^- \*\*EC-' docs/product/prd.md | grep -cE 'FR-0(1[89]|2[0-9]|30|3[78]|4[5-7]|69)'
NFR: chosen by subject (price, stock and order-journey history and privacy): NFR-001, NFR-003, NFR-004, NFR-013, NFR-014
INV: grep -E '^\| (INV-(4|5|6|8)|\*\*LINV-1)' docs/architecture/hld.md docs/architecture/lld.md (Basis cites an in-scope FR)
Screens: grep -E '^## S(2|5|6|7) ' docs/design/screens.md | wc -l
```

Out of scope this milestone: FR-032, FR-048, FR-049, FR-051 to FR-064 (M6 measurement and operations).

## How these tests run

| Item | Value | Source |
|---|---|---|
| Framework | Vitest 5.0.1 with @nuxt/test-utils (boots the real Nuxt app per file) | AGENTS.md:10-13; tests/acceptance/support/app.ts:6 |
| Run all M5 acceptance tests | `npx vitest run tests/acceptance/M5` | AGENTS.md:11 |
| Run one test (for a task's Done-when) | `npx vitest run tests/acceptance/M5 -t 'M5_AT_007 '` (exits 0 when no test matches: see Q-5) | vitest `-t`; proven in Red run |
| Test database (safe to reset?) | yes: `supplements_test` on the throwaway docker-compose `db-test` container (127.0.0.1:54329, tmpfs) | tests/acceptance/support/db.ts:10-19; docker-compose.yml:3-14 |
| Database between tests | schema dropped and rebuilt from db/migrations per file; every table truncated with identity restart before each test; files serialised by an advisory lock | tests/acceptance/support/db.ts:30-80 |
| Fakes at external boundaries | SEAM-3 payment stand-in via PAYMENT_STUB_MODE (succeed, decline); SEAM-6 SCRYPT_COST; time is arranged by writing LLD-named timestamp columns (`orders.sent_at`, `orders.prices_held_until`) | lld.md §9; tests/acceptance/support/app.ts:10-13 |
| Never faked (lld.md §9) | the PostgreSQL engine (constraints, grants, row locks, concurrent payments) | lld.md §9 |
| Browser tool (e2e) | none: screens are checked through the API they call; copy is checked in the demo smoke | package.json (no Playwright) |
| Contract validator | none: response shapes are asserted field by field from openapi.yaml | package.json |
| `make check` runs `tests/acceptance/` | only `tests/acceptance/M4` (target `test-acceptance-m4`); M5 is not run (see Suites, Q-2) | Makefile:12, Makefile:45-46 |

- **QA-owned.** Only `define-acceptance` edits `tests/acceptance/**`. `slice-tasks` never lists it in an `Owns:`.
  An implementer who believes a test is wrong writes that under `## Questions` in its `result.md` and stops.
- **Suites (recommendation, → Q-2 at G4, until WORKFLOW.md settles it).** While M5 is built these tests
  measure progress, so `make check` should not run them (every task would stay red); each task's Done-when runs
  only its own AT ids. When M5 merges they should join the regression suite `make check` runs. Today `make check`
  does not reach `tests/acceptance/M5` (Makefile:12 runs only `test-acceptance-m4`). The change that adds
  them: a `test-acceptance-m5` target (`npx vitest run --dir tests/acceptance/M5`) added to the `check:` line, made by
  the last M5 task, in its Owns via slice-tasks (the M4-T009 pattern).
- **Test data.** Synthetic only: the people, practices and products of tests/acceptance/support/people.ts
  (Dr. Maya Chen, Ana Ruiz, Ben Ortiz, Omar Ortega and others, all `@example.test`).

## Traceability

| AT | Covers | Requirement (EARS, verbatim) | Given / When / Then (concrete values) | Technique | Level | Test (path::name) | Status |
|---|---|---|---|---|---|---|---|
| AT-001 | AE-016, FR-018, FR-019, NFR-003, NFR-014 | FR-018: When a provider submits the price-change form with either a new price or a margin percentage, the system shall set the practice's price for that product to the resulting price in whole cents, reading margin as a share of the patient price. | **Given** Omega-3 costs $15.00 and is priced at $30.00 **When** Dr. Chen submits a 60% margin with the reason "new protocol pricing" **Then** the price is $37.50 and the history shows Dr. Maya Chen, now, $30.00, $37.50 and "new protocol pricing" | example | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_001` | red @ c1e3d70 |
| AT-002 | AE-017, FR-018 | FR-018 (as above) | **Given** Vitamin D3 at $18.00 **When** Dr. Chen submits a new price of $19.50 **Then** its price is $19.50 | example | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_002` | red @ c1e3d70 |
| AT-003 | AE-018, FR-020, INV-6, EC-2 | FR-020: If a submitted price would leave the provider a payout below $0.00 on one unit after the platform fee, then the system shall refuse the change and show the lowest allowed price. | **Given** Magnesium Glycinate costs $12.00 **When** Dr. Chen submits $12.00 **Then** 422 below-price-floor with lowest allowed $12.09 and no history entry; then $12.09 is accepted | example | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_003` | red @ c1e3d70 |
| AT-004 | AE-019, FR-021, INV-4, EC-12, NFR-013 | FR-021: If anyone tries to edit or delete a price history entry, then the system shall refuse and keep the entry unchanged. | **Given** the AE-016 history entry exists **When** the app's database user updates or deletes it **Then** both are refused with 42501 and the entry still shows $30.00 → $37.50 | example | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_004` | red @ c1e3d70 |
| AT-005 | AE-020, FR-022, EC-4 | FR-022: When an item's price changes while an order containing it is not yet in checkout, the system shall show the person viewing that order a notice naming the item, its old price and its new price. | **Given** Ana's sent order has 2 Vitamin D3 and 1 Magnesium Glycinate at $24.00 ($60.00) **When** Dr. Chen changes Magnesium to $26.00 **Then** Ana's order shows Magnesium Glycinate $24.00 → $26.00 and $62.00 | example | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_005` | red @ c1e3d70 |
| AT-006 | AE-021, FR-023, FR-024, INV-8, EC-5 | FR-024: While an order is in checkout, when its practice's price for an item changes, the system shall charge the patient the price fixed at checkout start. | **Given** Ana started checkout at $60.00 **When** Dr. Chen changes Vitamin D3 to $20.00 and Ana pays **Then** she is charged $60.00 and Vitamin D3's line is $18.00 | example | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_006` | red @ c1e3d70 |
| AT-007 | AE-035, FR-037, FR-022, EC-6 | FR-037: When 30 minutes pass after a patient started checkout without paying, the system shall return the order to the practice's current prices. | **Given** Ana started checkout with Magnesium held at $24.00 and Dr. Chen changed it to $26.00 **When** the hold has ended (prices_held_until one minute ago) **Then** the order is sent, $62.00, no hold, with the notice $24.00 → $26.00 | example | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_007` | red @ c1e3d70 |
| AT-008 | FR-018, FR-019 | FR-018 (as above) | **Given** Vitamin D3 changed from $18.00 to $19.50 **When** a form loaded at $18.00 submits $21.00 **Then** 409 stale-price with current $19.50; price stays $19.50; one history entry | state | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_008` | red @ c1e3d70 |
| AT-009 | FR-018, NFR-004 | FR-018 (as above) | **Given** Dr. Chen set Omega-3 to $32.00 **When** Ana tries $33.00 and Dr. Lee sets $34.00 **Then** Ana gets 403; Maple Grove is $34.00, Willow Creek stays $32.00 | authz | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_009` | red @ c1e3d70 |
| AT-010 | FR-019 | FR-019: When a practice's price for a product changes, the system shall add a price history entry showing who changed it, when, the old price, the new price and the reason given. | **Given** one change of Vitamin D3 to $19.50 **When** it is sent twice with one key, then once with no key **Then** one history entry, the same body twice, and 400 idempotency-key-missing | concurrency | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_010` | red @ c1e3d70 |
| AT-011 | FR-018, FR-019 | FR-018 (as above) | **Given** Vitamin D3 at $18.00 **When** a change has both a price and a margin, or no reason **Then** 422 validation each time and no history entry | partition | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_011` | red @ c1e3d70 |
| AT-012 | FR-018, FR-020 | FR-020 (as above) | **Given** Magnesium costs $12.00 **When** margins 0% and 99% are submitted **Then** 0% is refused with lowest $12.09; 99% gives $1,200.00 | boundary | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_012` | red @ c1e3d70 |
| AT-013 | FR-018 | FR-018 (as above) | **Given** Vitamin D3 costs $9.00 **When** a 33.33% margin is submitted **Then** the price is $13.50 (half-up) and margin 3333 basis points | money-time | integration | `tests/acceptance/M5/prices.test.ts::M5_AT_013` | red @ c1e3d70 |
| AT-014 | AE-022, FR-025 | FR-025: If a provider adds more units of a product than are in stock, then the system shall refuse the quantity and show the units available. | **Given** 2 Vitamin D3 in stock **When** Dr. Chen sends 2 (accepted), then 3 for Ben **Then** 422 insufficient-stock naming Vitamin D3 with 2 available; Ben has no order | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_014` | green: pins EP-19's stock check built in M4 (shown failing when the check is removed) |
| AT-015 | AE-023, FR-026, INV-5 | FR-026: If a patient pays for an order whose items are no longer all in stock, then the system shall refuse the payment without charging and name the items short of stock. | **Given** 1 Vitamin D3 in stock and Ana's order holds 2 **When** Ana pays **Then** 422 insufficient-stock naming Vitamin D3; no succeeded attempt, no ledger, stock still 1 | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_015` | red @ c1e3d70 |
| AT-016 | AE-024, FR-026, INV-5, EC-7 | FR-026 (as above) | **Given** 1 Omega-3 left; Ana and Ben each in checkout for 1 **When** both pay at the same moment **Then** one 201 and one 422 insufficient-stock; stock 0; one succeeded attempt | concurrency | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_016` | red @ c1e3d70 |
| AT-017 | AE-027, FR-030, NFR-003, NFR-014 | FR-030: When a platform staff member records a stock adjustment with a quantity and a reason, the system shall add a stock history entry showing who made it, when, the change and the reason. | **Given** 8 Vitamin D3 in stock **When** Omar records +12 "delivery received" **Then** stock 20; the history shows Omar Ortega, now, +12, "delivery received" | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_017` | red @ c1e3d70 |
| AT-018 | AE-036, FR-038 | FR-038: If a provider tries to record a stock adjustment, then the system shall refuse it and leave the stock count unchanged. | **Given** 8 Vitamin D3; Omar records +1 (allowed twin) **When** Dr. Chen records +5 **Then** 403 forbidden; stock 9; one adjustment | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_018` | red @ c1e3d70 |
| AT-019 | FR-030, INV-5 | FR-030 (as above) | **Given** stock moved 8 → 9 **When** a form expecting 8 adds 2, then −10 is submitted **Then** 409 stale-stock (9), then 422 insufficient-stock; stock 9 | state | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_019` | red @ c1e3d70 |
| AT-020 | FR-030 | FR-030 (as above) | **Given** 8 Vitamin D3 **When** +12 is sent twice with one key **Then** both 201 with the same body; stock 20 | concurrency | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_020` | red @ c1e3d70 |
| AT-021 | AE-025, FR-027, FR-029 | FR-027: When an order is marked paid, the system shall reduce each product's stock by the quantity sold. | **Given** 10 Vitamin D3 **When** Ana's order of 2 is paid **Then** the dashboard and the products row show 8 | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_021` | red @ c1e3d70 |
| AT-022 | AE-026, FR-028, FR-069, LINV-1 | FR-028: When a provider opens the practice dashboard for a chosen period, the system shall show per product the units sold, the amount patients paid and the provider payout after that product's share of the platform fee (FR-069). | **Given** paid orders of 2 and 1 Vitamin D3 this month and one unpaid order of 1 **When** Dr. Chen opens the dashboard for this month **Then** Vitamin D3: 3 sold, $54.00 paid, $26.59 payout; Omega-3: 0, $0.00, $0.00 | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_022` | red @ c1e3d70 |
| AT-023 | AE-042, FR-045, NFR-004 | FR-045: When a provider opens the practice dashboard, the system shall list the practice's orders with patient, total, status, time sent and time paid. | **Given** Ana's paid $60.00 order and Ben's sent $30.00 order **When** Dr. Chen opens the orders list **Then** both rows with patient, total, status paid and sent, sent time, paid time (Ben: none) | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_023` | red @ c1e3d70 |
| AT-024 | AE-043, FR-046 | FR-046: While a practice's order has been sent and unpaid for more than 3 days, the system shall flag it on the practice dashboard as awaiting payment. | **Given** Ben's order sent 4 days ago and Ana's 2 days 23 hours ago, both unpaid **When** Dr. Chen opens the dashboard **Then** exactly one attention item: "Awaiting payment for 4 days" for Ben's order | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_024` | red @ c1e3d70 |
| AT-025 | AE-044, FR-047 | FR-047: While a product has 3 units or fewer in stock, the system shall flag it on the practice dashboard as low stock. | **Given** 3 Omega-3 and 4 Magnesium **When** Dr. Chen opens the dashboard **Then** exactly one low-stock item: "Low stock: 3 left" for Omega-3 | example | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_025` | red @ c1e3d70 |
| AT-026 | FR-028, FR-045, NFR-004 | FR-045 (as above) | **Given** Ana's paid Willow Creek order **When** Dr. Chen, Ana and Dr. Lee open the dashboard and orders list **Then** Dr. Chen sees it; Ana gets 403; Dr. Lee sees no orders and 0 Vitamin D3 sold | authz | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_026` | red @ c1e3d70 |
| AT-027 | AE-066, FR-069, LINV-1 | FR-069: The system shall share each paid order's one platform fee across its lines in proportion to each line's amount, giving any leftover cents to the lines with the largest remainders, so the shares add up to the order's fee exactly. | **Given** three $1.00 lines and a 2c fee **When** BE-6.allocateFee shares it **Then** [1, 1, 0]; triangulation: $18, $24, $30 with 54c → [14, 18, 22] | example | unit | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_027` | green: pins BE-6.allocateFee built in M4 (shown failing when leftover cents are dropped) |
| AT-028 | FR-069, LINV-1 | FR-069 (as above) | **Given** Ana's $72.00 order of one of each product **When** it is paid **Then** stored fee shares 14, 18, 22 and platform fee 54 | money-time | integration | `tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_028` | green: pins fee shares stored at payment in M4 (shown failing when leftover cents are dropped) |
| AT-029 | FR-006, FR-008 | FR-008 (M4): the patient is charged at most once per order (D41 key release, review M4-pass3 R1) | **Given** Ana's sent order **When** she pays with key K before checkout (409), then checks out and pays with K **Then** 201 $18.00, not a replay of the 409 | state | integration | `tests/acceptance/M5/m4-regressions.test.ts::M5_AT_029` | green: pins key release on problems (shown failing when problems are stored) |
| AT-030 | FR-039 | FR-039 (M4): sign-in with a 10-tries-per-15-minutes limit (review M4-pass5 R3) | **Given** Ben's account **When** 11 wrong passwords arrive at once **Then** 10 × 401 and 1 × 429 | concurrency | integration | `tests/acceptance/M5/m4-regressions.test.ts::M5_AT_030` | green: pins the advisory-locked sign-in limit (shown failing when the limit is raised) |
| AT-031 | FR-006 | FR-006 (M4): payment, rate-limited 10 per 15 minutes (SEC-9, review M4-pass7 R2) | **Given** Ana's sent order **When** 11 Pay presses arrive at once **Then** 10 × 409 invalid-transition and 1 × 429 rate-limited | concurrency | integration | `tests/acceptance/M5/m4-regressions.test.ts::M5_AT_031` | green: pins the advisory-locked pay limit (shown failing when the limit is raised) |
| AT-032 | FR-066, FR-067 | FR-066 (M4): a provider cancels only a sent or payment-failed order (review M4-pass6 R2) | **Given** Ben's sent order and Ana's order in a live checkout **When** Dr. Chen cancels both **Then** Ben's is cancelled; Ana's is 409 and stays in_checkout | state | integration | `tests/acceptance/M5/m4-regressions.test.ts::M5_AT_032` | green: pins the cancel guard (shown failing when in_checkout is allowed) |
| AT-033 | FR-013, INV-6 | FR-013 (M4) and D47: a split that leaves a payout below $0.00 is listed for review before any charge (review M4-pass2 R2) | **Given** Vitamin D3 fixed at $18.00 and its cost raised to $18.00 after sending **When** Ana pays **Then** 422 order-under-review; status needs_review; no payment attempt | decision-table | integration | `tests/acceptance/M5/m4-regressions.test.ts::M5_AT_033` | green: pins the D47 guard (shown failing when the guard is removed) |
| AT-034 | FR-026, FR-027, INV-5 | FR-027 (as above) and lld.md stock_movements.kind: sale reserved when payment starts, sale_release returned when it fails | **Given** 10 Vitamin D3; the payment stand-in declines **When** Ana pays for 2 **Then** 502 payment-failed; movements sale −2 then sale_release +2; stock 10 | error-guess | integration | `tests/acceptance/M5/stock-release.test.ts::M5_AT_034` | red @ c1e3d70 |

## Edge cases

### Equivalence partitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-001 | FR-018 | both price_cents 1950 and margin_basis_points 5000 | 422 validation (openapi PriceChangeRequest oneOf; lld.md /problems/validation) | AT-011 |
| EDGE-002 | FR-019 | no reason | 422 validation (PriceChangeRequest requires reason) | AT-011 |
| EDGE-003 | FR-018 | a new price ($19.50) versus a margin (60%) | both set the price (FR-018; AE-016, AE-017) | AT-001, AT-002 |
| EDGE-017 | FR-018 | Dr. Lee (Maple Grove) changes Omega-3 | only Maple Grove's price changes (lld.md practice_prices keyed by practice) | AT-009 |
| EDGE-018 | FR-028 | a sent, unpaid order of 1 Vitamin D3 in the month | not counted as sold (FR-028 "units sold") | AT-022 |

### Boundary values

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-004 | FR-018 | margin 0% on Magnesium ($12.00 cost) | below the floor, lowest $12.09 (screens S5 Edge data: "0%: the floor error") | AT-012 |
| EDGE-005 | FR-018 | margin 99% on Magnesium | $1,200.00 (cost ÷ (1 − 0.99); lld.md BE-6.priceFromMargin) | AT-012 |
| EDGE-006 | FR-020 | $12.00 then $12.09 for Magnesium | refused, then accepted (AE-018; lld.md BE-6.lowestAllowedPriceCents) | AT-003 |
| EDGE-007 | FR-025 | quantity 2 with 2 in stock, then 3 | accepted, then refused with 2 available (AE-022) | AT-014 |
| EDGE-008 | FR-046 | unpaid 2 days 23 hours versus 4 days | only the 4-day order flagged (FR-046 "more than 3 days"; AE-043) | AT-024 |
| EDGE-009 | FR-047 | 4 Magnesium versus 3 Omega-3 | only Omega-3 flagged (FR-047 "3 units or fewer"; AE-044) | AT-025 |
| EDGE-010 | FR-037 | hold live versus ended one minute ago | held $60.00 versus current $62.00 with the notice (AE-035; SM-1 "hold ends") | AT-007 |

### State transitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-011 | FR-022 | a price change while Ana's order is in checkout | the held total stays $60.00 and no notice shows until the hold ends (FR-022 "not yet in checkout"; SM-1) | AT-007 |
| EDGE-012 | FR-018 | a change from a form that loaded at $18.00 after the price became $19.50 | 409 stale-price with current $19.50 (lld.md /problems/stale-price) | AT-008 |
| EDGE-013 | FR-024 | the price changes between checkout start and Pay | charged the held price (AE-021; INV-8) | AT-006 |
| EDGE-019 | FR-030 | a stock form that loaded at 8 after stock became 9 | 409 stale-stock with 9 (lld.md /problems/stale-stock) | AT-019 |

### Decision tables

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-015 | FR-022 | which prices an order shows: sent → current with notices; in checkout with a live hold → held; hold ended → current with notices | lld.md SM-1 state meanings; AE-020, AE-021, AE-035 | AT-005, AT-006, AT-007 |
| EDGE-020 | FR-028 | payout per product = line amount − line cost − line fee share | $36.00 → $17.73 and $18.00 → $8.86, total $26.59 (FR-028 with FR-069) | AT-022 |
| EDGE-021 | FR-047 | 0 units in stock: low stock or out of stock? | ⚠ FR-047 flags 3 or fewer, AttentionItem has an out_of_stock kind, and screens S6 shows "Omega-3 Fish Oil · out of stock" (→ Q-4) | not tested: ⚠ Q-4 open |

### Error guessing

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-023 | FR-026 | the payment stand-in declines after the stock was reserved | the 2 units come back: a sale_release movement; stock 10 (lld.md stock_movements.kind; FM-1) | AT-034 |
| EDGE-024 | FR-028 | month "2026-13" in the dashboard query | 422 validation (lld.md EP-29 errors) | not tested: input validation of a read-only query; no money or data at risk |
| EDGE-025 | FR-030 | a change of 0 units | 422 validation (StockAdjustmentRequest change not 0) | not tested: schema rule, no stock moves either way |
| EDGE-026 | FR-006 | the database fails after payment transaction 1 (a stuck processing attempt, review M4-pass2 R1) | the attempt closes as failed with no reason and the order stays as it was (lld.md FM-3) | not tested: no seam makes the database fail mid-payment through the API; the implementer's unit tests cover it (outside M5 scope, Q-1 pin list) |

### Concurrency, idempotency, double-submit

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-014 | FR-019 | one price change sent twice with one key | one history entry, the same reply twice (EP-28 Idempotency-Key required) | AT-010 |
| EDGE-027 | FR-026 | Ana and Ben pay for the last Omega-3 at the same moment | one succeeds, one refused uncharged (AE-024; INV-5; EC-7) | AT-016 |
| EDGE-028 | FR-030 | one stock adjustment sent twice with one key | one movement, stock 20 (EP-32 Idempotency-Key required) | AT-020 |
| EDGE-029 | FR-018 | two providers change one price at the same moment | one wins, the other gets 409 stale-price (lld.md /problems/stale-price; screens S5 Edge data) | not tested: AT-008 proves the check-and-set sequentially; a true race needs both requests inside one row lock, and a lost race only shows a stale-price message |
| EDGE-030 | FR-039 | 11 wrong passwords at the same moment | 10 × 401, 1 × 429 (EP-15 limit; review M4-pass5 R3) | AT-030 |
| EDGE-031 | FR-006 | 11 Pay presses at the same moment | 10 reach the order, 1 × 429 (SEC-9; review M4-pass7 R2) | AT-031 |

### Authorization and abuse

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-016 | FR-018 | Ana (patient) changes Omega-3's price | 403 forbidden, price unchanged (EP-28 auth: role provider) | AT-009 |
| EDGE-032 | FR-021 | the app's database user updates or deletes a price history entry | 42501 each time (INV-4 grants) | AT-004 |
| EDGE-033 | FR-038 | Dr. Chen records a stock adjustment | 403 forbidden, stock unchanged (AE-036; EP-32 role operations_specialist) | AT-018 |
| EDGE-034 | FR-028 | Ana opens the practice dashboard | 403 forbidden (EP-29 role provider) | AT-026 |
| EDGE-035 | FR-045 | Dr. Lee opens his orders list and dashboard | no Willow Creek orders, 0 Vitamin D3 sold (NFR-004; INV-7) | AT-026 |
| EDGE-036 | FR-066 | Dr. Chen cancels an order in a live checkout | 409 invalid-transition, still in_checkout (SM-1; review M4-pass6 R2) | AT-032 |

### Money, rounding, time zones

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-022 | FR-018 | 33.33% margin on a $9.00 cost | $13.50 (half-up of $13.4993; lld.md BE-6.priceFromMargin) | AT-013 |
| EDGE-037 | FR-069 | three $1.00 lines, 2c fee; and $18 / $24 / $30 with 54c | [1, 1, 0] and [14, 18, 22] (AE-066; ties to the earlier line, lld.md BE-6.allocateFee) | AT-027, AT-028 |
| EDGE-038 | FR-028 | an order paid at 23:59 on the month's last day in the practice's local time | ⚠ which time zone defines "October"? (→ Q-3) | not tested: ⚠ Q-3 open |
| EDGE-039 | FR-013 | a balanced split with a negative payout after a cost rise | review before any charge (D47) | AT-033 |
| EDGE-040 | FR-046 | "4 days" across a daylight-saving change | days counted as elapsed 24-hour periods (FR-046) | not tested: no money moves; the count is from timestamps, not local dates |

### Empty, huge and unicode data

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-041 | FR-028 | a product with no sales in the month | 0 sold, $0.00, $0.00 (screens S6 lists every product) | AT-022 |
| EDGE-042 | FR-045 | a practice with no orders in the month | an empty list (screens S6 Empty "No orders were sent in …") | AT-026 |
| EDGE-043 | FR-019 | a 200-character reason, then 201 | accepted, then 422 validation (PriceChangeRequest maxLength 200) | not tested: a schema bound; no money or data at risk |
| EDGE-044 | FR-037 | Ana's session ends during checkout and she signs in again within 30 minutes (EC-13) | the hold still applies (the hold lives on the order, `orders.prices_held_until`, not on the session) | not tested: AT-006 and AT-007 prove the hold is per order; the session is irrelevant to it |

## Edge-case coverage matrix

Every in-scope FR against every group: EDGE ids, or `n/a: <why>`. No blank cell.

| FR | partition | boundary | state | decision-table | error-guess | concurrency | authz | money-time | data-shape |
|---|---|---|---|---|---|---|---|---|---|
| FR-018 | EDGE-001, EDGE-003, EDGE-017 | EDGE-004, EDGE-005 | EDGE-012 | n/a: one rule (price or margin) | n/a: no outbound call | EDGE-029 | EDGE-016 | EDGE-022 | n/a: numbers only |
| FR-019 | EDGE-002 | n/a: no limit but reason length (EDGE-043) | n/a: append only | n/a: one rule | n/a: no outbound call | EDGE-014 | n/a: covered by FR-018 rows | n/a: no arithmetic | EDGE-043 |
| FR-020 | n/a: covered by FR-018 rows | EDGE-006 | n/a: no state | n/a: one rule | n/a: no outbound call | n/a: covered by FR-018 rows | n/a: covered by FR-018 rows | EDGE-006 | n/a: numbers only |
| FR-021 | n/a: one action | n/a: no limit | n/a: entries never change | n/a: one rule | n/a: no outbound call | n/a: no write path exists | EDGE-032 | n/a: no arithmetic | n/a: no input |
| FR-022 | n/a: covered by EDGE-015 | n/a: covered by FR-037 | EDGE-011 | EDGE-015 | n/a: no outbound call | n/a: read only | n/a: order access tested in M4 (AT-007 of M4) | n/a: totals covered by EDGE-015 | n/a: no input |
| FR-023 | n/a: one action | n/a: covered by FR-037 | EDGE-013 | EDGE-015 | n/a: no outbound call | n/a: repeat returns the same hold (M4) | n/a: tested in M4 | EDGE-013 | n/a: no input |
| FR-024 | n/a: one action | n/a: covered by FR-037 | EDGE-013 | EDGE-015 | n/a: no outbound call | EDGE-013 | n/a: tested in M4 | EDGE-013 | n/a: no input |
| FR-025 | n/a: covered by EDGE-007 | EDGE-007 | n/a: no state | n/a: one rule | n/a: no outbound call | n/a: send is idempotent (M4) | n/a: tested in M4 | n/a: units, not money | n/a: numbers only |
| FR-026 | n/a: covered by EDGE-027 | n/a: covered by EDGE-027 | n/a: covered by SM-2 rows | n/a: one rule | EDGE-023 | EDGE-027 | n/a: tested in M4 | n/a: no charge either way | n/a: no input |
| FR-027 | n/a: one action | n/a: covered by EDGE-027 | n/a: covered by EDGE-023 | n/a: one rule | EDGE-023 | EDGE-027 | n/a: no input | n/a: units, not money | n/a: no input |
| FR-028 | EDGE-018 | n/a: whole month | n/a: read only | EDGE-020 | EDGE-024 | n/a: read only | EDGE-034 | EDGE-038 | EDGE-041 |
| FR-029 | n/a: one value per product | n/a: covered by FR-047 | n/a: read only | n/a: one rule | n/a: read only | n/a: read only | n/a: covered by EDGE-034 | n/a: units, not money | n/a: covered by EDGE-041 |
| FR-030 | n/a: covered by EDGE-025 | EDGE-019 | EDGE-019 | n/a: one rule | EDGE-025 | EDGE-028 | EDGE-033 | n/a: units, not money | EDGE-025 |
| FR-037 | n/a: one rule | EDGE-010 | EDGE-010 | EDGE-015 | n/a: no outbound call | n/a: on read | n/a: tested in M4 | n/a: covered by EDGE-015 | EDGE-044 |
| FR-038 | n/a: one rule | n/a: no limit | n/a: no state | n/a: one rule | n/a: no outbound call | n/a: refusal only | EDGE-033 | n/a: units, not money | n/a: no input |
| FR-045 | n/a: one list | n/a: covered by pagination (lld.md) | n/a: read only | n/a: one rule | n/a: read only | n/a: read only | EDGE-035 | n/a: totals only | EDGE-042 |
| FR-046 | n/a: one rule | EDGE-008 | n/a: derived flag | n/a: one rule | n/a: read only | n/a: read only | n/a: covered by EDGE-034 | EDGE-040 | n/a: no input |
| FR-047 | n/a: one rule | EDGE-009 | n/a: derived flag | EDGE-021 | n/a: read only | n/a: read only | n/a: covered by EDGE-034 | n/a: units, not money | n/a: no input |
| FR-069 | n/a: one rule | EDGE-037 | n/a: no state | EDGE-037 | n/a: pure rule | n/a: pure rule | n/a: no access | EDGE-037 | n/a: numbers only |

## Silent-success guards

Ways a test could pass while the feature is wrong (`references/silent-success.md`), and how these tests stop it.

| SS | How a test could pass while the feature is wrong | Tests at risk | Guard used in those tests |
|---|---|---|---|
| SS-01 | only the status code is asserted, so an empty 200 or 201 stub passes | AT-001, AT-002, AT-017, AT-021 to AT-025 | exact prices, counts and labels are asserted and the persisted row is read fresh from the database; AT-001 and AT-002 use two different products and amounts (triangulation) |
| SS-02 | a refusal passes because the route does not exist yet (every unknown route is a 404) | AT-009, AT-018, AT-026 | the allowed twin (Dr. Chen's own change, Omar's adjustment, Dr. Chen's own list) succeeds first in the same test |
| SS-03 | a refusal is asserted only by status, so any 403 or 422 passes | AT-003, AT-008, AT-011, AT-012, AT-014, AT-015, AT-019 | `expectProblem` checks the problem type, and the extension values (lowestAllowedPriceCents 1209, currentPriceCents 1950, unitsAvailable [2], unitsInStock 9) are asserted |
| SS-04 | "nothing changed" is asserted by a count that is 0 because nothing was ever written | AT-003, AT-008, AT-011, AT-015 | history counts are asserted after a successful change in the same test (AT-003, AT-008) and price rows are read back |
| SS-05 | a concurrency test passes because the two requests ran one after the other | AT-016, AT-030, AT-031 | requests are fired together with Promise.all, and the exact split of outcomes (one 201 and one 422; 10 and 1) is asserted |
| SS-06 | a green pin passes whatever the code does | AT-014, AT-027 to AT-033 | each pin was run once against a throwaway copy with its rule removed, and every one failed (Red run) |

Laziest-stub check (reasoned test by test at step 7, not executed): 34 automated tests reasoned against a
hard-coded, always-200 and always-allow stub. Refusal or no-effect tests whose allowed twin runs first in the same
test (or that assert an exact refusal body): 14 of 14.

## NFR and SC checks

One row per in-scope NFR and per SC this milestone's Proves column claims.

| Id | Threshold (verbatim) | How measured | Level | When it runs | Status |
|---|---|---|---|---|---|
| NFR-001 | Each step of the order journey shows its result within 2 s at the 95th percentile at 60 requests per second. | load run against the deployed app (p95 of EP-21, EP-22, EP-23, EP-29), not a test assertion (timing asserts are flaky) | measurement | ship-milestone at G-live | planned: measured at G-live |
| NFR-003 | 100 % of price changes, stock adjustments and paid-order amounts are traceable to a person and a time. | AT-001 (price change names Dr. Maya Chen and a time), AT-017 (adjustment names Omar Ortega and a time) | integration | every M5 acceptance run | red @ c1e3d70 |
| NFR-004 | 0 people outside an order's patient, that patient's practice and the platform reviewers can see the order, and platform reviewers see it without the patient's identity. | AT-009, AT-023, AT-026 (another practice and a patient see nothing of Willow Creek's dashboard) | integration | every M5 acceptance run | red @ c1e3d70 |
| NFR-013 | 100 % of paid orders, their splits, and the price, stock and access histories are kept for at least 3 years. | AT-004 (the app user cannot delete a price history entry); the 3-year retention itself is a backup policy | integration and manual | every M5 acceptance run; retention reviewed at G-live | red @ c1e3d70 |
| NFR-014 | 100 % of privileged actions (role changes, stock adjustments, price changes, report exports) are logged with who acted and when, and reviewed by someone other than the actor. | AT-001, AT-017 (who and when); "reviewed by someone other than the actor" is an operations process, ⚠ not testable here (→ Q-6) | integration and manual | every M5 acceptance run | red @ c1e3d70 |

## Demo smoke

5-10 steps a person can do on the running app in under 10 minutes, with synthetic data: the P1 journey, one
unhappy path and one access-denied check. `ship-milestone` turns it into `scripts/smoke.sh`; `write-demo-script`
builds on it.

| # | Step (as a person does it) | Expected (what they see) | Re-checks |
|---|---|---|---|
| 1 | Sign in as Dr. Maya Chen and open Practice prices | "Practice prices · Willow Creek Wellness"; Omega-3 Fish Oil $30.00, "Default" | AT-001 |
| 2 | Change Omega-3's price with a 60% margin and the reason "new protocol pricing" | "Omega-3 Fish Oil is now $37.50. Orders not yet in checkout will show the new price."; a history line | AT-001, AE-016 |
| 3 | Try $12.00 for Magnesium Glycinate | the floor error naming $12.09; the price is unchanged | AT-003, AE-018 |
| 4 | Send Ana an order of 1 Omega-3, then change Omega-3 to $38.00; sign in as Ana and open the order | the notice "Omega-3 Fish Oil: $37.50 → $38.00" and the new total | AT-005, AE-020 |
| 5 | As Ana, continue to payment and pay | one receipt for the held total | AT-006 |
| 6 | Sign in as Dr. Chen and open the practice dashboard for this month | the sale, units sold and payout; Omega-3 one unit lower; "Low stock" when 3 or fewer | AT-021, AT-022, AT-025 |
| 7 | Unhappy path: as Omar Ortega, record a stock adjustment of −100 for Omega-3 | refused as not enough in stock; the count is unchanged | AT-019 |
| 8 | Access denied: as Dr. Chen, try to open Stock adjustments | not allowed; no adjustment form | AT-018, AE-036 |

## Red run

- Command: `out="${TMPDIR:-/tmp}/M5-acceptance-red.txt"; npx vitest run tests/acceptance/M5 >"$out" 2>&1; echo "exit=$? out=$out"`
- Run at: 2026-10-10 20:45 CDT on c1e3d70 (plus the uncommitted M5 test files) · exit code: 1
- Output file: `/var/folders/hy/jdyfzw1d74j_zxvpgy4bysm80000gp/T/M5-acceptance-red.txt`
- Runner summary: Test Files 3 failed, 1 passed (4) · Tests 26 failed, 8 passed (34)
- Single-test proof: `npx vitest run tests/acceptance/M5 -t 'M5_AT_002 '` → runs only M5_AT_002 (× M5_AT_002 …; 1 failed, 32 skipped), exit 1 · `npx vitest run tests/acceptance/M5 -t 'M5_AT_999 '` → exit 0 (33 skipped): ⚠ Q-5, vitest has no fail-on-empty option for `-t`
- Green pins (Q-1): AT-014, AT-027 to AT-033 pass today; with each guarded rule removed in a throwaway worktree (stock check at send, leftover fee cents, key release, sign-in limit 10, pay limit 10, cancel guard, D47 guard) all 8 failed: `Tests 8 failed | 25 skipped (33)`.

| AT | Test | Why it fails (assertion, or missing: <name from an approved artifact>) | First failing line |
|---|---|---|---|
| AT-001 | `M5_AT_001 a 60% margin on Omega-3 sets $37.50 …` | missing: PUT /api/practice/prices/{productId} (EP-28, openapi.yaml) | expected 404 to be 200 |
| AT-002 | `M5_AT_002 a new price of $19.50 …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-003 | `M5_AT_003 $12.00 for Magnesium Glycinate …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 422 /problems/below-price-floor, got 404 |
| AT-004 | `M5_AT_004 the app user cannot edit or delete a price history entry …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-005 | `M5_AT_005 a change before checkout shows …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-006 | `M5_AT_006 a change during checkout does not change what Ana pays …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-007 | `M5_AT_007 after the 30-minute hold ends …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-008 | `M5_AT_008 a change made from a stale form …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-009 | `M5_AT_009 a patient cannot change a price …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-010 | `M5_AT_010 the same change sent twice …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-011 | `M5_AT_011 both a price and a margin, or no reason …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 422 /problems/validation, got 404 |
| AT-012 | `M5_AT_012 a 99% margin gives $1,200.00 …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 422 /problems/below-price-floor, got 404 |
| AT-013 | `M5_AT_013 a 33.33% margin on Vitamin D3 …` | missing: PUT /api/practice/prices/{productId} (EP-28) | expected 404 to be 200 |
| AT-015 | `M5_AT_015 paying for 2 Vitamin D3 with 1 in stock is refused …` | assertion: the payment succeeds (no stock check at payment yet, BE-13) | expected 422 /problems/insufficient-stock, got 201 |
| AT-016 | `M5_AT_016 Ana and Ben pay for the last Omega-3 …` | assertion: both payments succeed | expected [ 201, 201 ] to deeply equal [ 201, 422 ] |
| AT-017 | `M5_AT_017 Omar adds 12 Vitamin D3 …` | missing: POST /api/ops/stock/{productId}/adjustments (EP-32) | expected 404 to be 201 |
| AT-018 | `M5_AT_018 Dr. Chen cannot record an adjustment …` | missing: POST /api/ops/stock/{productId}/adjustments (EP-32) | expected 404 to be 201 |
| AT-019 | `M5_AT_019 an adjustment from a stale count …` | missing: POST /api/ops/stock/{productId}/adjustments (EP-32) | expected 404 to be 201 |
| AT-020 | `M5_AT_020 the same adjustment sent twice …` | missing: POST /api/ops/stock/{productId}/adjustments (EP-32) | expected 404 to be 201 |
| AT-021 | `M5_AT_021 after Ana pays for 2 of 10 Vitamin D3 …` | missing: GET /api/practice/dashboard (EP-29) | expected 404 to be 200 |
| AT-022 | `M5_AT_022 two paid orders totalling 3 Vitamin D3 …` | missing: GET /api/practice/dashboard (EP-29) | expected 404 to be 200 |
| AT-023 | `M5_AT_023 the orders list shows Ana paid $60.00 …` | missing: GET /api/practice/orders (EP-30) | expected 404 to be 200 |
| AT-024 | `M5_AT_024 an order unpaid for 4 days is flagged …` | missing: GET /api/practice/dashboard (EP-29) | expected 404 to be 200 |
| AT-025 | `M5_AT_025 Omega-3 with 3 left is flagged …` | missing: GET /api/practice/dashboard (EP-29) | expected 404 to be 200 |
| AT-026 | `M5_AT_026 a patient cannot open the dashboard …` | missing: GET /api/practice/orders (EP-30) | expected 404 to be 200 |
| AT-034 | `M5_AT_034 a declined payment for 2 Vitamin D3 …` | missing: table stock_movements (lld.md §1) | error: relation "stock_movements" does not exist |

```text
 FAIL  tests/acceptance/M5/prices.test.ts > M5_AT_001 … AssertionError: expected 404 to be 200
 FAIL  tests/acceptance/M5/prices.test.ts > M5_AT_002 … AssertionError: expected 404 to be 200
 FAIL  tests/acceptance/M5/prices.test.ts > M5_AT_003 … expected 422 /problems/below-price-floor, got 404
 FAIL  tests/acceptance/M5/prices.test.ts > M5_AT_004 to M5_AT_010, M5_AT_013 … AssertionError: expected 404 to be 200
 FAIL  tests/acceptance/M5/prices.test.ts > M5_AT_011 … expected 422 /problems/validation, got 404
 FAIL  tests/acceptance/M5/prices.test.ts > M5_AT_012 … expected 422 /problems/below-price-floor, got 404
 FAIL  tests/acceptance/M5/stock-dashboard.test.ts > M5_AT_015 … expected 422 /problems/insufficient-stock, got 201
 FAIL  tests/acceptance/M5/stock-dashboard.test.ts > M5_AT_016 … expected [ 201, 201 ] to deeply equal [ 201, 422 ]
 FAIL  tests/acceptance/M5/stock-dashboard.test.ts > M5_AT_017 to M5_AT_020 … AssertionError: expected 404 to be 201
 FAIL  tests/acceptance/M5/stock-dashboard.test.ts > M5_AT_021 to M5_AT_026 … AssertionError: expected 404 to be 200
 FAIL  tests/acceptance/M5/stock-release.test.ts > M5_AT_034 … error: relation "stock_movements" does not exist
 Test Files  3 failed / 1 passed (4)
      Tests  26 failed / 8 passed (34)
$ npx vitest run tests/acceptance/M5 -t 'M5_AT_002 '   → × M5_AT_002 …  Tests 1 failed / 32 skipped (33)  exit 1
$ npx vitest run tests/acceptance/M5 -t 'M5_AT_999 '   → Tests 33 skipped (33)  exit 0
```

## Spec gaps and questions

Pass 1, 2026-10-10 20:32 CDT. One question at a time, each with a recommendation; at most 5 asked per pass, highest cost
of a wrong guess first. Unasked gaps stay here as ⚠.

| Q | Question | Recommended (and why) | Answer (verbatim) | Blocks | Status |
|---|---|---|---|---|---|
| Q-1 | May an M5 test that already passes today stay as a green pin, and do the M5-R02 regression tests for M4's review fixes go in this suite? | yes, each shown to fail when its rule is broken, because deleting money and stock tests would leave always-tested edges untested, and the M4 spec folder is frozen after merge | "yes" | AT-014, AT-027 to AT-033 | answered → PRD catch-up after G4 (none needed: process answer) |
| Q-2 | Does `make check` run the M5 acceptance tests while M5 is built? | no: each task's Done-when runs its own AT ids; the last M5 task adds `test-acceptance-m5` to `check` (the M4-T009 pattern), because progress tests would keep every task red | not asked | every AT | ⚠ open (→ G4) |
| Q-3 | Which time zone defines a dashboard month: UTC, or the practice's local time? | UTC until practices have a time zone (the data model has none), shown on the screen as "Times in UTC", because a guessed local zone would move late-evening sales between months | not asked | EDGE-038 | ⚠ open (→ G4) |
| Q-4 | At 0 units in stock, is the attention line "Low stock: 0 left" (FR-047) or "out of stock" (AttentionItem kind out_of_stock; screens S6 "Omega-3 Fish Oil · out of stock")? | out of stock, kind out_of_stock, because screens S6 already shows it and "0 left" reads as a glitch | not asked | EDGE-021 | ⚠ open (→ G4) |
| Q-5 | The single-test command exits 0 when no test matches (`-t 'M5_AT_999 '`), so a mistyped id in a Done-when would pass with zero tests. How should slice-tasks write Done-when lines? | append a count check: `npx vitest run tests/acceptance/M5 -t '<ids>' --reporter=verbose 2>&1 / grep -c '✓ M5_AT_'` must equal the number of ids, because vitest has no fail-on-empty option for `-t` | not asked | every task's Done-when | ⚠ open (→ G4) |
| Q-6 | NFR-014 says privileged actions are "reviewed by someone other than the actor". Who reviews price changes and stock adjustments, and where? | an operations review in M6 (the access log and finance views), recorded as a process, not a test, because no M5 screen shows another person's changes for review | not asked | NFR-014 | ⚠ open (→ G4) |

## Change log

| Date | Change | Ids | Why (approved artifact, or the human's exact words) |
|---|---|---|---|
| 2026-10-10 20:46 CDT | First draft | all | G1 prd.md@998ed94, G2 hld.md@fea2e18, G-ux screens.md@bff1dd4, G3 lld.md@9708841; Q-1 answered "yes" |
