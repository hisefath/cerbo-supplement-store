# Verifier review — M4 pass 2

- Date: 2026-10-10 · Diff: `.handoff/reviews/M4-diff.patch` (11 files; this pass covers M4-T002 only, on top of merged M4-T001) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.handoff/reviews/M4-diff.patch`, `specs/M4-tracer-bullet/tasks/T002.md` (plus the T003 header and Ask for scope), `specs/M4-tracer-bullet/acceptance.md` (searched for the FR-013, AT-012, AT-029, Q-2 and out-of-scope lines), `tests/acceptance/M4/pay-order.test.ts`, `tests/acceptance/M4/audit-order.test.ts`, `tests/acceptance/support/app.ts` (stub wiring only), `docs/architecture/lld.md` (§1 orders, order_lines, payment_attempts, ledger_entries and DB invariants; §2 BE-6, BE-9, BE-10, BE-11; SEQ-2; SM-1; SM-2; §7; §8 FM table; §9; ST-4), `docs/architecture/contracts/openapi.yaml` (EP-22, EP-23, Checkout, Receipt), `docs/design/screens.md` S2 (copy and states), `docs/product/prd.md` and `docs/decisions/DECISION_JOURNAL.md` (searched only), and for context the worktree files `server/services/money.ts`, `access-policy.ts`, `catalog.ts#currentPrices`, `server/utils/problem.ts`, `db/migrations/1760000001000_core-orders.sql`, `Makefile`, plus `.handoff/reviews/M4-pass1.md`
- Tooling note: this session had no Grep or Glob tool. I used Bash only for read-only `grep`, `sed -n`, `ls` and `wc`. I ran nothing and edited nothing.

## Findings

