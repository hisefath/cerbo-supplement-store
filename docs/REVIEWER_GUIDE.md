# Reviewer guide

This page is for someone checking the slice, not building it. Every claim below points at a file and line, a
decision (D-row), an acceptance test (M<N>_AT_###) or a review row. Anything not in the repo is marked "⚠ not built".

## Start here (10 minutes)

Read in this order. Stop when you have what you need.

| # | Read | Why | Time |
|---|---|---|---|
| 1 | [docs/README.md](README.md) | The index of every artifact. There is no root `README.md` (⚠ not built); `AGENTS.md` and this index stand in for it. | 1 min |
| 2 | [docs/product/prd.md](product/prd.md) | What the slice must do: FR-001 to FR-069. Its "Milestone cut" (prd.md:420) says which milestone built which FR. | 2 min |
| 3 | [docs/architecture/hld.md](architecture/hld.md) | The shape: one Nuxt app, one PostgreSQL 16 database (D33, D34). Invariants at hld.md:234. | 2 min |
| 4 | [docs/architecture/lld.md](architecture/lld.md) | Tables, services, endpoints. Invariants at lld.md:2632, test seams at lld.md:2677. | 2 min |
| 5 | Milestone reports: [M4](milestones/M4.md), [M5](milestones/M5.md), [M5.1](milestones/M5.1.md), [M5.2](milestones/M5.2.md), [M6](milestones/M6.md), [M6.1](milestones/M6.1.md) | What each milestone shipped and what it left open. | 1 min |
| 6 | [docs/decisions/DECISION_JOURNAL.md](decisions/DECISION_JOURNAL.md) and [docs/decisions/REVIEW.md](decisions/REVIEW.md) | Every D-row: what was chosen, what was rejected, who approved it. | 1 min |
| 7 | [docs/security/THREAT_MODEL.md](security/THREAT_MODEL.md) | What attacks the slice resists and which test proves each defence (written in M7, in parallel with this page). | 1 min |
| 8 | [docs/architecture/embedding-plan.md](architecture/embedding-plan.md) | How the slice would embed in Cerbo's EHR (written in M7, in parallel with this page). | — |
| 9 | Live app: <https://web-v2-production-6640.up.railway.app> | Try it. Accounts below. | — |

### Demo accounts

All synthetic, all on the reserved `example.test` domain (db/seed/demo.ts:18-26). They share one password. It is not
in the repo: the operator sets it as `DEMO_PASSWORD` when seeding (db/seed/demo.ts:2). Ask the operator for it.

| Email | Role | Practice |
|---|---|---|
| maya.chen@example.test | provider | Willow Creek |
| sam.lee@example.test | provider | Maple Grove |
| ana.ruiz@example.test | patient | Willow Creek |
| ben.ortiz@example.test | patient | Willow Creek |
| carla.diaz@example.test | patient | Maple Grove |
| omar.ortega@example.test | operations_specialist | — |
| sam.reyes@example.test | sre | — |
| dana.ito@example.test | data_analyst | — |
| fran.fields@example.test | finance_lead | — |

## What is stubbed and where the seam is

The assignment allows stand-ins with clean seams (prd.md C-3). These are the seams from lld.md:2677 (§9).

| Seam | What is real today | What is stubbed | Where to swap it | Test that uses it |
|---|---|---|---|---|
| SEAM-1 clock | system time | tests freeze and step it | server/services/clock.ts:4, `freezeClock` at clock.ts:7 | M5_AT_007 (checkout hold expiry, FR-037) |
| SEAM-2 random tokens | `crypto.randomBytes` (session.ts:3, messaging.ts:19) | not faked: tokens are stored only by hash (D72) | none | — |
| SEAM-3 payment provider | nothing: no real provider (⚠ not built) | BE-11 stub that moves no money; mode set by `PAYMENT_STUB_MODE` = succeed, decline or no_answer | server/services/payment-gateway.ts:1, :35 | M4_AT_005 (FR-007), M4_AT_031 and M4_AT_040 (FR-035) |
| SEAM-4 messaging | nothing: no email or text (⚠ not built) | a row in `notices` that holds only the practice name and a sign-in path | server/services/messaging.ts:1, `sendOrderNotice` at :15 | M4_AT_017 (FR-043, FR-044, LINV-5) |
| SEAM-5 signed-in person | real email + password sign-in with server sessions and a 15-minute idle limit (hld.md D36) | tests sign in a seeded account through the real endpoint | server/services/session.ts | M4_AT_032 to M4_AT_036 |
| SEAM-6 password hash cost | scrypt at production cost | low cost through `SCRYPT_COST` | server/services/session.ts:44 | used by every sign-in test |
| SEAM-7 uptime monitor | `/healthz` (server/routes/healthz.get.ts) | no outside monitor calls it (⚠ not built) | tests call `/healthz` with a frozen clock | M6_AT_034 to M6_AT_038 (FR-059) |

Not stubbed, not built: shipping and tax (out of scope, prd.md C-5), pricing campaigns and corrections (FR-016,
FR-033, FR-034, milestone "Later", prd.md:434). Never faked in tests: the PostgreSQL 16 engine and the money module
(lld.md §9, last line).

## Invariants and how each is enforced

From hld.md:234 (§7) and lld.md:2632 (§7). "Database" means PostgreSQL refuses the bad write even if the app code is
wrong. Test ids come from each spec's Traceability table, where the Covers column names the invariant.

| Id | Always true | Database layer | App layer | Tests |
|---|---|---|---|---|
| INV-1 | cost + payout + fee = amount paid, to the cent | `ck_orders_split_balances` (db/migrations/1760000001000_core-orders.sql:4) | `assertSplitBalances`, server/services/money.ts:82 | M4_AT_029, M6_AT_011 |
| INV-2 | an order is paid at most once | `uq_payment_attempts_one_success` (1760000002000_payments-ledger.sql:54) | idempotency keys, server/services/idempotency.ts | M4_AT_006, M4_AT_038 |
| INV-3 | every amount is whole cents | integer money columns in every migration | integer-only maths in server/services/money.ts | M4_AT_009 |
| INV-4 | paid amounts and all history are never changed or deleted | `tg_orders_paid_frozen` (core-orders.sql:5), `tg_order_lines_paid_frozen` (payments-ledger.sql:39); app user gets only SELECT, INSERT on `ledger_entries` (payments-ledger.sql:105), `price_changes` (1760000012000_price-changes.sql:22), `stock_movements` (1760000013000_stock-movements.sql:26), `access_log` (1760000014000_operations-access.sql:39) | no update or delete path in the services | M4_AT_026, M4_AT_027, M5_AT_004, M5_AT_044, M6_AT_027 |
| INV-5 | stock is never below zero | `ck_products_stock_nonneg` (core-orders.sql:45) | row lock before lowering, server/services/stock.ts:32 | M5_AT_015, M5_AT_016, M5_AT_019, M5_AT_034, M5_AT_036, M5_AT_038, M5_AT_039 |
| INV-6 | provider payout is never below $0.00 | `ck_orders_payout_nonneg` (core-orders.sql:4), at payment | checked at send (orders.ts:76) and price change (pricing.ts:67) | M4_AT_003, M4_AT_041, M5_AT_003, M5_AT_033 |
| INV-7 | a person sees only their own or their practice's orders; operations never see patient identity | composite FKs `fk_orders_provider_in_practice` (core-orders.sql:74) | one access check, server/services/access-policy.ts | M4_AT_007, M4_AT_025, M4_AT_043, M6_AT_004, M6_AT_007, M6_AT_013, M6_AT_039 |
| INV-8 | checkout pays the prices fixed at checkout start | `ck_orders_hold_when_in_checkout` (core-orders.sql:4) | prices copied to the order at checkout start (orders.ts:168) | M5_AT_006, M5_AT_035 |
| INV-9 | report totals equal the ledger | `ct_ledger_entries_balance` (payments-ledger.sql:100) | the report sums only `ledger_entries`, server/services/finance-report.ts:74 | M6_AT_010 |
| INV-10 | only the SRE changes operations roles, never their own | — (app only) | `assertCanChangeRole`, server/services/access-policy.ts:62 | M6_AT_019, M6_AT_020, M6_AT_029, M6_AT_032 |
| LINV-1 | an order's line fee shares add up to its fee | ⚠ not built: lld.md names `ct_order_lines_fee_shares_sum`, but no migration creates it; only `ck_order_lines_fee_share_nonneg` exists (core-orders.sql:95) | `allocateFee`, server/services/money.ts:29, called at payments.ts:44 | M5_AT_022, M5_AT_027, M5_AT_028 |
| LINV-2 | each paid order's ledger entries balance and match the order | `ct_ledger_entries_balance` (payments-ledger.sql:100) | written in the payment transaction | M4_AT_009, M4_AT_030 |
| LINV-3 | provider and patient belong to the order's practice | `fk_orders_provider_in_practice` and the patient FK (core-orders.sql:74) | `assertCanActOnPatient`, access-policy.ts:30 | M4_AT_008, M4_AT_022, M4_AT_044 |
| LINV-4 | at most one line per product | `uq_order_lines_order_product` (core-orders.sql:101) | repeats merged, orders.ts:44 | M4_AT_037 |
| LINV-5 | a notice never holds items or amounts | `notices` has no column for them | `Notice` type has only two fields, messaging.ts:9 | M4_AT_017 |
| LINV-6 | at most one payment in flight per order | `uq_payment_attempts_one_processing` (payments-ledger.sql:55) | in-flight key check, idempotency.ts | M4_AT_038 |

## How to verify

```bash
make setup          # npm ci
make db-test-up     # PostgreSQL 16 test database on localhost:54329
make check          # syntax, typecheck, unit tests, every acceptance suite (M4 to M6.1), decision views
npx vitest run tests/acceptance -t M4_AT_001        # one acceptance test by id
bash scripts/smoke.sh https://web-v2-production-6640.up.railway.app <expected-sha>   # live deploy: GET only, verified TLS
bash scripts/evidence-table.sh                      # regenerate the table below
```

`make check` is the one green/red gate (AGENTS.md, Makefile:12). The smoke script never signs in or creates data
(scripts/smoke.sh:6). The expected SHA is the commit the operator deployed (docs/runbooks/deploy.md).

## Evidence: every requirement to its tests

One row per FR in prd.md. Milestone comes from the PRD Milestone cut. Tests come from each
`specs/M*/acceptance.md` Traceability table. "⚠ none" means no acceptance test covers it; today those are only the
three "Later" FRs, which were never built. Regenerate with `bash scripts/evidence-table.sh` and paste the output
between the markers.

<!-- evidence:start -->
| FR | Requirement (shortened) | Milestone | Acceptance tests | Test files |
|---|---|---|---|---|
| FR-001 | When a provider starts an order for a patient of their practice,… | M4 | M4_AT_001, M4_AT_022 | `tests/acceptance/M4/send-order.test.ts` |
| FR-002 | When a provider adds a product and a quantity to an order,… | M4 | M4_AT_001, M4_AT_021, M4_AT_037 | `tests/acceptance/M4/send-order.test.ts` |
| FR-003 | If a provider tries to send an order with no items or… | M4 | M4_AT_002 | `tests/acceptance/M4/send-order.test.ts` |
| FR-004 | If an order's provider payout after the platform fee would be below… | M4 | M4_AT_003, M4_AT_041 | `tests/acceptance/M4/send-order.test.ts` |
| FR-005 | When a provider sends an order, the system shall show it to… | M4, M5.1 | M4_AT_004, M5.1_AT_004 | `tests/acceptance/M4/send-order.test.ts`, `tests/acceptance/M5.1/visual-language.test.ts` |
| FR-006 | When a patient confirms payment for an order in checkout, the system… | M4 | M4_AT_005, M4_AT_012, M4_AT_043, M5_AT_029, M5_AT_031, M5_AT_039, M5_AT_042 | `tests/acceptance/M4/pay-order.test.ts`, `tests/acceptance/M5/close-out.test.ts`, `tests/acceptance/M5/m4-regressions.test.ts` |
| FR-007 | The system shall label the payment step as a test payment that… | M4 | M4_AT_005 | `tests/acceptance/M4/pay-order.test.ts` |
| FR-008 | If a patient submits payment for an order that is already paid… | M4 | M4_AT_006, M4_AT_013, M4_AT_021, M5_AT_029 | `tests/acceptance/M4/pay-order.test.ts`, `tests/acceptance/M4/send-order.test.ts`, `tests/acceptance/M5/m4-regressions.test.ts` |
| FR-009 | If a person opens an order that belongs to neither them nor… | M4 | M4_AT_007, M4_AT_008, M4_AT_022, M4_AT_043, M4_AT_044 | `tests/acceptance/M4/pay-order.test.ts`, `tests/acceptance/M4/send-order.test.ts` |
| FR-010 | When an order is marked paid, the system shall record its split… | M4 | M4_AT_009 | `tests/acceptance/M4/pay-order.test.ts` |
| FR-011 | The system shall compute the platform fee once per order as 0.75%… | M4 | M4_AT_009, M4_AT_010, M4_AT_011, M4_AT_020, M4_AT_041 | `tests/acceptance/M4/pay-order.test.ts`, `tests/acceptance/M4/send-order.test.ts` |
| FR-012 | The system shall compute the provider payout as the amount paid minus… | M4 | M4_AT_009, M4_AT_011, M4_AT_020, M4_AT_041 | `tests/acceptance/M4/pay-order.test.ts`, `tests/acceptance/M4/send-order.test.ts` |
| FR-013 | If an order's item cost, provider payout and platform fee do not… | M4 | M4_AT_029, M5_AT_033 | `tests/acceptance/M4/audit-order.test.ts`, `tests/acceptance/M5/m4-regressions.test.ts` |
| FR-014 | When a platform reviewer opens a paid order, the system shall show… | M4 | M4_AT_014 | `tests/acceptance/M4/audit-order.test.ts` |
| FR-015 | If anyone tries to change or delete a paid order's recorded amounts,… | M4 | M4_AT_026, M4_AT_027 | `tests/acceptance/M4/audit-order.test.ts` |
| FR-016 | When a platform administrator records a correction to a paid order, the… | Later | ⚠ none | ⚠ none |
| FR-017 | The system shall start every product at a default patient price of… | M4 | M4_AT_015 | `tests/acceptance/M4/send-order.test.ts` |
| FR-018 | When a provider submits the price-change form with either a new price… | M5, M5.1 | M5.1_AT_002, M5.1_AT_004, M5_AT_001, M5_AT_002, M5_AT_008, M5_AT_009, M5_AT_011, M5_AT_012, M5_AT_013, M5_AT_043 | `tests/acceptance/M5.1/visual-language.test.ts`, `tests/acceptance/M5/close-out.test.ts`, `tests/acceptance/M5/prices.test.ts` |
| FR-019 | When a practice's price for a product changes, the system shall add… | M5 | M5_AT_001, M5_AT_008, M5_AT_010, M5_AT_011 | `tests/acceptance/M5/prices.test.ts` |
| FR-020 | If a submitted price would leave the provider a payout below $0.00… | M5 | M5_AT_003, M5_AT_012 | `tests/acceptance/M5/prices.test.ts` |
| FR-021 | If anyone tries to edit or delete a price history entry, then… | M5 | M5_AT_004 | `tests/acceptance/M5/prices.test.ts` |
| FR-022 | When an item's price changes while an order containing it is not… | M5 | M5_AT_005, M5_AT_007, M5_AT_041 | `tests/acceptance/M5/close-out.test.ts`, `tests/acceptance/M5/prices.test.ts` |
| FR-023 | When a patient starts checkout, the system shall fix every item's price… | M5 | M5_AT_006, M5_AT_040 | `tests/acceptance/M5/close-out.test.ts`, `tests/acceptance/M5/prices.test.ts` |
| FR-024 | While an order is in checkout, when its practice's price for an… | M5 | M5_AT_006, M5_AT_035 | `tests/acceptance/M5/prices.test.ts`, `tests/acceptance/M5/stock-release.test.ts` |
| FR-025 | If a provider adds more units of a product than are in… | M5 | M5_AT_014 | `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-026 | If a patient pays for an order whose items are no longer… | M5 | M5_AT_015, M5_AT_016, M5_AT_034, M5_AT_036, M5_AT_038 | `tests/acceptance/M5/stock-dashboard.test.ts`, `tests/acceptance/M5/stock-release.test.ts` |
| FR-027 | When an order is marked paid, the system shall reduce each product's… | M5 | M5_AT_021, M5_AT_034, M5_AT_036, M5_AT_039, M5_AT_040 | `tests/acceptance/M5/close-out.test.ts`, `tests/acceptance/M5/stock-dashboard.test.ts`, `tests/acceptance/M5/stock-release.test.ts` |
| FR-028 | When a provider opens the practice dashboard for a chosen period, the… | M5, M5.1 | M5.1_AT_002, M5.1_AT_004, M5_AT_022, M5_AT_026 | `tests/acceptance/M5.1/visual-language.test.ts`, `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-029 | The system shall show the current units in stock for each product… | M5 | M5_AT_021 | `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-030 | When a platform staff member records a stock adjustment with a quantity… | M5, M5.1 | M5.1_AT_002, M5.1_AT_004, M5_AT_017, M5_AT_019, M5_AT_020, M5_AT_044 | `tests/acceptance/M5.1/visual-language.test.ts`, `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-031 | The system shall record on every order its practice, provider, time sent… | M4 | M4_AT_001, M4_AT_028 | `tests/acceptance/M4/pay-order.test.ts`, `tests/acceptance/M4/send-order.test.ts` |
| FR-032 | When a platform reviewer opens the volume report for a month, the… | M6 | M6_AT_001, M6_AT_006, M6_AT_009 | `tests/acceptance/M6/platform-health.test.ts` |
| FR-033 | Where pricing campaigns are offered, the system shall let a platform administrator… | Later | ⚠ none | ⚠ none |
| FR-034 | Where a campaign price leaves the provider payout below $0.00, the system… | Later | ⚠ none | ⚠ none |
| FR-035 | If the payment step fails or does not answer, then the system… | M4 | M4_AT_031, M4_AT_040 | `tests/acceptance/M4/pay-failure.test.ts` |
| FR-036 | The system shall record each paid line's unit cost as it stood… | M4 | M4_AT_014, M4_AT_024 | `tests/acceptance/M4/audit-order.test.ts` |
| FR-037 | When 30 minutes pass after a patient started checkout without paying, the… | M5 | M5_AT_007, M5_AT_035, M5_AT_041, M5_AT_042 | `tests/acceptance/M5/close-out.test.ts`, `tests/acceptance/M5/prices.test.ts`, `tests/acceptance/M5/stock-release.test.ts` |
| FR-038 | If a provider tries to record a stock adjustment, then the system… | M5 | M5_AT_018 | `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-039 | When a person signs in with their own account, the system shall… | M4, M5.2, M6.1 | M4_AT_032, M4_AT_035, M5.1_AT_005, M5.2_AT_001, M5.2_AT_002, M5.2_AT_003, M5.2_AT_004, M5.2_AT_005, M5.2_AT_006, M5_AT_030, M6.1_AT_001, M6.1_AT_002, M6.1_AT_003, M6.1_AT_004, M6_AT_030 | `tests/acceptance/M4/sign-in.test.ts`, `tests/acceptance/M5.1/visual-language.test.ts`, `tests/acceptance/M5.2/landing.test.ts`, `tests/acceptance/M5.2/sign-out.test.ts`, `tests/acceptance/M5/m4-regressions.test.ts`, `tests/acceptance/M6.1/patient-orders.test.ts`, `tests/acceptance/M6/roles.test.ts` |
| FR-040 | If someone who is not signed in opens an order, price, stock… | M4 | M4_AT_033 | `tests/acceptance/M4/sign-in.test.ts` |
| FR-041 | When a signed-in person has been inactive for 15 minutes, the system… | M4 | M4_AT_034, M5.2_AT_006 | `tests/acceptance/M4/sign-in.test.ts`, `tests/acceptance/M5.2/sign-out.test.ts` |
| FR-042 | When a patient signs in after opening an order notice, the system… | M4 | M4_AT_036 | `tests/acceptance/M4/sign-in.test.ts` |
| FR-043 | When a provider sends an order, the system shall send the patient… | M4 | M4_AT_017 | `tests/acceptance/M4/send-order.test.ts` |
| FR-044 | The system shall leave item names, quantities, amounts and health details out… | M4 | M4_AT_017 | `tests/acceptance/M4/send-order.test.ts` |
| FR-045 | When a provider opens the practice dashboard, the system shall list the… | M5, M5.1 | M5.1_AT_004, M5_AT_023, M5_AT_026, M5_AT_037, M5_AT_043 | `tests/acceptance/M5.1/visual-language.test.ts`, `tests/acceptance/M5/close-out.test.ts`, `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-046 | While a practice's order has been sent and unpaid for more than… | M5 | M5_AT_024, M5_AT_037 | `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-047 | While a product has 3 units or fewer in stock, the system… | M5 | M5_AT_025 | `tests/acceptance/M5/stock-dashboard.test.ts` |
| FR-048 | When platform staff open the platform health dashboard for a period, the… | M6 | M6_AT_002, M6_AT_005, M6_AT_006 | `tests/acceptance/M6/platform-health.test.ts` |
| FR-049 | While a health measure is past its alert line, the system shall… | M6 | M6_AT_003 | `tests/acceptance/M6/platform-health.test.ts` |
| FR-050 | The system shall show platform staff an order number in place of… | M4 | M4_AT_023, M4_AT_025 | `tests/acceptance/M4/audit-order.test.ts` |
| FR-051 | The system shall let only the finance lead run and export financial… | M6 | M6_AT_016 | `tests/acceptance/M6/financial-report.test.ts` |
| FR-052 | The system shall let only the operations specialist work the review list… | M6 | M6_AT_040, M6_AT_041, M6_AT_042 | `tests/acceptance/M6/review-and-stock.test.ts` |
| FR-053 | The system shall show the data analyst totals on the health dashboard… | M6 | M6_AT_004, M6_AT_007, M6_AT_008 | `tests/acceptance/M6/platform-health.test.ts` |
| FR-054 | When the SRE grants or removes an operations role, the system shall… | M6 | M6_AT_018, M6_AT_021, M6_AT_022, M6_AT_023, M6_AT_024, M6_AT_025, M6_AT_026, M6_AT_028, M6_AT_029 | `tests/acceptance/M6/roles.test.ts` |
| FR-055 | If anyone other than the SRE tries to grant or remove an… | M6 | M6_AT_019, M6_AT_025 | `tests/acceptance/M6/roles.test.ts` |
| FR-056 | If the SRE tries to grant or remove a role on their… | M6 | M6_AT_020 | `tests/acceptance/M6/roles.test.ts` |
| FR-057 | When the finance lead opens the access log for a period, the… | M6 | M6_AT_031, M6_AT_032, M6_AT_033 | `tests/acceptance/M6/access-log.test.ts` |
| FR-058 | If an operations person opens a page or action their role does… | M5.2, M6 | M5.2_AT_004, M6_AT_008, M6_AT_016, M6_AT_021, M6_AT_028, M6_AT_030, M6_AT_032, M6_AT_038, M6_AT_039, M6_AT_041 | `tests/acceptance/M5.2/landing.test.ts`, `tests/acceptance/M6/access-log.test.ts`, `tests/acceptance/M6/financial-report.test.ts`, `tests/acceptance/M6/platform-health.test.ts`, `tests/acceptance/M6/review-and-stock.test.ts`, `tests/acceptance/M6/roles.test.ts`, `tests/acceptance/M6/system-health.test.ts` |
| FR-059 | When the SRE opens system health for a period, the system shall… | M6 | M6_AT_034, M6_AT_035, M6_AT_036, M6_AT_037, M6_AT_038 | `tests/acceptance/M6/system-health.test.ts` |
| FR-060 | When the finance lead runs the financial report for a period, the… | M6 | M6_AT_010, M6_AT_015, M6_AT_017 | `tests/acceptance/M6/financial-report.test.ts` |
| FR-061 | The system shall show on the financial report whether patient payments equal… | M6 | M6_AT_011, M6_AT_014 | `tests/acceptance/M6/financial-report.test.ts` |
| FR-062 | The system shall show revenue on the financial report two ways, each… | M6 | M6_AT_012 | `tests/acceptance/M6/financial-report.test.ts` |
| FR-063 | When the finance lead exports the financial report, the system shall produce… | M6 | M6_AT_007, M6_AT_013, M6_AT_017 | `tests/acceptance/M6/financial-report.test.ts`, `tests/acceptance/M6/platform-health.test.ts` |
| FR-064 | When the finance lead runs the financial report, the system shall list… | M6 | M6_AT_010 | `tests/acceptance/M6/financial-report.test.ts` |
| FR-065 | If a period's totals do not balance to the cent, then the… | M6 | M6_AT_014 | `tests/acceptance/M6/financial-report.test.ts` |
| FR-066 | When a provider cancels a sent or payment-failed order, the system shall… | M4 | M4_AT_018, M4_AT_042, M4_AT_044, M5_AT_032 | `tests/acceptance/M4/pay-failure.test.ts`, `tests/acceptance/M4/send-order.test.ts`, `tests/acceptance/M5/m4-regressions.test.ts` |
| FR-067 | If a provider tries to cancel an order whose checkout has started… | M4 | M4_AT_019, M5_AT_032 | `tests/acceptance/M4/send-order.test.ts`, `tests/acceptance/M5/m4-regressions.test.ts` |
| FR-068 | If anyone tries to change the items or quantities of a sent… | M4 | M4_AT_039 | `tests/acceptance/M4/send-order.test.ts` |
| FR-069 | The system shall share each paid order's one platform fee across its… | M5 | M5_AT_022, M5_AT_027, M5_AT_028 | `tests/acceptance/M5/stock-dashboard.test.ts` |
<!-- evidence:end -->