No tests-that-lie findings. I checked `tests/unit/payments.test.ts`: every expected value comes from AE-009, AE-010 or AE-011, or from the LLD tie rule. Nothing mocks the system under test. Nothing is skipped and no assertion is constant. The env var is restored in `afterEach`. The file is inside `make check`'s `vitest run --dir tests/unit`. The diff does not touch `tests/acceptance/**`.

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | correctness | P2 | med | server/services/payments.ts:99 | Transaction 1 commits a `processing` attempt. After that, any throw before transaction 2 commits leaves the attempt stuck at `processing` for good. The throws are: the gateway's config error, a DB error in tx2, or tx2's `invalid-transition` when the order left `in_checkout`. `uq_payment_attempts_one_processing` then turns every later Pay on that order into a unique-violation 500. With a real provider, the charge would be taken while the order stays unpaid. FM-7 reconcile (SM-2 "abandoned" transition) is not assigned to any M4 task; T003 covers only decline, no-answer and locking. | `const result = await charge({ orderId, amountCents: split.amountPaidCents, idempotencyKey })` (no try/finally) · :137 `if (!paid) throw new ProblemError('invalid-transition')` · migration:55 `create unique index uq_payment_attempts_one_processing … where status = 'processing'` | file (give FM-7 an owner) |
| R2 | spec-fidelity | P2 | high | server/services/payments.ts:82 | This adds a transition no artifact approves. A balanced split whose payout is negative (for example after `products.unit_cost_cents` rises between send and pay) moves the order to `needs_review`. That state is terminal, so the patient can never pay. SM-1's guard for `needs_review` is "split doesn't balance", and INV-6 is placed on `ck_orders_payout_nonneg`. PRD FR-034 (Later) says the platform absorbs a below-zero payout. No test covers the path. The choice is safer than charging and then hitting the CHECK, but it needs a recorded decision. | `// ponytail: a negative payout would be refused by ck_orders_payout_nonneg after charging; review it before.` / `if (split.providerPayoutCents < 0) throw new SplitMismatch(split)` · lld.md SM-1 row "split mismatch … split doesn't balance" | keep, pending a D-id |
| R3 | spec-fidelity | P3 | high | server/services/payments.ts:80 | The app-level half of FR-013 / AE-012 ("stays unpaid and appears on the review list") cannot run. `computeSplit` derives the payout as the residual, so the integer-only `assertSplitBalances` can never throw. Only R2's branch reaches `needs_review`. AT-029 proves the refusal at the DB, where status stays `sent`, not `needs_review`. Acceptance Q-2 accepts DB-only proof, so this is a note for the coverage record. | :40 `providerPayoutCents: payoutCents(amountPaidCents, itemCostCents, fee)` · :80 `assertSplitBalances(split)` · audit-order.test.ts:157 `expect(still[0].status).toBe('sent')` | keep |
| R4 | spec-fidelity | P3 | med | server/services/payments.ts:116 | Transaction 2 departs from SEQ-2 step 13 and SM-2 in two ways. First, it does not lock the order first: it updates `order_lines`, then the order, which is the reverse of `startCheckout`'s order→lines lock order and so could deadlock in rare cases. Second, the attempt's status updates are not conditional on `status = 'processing'`, although SM-2 says "Enforced in: BE-10.pay with conditional updates". This matters once T003/FM-7 can change an attempt concurrently. | :116 `for (const [i, l] of lines.entries()) { await trx.updateTable('order_lines')…` before :123 `updateTable('orders')` · :158 `.set({ status: 'succeeded', … }).where('id', '=', attemptId)` · :104-107 same for `failed` | file (T003 owns payments.ts) |
| R5 | security | P3 | med | db/migrations/1760000002000_payments-ledger.sql:104 | The app user can UPDATE any `payment_attempts` row, including succeeded ones. That covers `status` and `amount_cents`, and nothing in the DB freezes a `succeeded` attempt. Flipping a succeeded attempt away from `succeeded` would void `uq_payment_attempts_one_success` (INV-2) for that order. This is within the LLD's Q-3 grant list (the table is not a "history" table), but unlike orders and ledger, it is unguarded. | `grant select, insert, update on payment_attempts to supplements_app;` | file |
| R6 | correctness | P3 | low | app/components/checkout/CheckoutStep.vue:63 | FE-8 throws away the Idempotency-Key after every server problem except offline, including `internal` (FM-3) and `idempotency-in-flight`. LLD FM-3 says a retry after a DB failure reuses the same key ("BE-5.release lets the patient retry the same key"). A new key after an in-flight 409 would race the first attempt. INV-2 still prevents a double charge. | `else if (problem.value?.type && problem.value.type !== '/problems/offline') key.value = null` | file (revisit with T003's BE-5) |
| R7 | spec-fidelity | P3 | high | app/components/checkout/CheckoutStep.vue:81 | Loading state differs from S2. "Processing your payment…" shows at once, but screens.md S2 says the progress line appears after 1 s. The "Continue to payment" step shows no progress line at all. | `<p v-if="busy" role="status">{{ slow ? … : 'Processing your payment…' }}</p>` · screens.md:295 "after 1 s a progress line; after 10 s an explanation" | file |

No security findings beyond R5. Checked:
- EP-22 and EP-23 call `requireViewer` before any work.
- The order id is checked with `^\d{1,18}$`.
- `assertIsOrderPatient` runs before any status check, so non-owners and unknown ids both get 404.
- Idempotency-Key is required and capped at 255 characters (422 validation, as in openapi).
- Queries are parameterised through Kysely.
- No secrets or PHI in code or tests.
- `failure_reason` holds only `declined` or `no_answer`.
- `ledger_entries` is INSERT/SELECT only for the app.
- Paid orders and lines are frozen by triggers, and the app has no DELETE grant from T001.

No simplicity findings. Checked: no new abstractions; `SplitLine` and `computeSplit` are exported for the unit test only; every path is inside T002 `Owns:`; no dependency or lockfile change; stock is untouched (D42).

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-006 / AE-005 | server/api/orders/[orderId]/payments.post.ts:7-19, server/services/payments.ts:46-175, CheckoutStep.vue, ReceiptView.vue | pay-order.test.ts M4_AT_005 | covered (API); the UI is untested until T005 mounts FE-8 and FE-9 |
| FR-007 | payment-gateway.ts:12-24 (stub), Receipt `is_test_payment: true` (payments.ts:173), CheckoutStep.vue:80, ReceiptView.vue:40 | M4_AT_005 (`is_test_payment`), tests/unit/payments.test.ts (stub modes) | covered (label text untested until T005) |
| FR-009 (pay/checkout) | access-policy.ts:41-43, orders.ts:136, payments.ts:58 | M4_AT_043 | covered |
| FR-010 / AE-009 | payments.ts:29-44, :123-157 (order split + four ledger lines) | M4_AT_009; unit AE-009 | covered |
| FR-011 / AE-010 / AE-011 | money.ts `platformFeeCents` (T001), payments.ts:34 | M4_AT_010, M4_AT_011; unit AE-010, AE-011, three-$1.00 case | covered |
| FR-012 | payments.ts:40 | M4_AT_009, M4_AT_011 | covered |
| FR-013 / AE-012 | migration:10-11 `ck_orders_split_balances`, payments.ts:79-88 | audit-order.test.ts M4_AT_029 (DB only) | partial (R3; app path unreachable/untested, R2) |
| FR-015 / AE-014 | migration:16-28 `tg_orders_paid_frozen`, :30-40 `tg_order_lines_paid_frozen` | M4_AT_026 | covered |
| FR-031 / AE-028 | payments.ts:127 (`paid_at`), T001 `sent_at`/practice/provider | M4_AT_028 | covered |
| LINV-2 / INV-9 (ct_ledger_entries_balance) | migration:74-101 | M4_AT_030 | covered |
| Q-3 / INV-4 grants | migration:104-105 (+ T001 grants) | M4_AT_027 | covered |
| SM-1 pay-before-checkout (AT-012) | payments.ts:59 | M4_AT_012 | covered |
| EP-22 startCheckout | checkout.post.ts:7-12, orders.ts:125-167 | every pay AT through `checkoutAndPay` (expects 200) | covered (re-hold of an expired `in_checkout` order, orders.ts:150, untested; FR-037 is out of M4) |
| BE-11 SEAM-3 modes | payment-gateway.ts:12-24 | tests/unit/payments.test.ts | covered (the 10 s no-answer timeout is T003) |
| Other M4 AEs (AE-001 to AE-004, AE-006 to AE-008, AE-013, AE-015, AE-031, AE-032, AE-037 to AE-041, AE-047, AE-063 to AE-065) | owned by M4-T001 or T003 to T009 | — | out of this pass's scope |

## Not reviewed

- Running anything: no `make check`, no acceptance run, no migration up/down against PostgreSQL 16. Trigger behaviour, for example `OLD` on INSERT in `order_lines_paid_frozen` and the per-row deferred ledger trigger, was judged by reading only.
- `tests/acceptance/M4/pay-failure.test.ts` and the AT-006, AT-013 and AT-038 behaviour: assigned to M4-T003.
- `server/utils/problem.ts` `console.error('unexpected error', instance, err)`: not in this diff. A PostgreSQL CHECK error raised by the new constraints carries "Failing row contains" with amounts. Worth checking against NFR-010 in a later pass.
- `docs/architecture/hld.md`: not read (trust boundaries were taken from the LLD's BE-4 and §7).
- PRD and Decision Journal: searched only, not read in full.
- Worker self-reports (`.handoff/runs/**`, result.md): not read, and none was quoted in the prompt.
