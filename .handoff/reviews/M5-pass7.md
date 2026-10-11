# Verifier review — M5 pass 7

- Date: 2026-10-10 23:52 CDT · Diff: `.handoff/reviews/M5-diff.patch` (54 files) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: .handoff/reviews/M5-diff.patch; .handoff/reviews/M5-pass1.md to M5-pass6.md (row lists, to avoid repeats); specs/M5-prices-and-stock/tasks/T007.md to T010.md; specs/M5-prices-and-stock/acceptance.md (AT table, AT-042 delta); specs/bugs/pay-after-hold-ended-says-already-paid.md; tests/acceptance/M5/close-out.test.ts; tests/unit/order-notices.test.ts (T007 delta); docs/architecture/lld.md (BE-9, BE-10, BE-13, EP-20 to EP-23, FE-8, FE-15, SM-1, SM-2, FM-7, problem registry, Q-8); docs/architecture/contracts/openapi.yaml (OrderView, Me, EP-23 problems); docs/design/screens.md (S2, S6, S7 states and microcopy); server/services/{payments,orders,idempotency,stock-adjustments}.ts; server/api/orders/[orderId]/{payments,checkout}.post.ts; server/api/ops/stock/[productId]/adjustments.post.ts; app/pages/orders/[orderId].vue; app/components/checkout/CheckoutStep.vue; app/components/ProblemMessage.vue; app/pages/practice/dashboard.vue; app/pages/ops/stock.vue; app/components/ops-stock/ChangeForm.vue; `git show --name-only` of the close-out commits (3d759da, 0b79027, 84e7087, 12acb25, 635d015) for Owns.
- Focus of this pass: the close-out tasks T007 to T010, the bug fix 84e7087, and how they interact with the payment, stock and hold paths from T002 and T003. Rows already filed in pass 1 to 6 are not repeated unless the close-out left them wrong.

## Findings

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | tests-that-lie | P1 | high | tests/acceptance/M5/close-out.test.ts:99-111 | AT-042 is a QA-owned acceptance test, but it was added by the same fix-bug commit that changed `payments.ts` to make it pass (84e7087: payments.ts, acceptance.md, close-out.test.ts, the bug file). Nobody independent wrote it before the fix. The test itself looks sound: it asserts 409 checkout-expired, no attempt, no stock movement, and stock still 10, with a working twin case. Separately, CLAUDE.md's Fix track excludes payment changes ("no API/data/dep/auth/payment/migration change"), and this fix changes BE-10.pay's answer. | commit 84e7087 touches `server/services/payments.ts` and `tests/acceptance/M5/close-out.test.ts` together; acceptance.md history row "2026-10-10 23:37 CDT \| Bug repro … \| STANDING approval" | fix (have define-acceptance confirm AT-042 as QA's own, and record that a payment change went through the Fix track) |
| R2 | correctness | P1 | high | app/components/checkout/CheckoutStep.vue:89; server/services/payments.ts:113 | After the FM-7 reconcile that T007 added to Pay, the patient is told her order is paid when it is not. Path: an abandoned attempt makes `pay` reconcile the order to `payment_failed`, transaction 1 then answers 409 invalid-transition (AT-039 pins this), and FE-8 shows "This order is already paid." No money was taken. Pressing Pay again repeats the message, because the order is `payment_failed`, not `in_checkout`. The order page has no `payment_failed` line either ([orderId].vue:59-61). FM-7 says the patient sees "the order shows payment failed; 'Try again'". This is the same symptom the bug fix 84e7087 fixed, on a sibling path that fix did not cover. The problem carries no `from`/`event` members (lld.md Q-8 unresolved), so FE-8 cannot tell "already paid" apart from "payment failed". | `'invalid-transition': 'This order is already paid.',` · payments.ts:113 `if (o.status !== 'in_checkout') throw new ProblemError('invalid-transition')` · lld.md FM-7 "the order shows payment failed; \"Try again\"" | fix |
| R3 | spec-fidelity | P2 | high | app/components/checkout/CheckoutStep.vue:84-93 | When an item sells out at Pay (FR-026, new in M5 through T002's reserve), the patient gets the provider's copy. CheckoutStep passes no `insufficient-stock` copy and no `names`, so ProblemMessage falls back to "Only N in stock. Lower the quantity." The patient has no way to lower a quantity, and the message never says nothing was charged. S2 Error copy is "Omega-3 Fish Oil sold out before you paid. Nothing was charged. Contact your practice to change your order." | ProblemMessage.vue:26-27 ``case 'insufficient-stock': return `Only ${…} in stock. Lower the quantity.` ``; CheckoutStep `:copy` has no `'insufficient-stock'` key | fix |
| R4 | spec-fidelity | P3 | high | app/pages/practice/dashboard.vue:13-17, 122, 148 | The S6 title, heading and wrong-role copy never name the practice. They read `practice_name` from the `viewer` data (AppShell's `/api/session`), and the `Me` schema has only `practice_id`. So the "Practice dashboard · <name>" branch never runs, and T010's Done-when grep passes on a string in that dead branch. T010 allowed this outcome ("write the question in result.md instead of adding an API field"), but S6 is still not met. pass1 R3 is the same gap on S5. | `const practiceName = computed(() => viewer.value?.practice_name ?? '')`; openapi `Me` properties: user_id, display_name, role, practice_id, idle_expires_at | file (one contract decision for S5 and S6) |
| R5 | spec-fidelity | P3 | high | app/pages/practice/dashboard.vue:170 | The first-use empty copy shows whenever the current month has no orders, even for a practice with orders in earlier months. S6 keeps "First use: the practice has no orders yet" apart from "Filtered: no orders in the chosen month". | `shownMonth === thisMonth ? "No orders yet. Send one from a patient's chart." : \`No orders were sent in ${monthName}.\`` | file |
| R6 | correctness | P3 | med | server/services/orders.ts:153-175 (with :268) | Starting checkout while a payment is still in flight and the hold has passed puts new prices on the order while the charge runs at the old ones. T007's reconcile leaves the order `in_checkout` (attempt under 2 min, `if (attempt \|\| !o.hold_over) return`). `startCheckout` then sees `hold_live` false, copies today's prices into `held_unit_price_cents`, and sets a new 30-minute hold. Meanwhile the gateway charges transaction 1's total. Money stays consistent: `recordPayment` writes paid prices and the split from transaction 1's lines. But EP-21 shows a held total that can differ from the amount being charged, against the R3 intent that "a payment in flight keeps the hold". A second Pay then fails on LINV-6 and shows R2's "already paid" text. | `if (o.status === 'in_checkout' && o.hold_live) { return … }` then `updateTable('order_lines').set({ held_unit_price_cents: held })` with no check for a processing attempt | file |

No security findings (checked: T007 runs the reconcile only after `assertIsOrderPatient` in `expireHoldIfDueForPatient`, before any write, and the unit test at order-notices.test.ts checks that a stranger triggers no write; T008 to T010 add no routes; stock.vue sends `unauthenticated` to sign-in and shows the S7 wrong-role copy; no secrets, PHI or debug flags in the close-out commits).

No simplicity findings (checked: close-out commits in payments.ts, orders.ts, stock.vue, ChangeForm.vue, dashboard.vue; each task's changed paths are inside its `Owns:`).

Close-out rows re-checked and no longer wrong: pass4 R4 (Pay and checkout start now reconcile; AT-039 and AT-040 in make check); pass2 R4 (`hold_ended` in OrderView, openapi `required`, and the S2 banner at [orderId].vue:61); bug "Pay after hold ended" (payments.ts:112, AT-042); pass5 R2 (stock.vue:137-144 for unauthenticated, forbidden and in-flight; the in-flight path keeps its key and makes no claim about the count), R3 (ChangeForm opens in a row under its product, `position: fixed; inset: 0` below 600 px, focus returns on close), R4 (stock.vue:33-38, 64-79 append pages), R6 (`timeZone: 'UTC'` and "Times in UTC"); pass6 R6 (dashboard.vue:41-56 in-flight guard and `listGen`), R9 (c), (d), (e) and (f) (dashboard.vue:170, 150, 124-142, 20-21). R9 (a) and (b) remain open, see R4. A stale-stock retry reuses the idempotency key with a new body. That is safe, because idempotency.ts:109-113 releases the key on every problem.

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-018, FR-019 / AE-016 | server/services/pricing.ts; server/api/practice/prices/[productId].put.ts | AT-001, AT-008 to AT-013 | covered (pass1) |
| FR-018 / AE-017 | pricing.ts | AT-002 | covered (pass1) |
| FR-020 / AE-018 | pricing.ts | AT-003, AT-012 | covered (pass1) |
| FR-021 / AE-019 | db/migrations/1760000012000_price-changes.sql | AT-004 | covered (pass1) |
| FR-022 / AE-020 | orders.ts:212-230 | AT-005, AT-041 | covered |
| FR-023, FR-024 / AE-021 | orders.ts:134-177; payments.ts | AT-006, AT-035, AT-040 | covered; see R6 for the in-flight re-hold edge |
| FR-037 / AE-035 | orders.ts:237-272, 338; payments.ts:112; [orderId].vue:61; CheckoutStep.vue:63 | AT-007, AT-041, AT-042 | covered; AT-042 provenance R1 |
| FR-025 / AE-022 | catalog / order page (T005) | AT-014 | covered (earlier passes) |
| FR-026 / AE-023, AE-024 | stock.ts reserveForOrder; payments.ts:145-155 | AT-015, AT-016, AT-038 | partial: backend covered; patient copy wrong (R3) |
| FR-027 | stock.ts; payments.ts failAttempt/closeAttempt; orders.ts:255-266 | AT-021, AT-034, AT-036, AT-039, AT-040 | covered |
| FR-006 | payments.ts:89-192 | AT-029, AT-031, AT-039, AT-042 | partial: AT-039 path tells the patient "already paid" (R2) |
| FR-008 | idempotency.ts guard on EP-23 | AT-029 | covered (earlier passes) |
| FR-013 | payments.ts:133-142 | AT-033 | covered (earlier passes) |
| FR-039 | — (T005 scope) | AT-030 | covered (earlier passes) |
| FR-066, FR-067 | orders.ts:345-393; dashboard.vue cancel dialog | AT-032 | covered |
| FR-028 / AE-026 | practice-dashboard.ts | AT-022, AT-026 | covered (pass6) |
| FR-029 / AE-025 | practice-dashboard.ts | AT-021 | covered (pass6) |
| FR-030 / AE-027 | stock-adjustments.ts; ops/stock.vue | AT-017, AT-019, AT-020 | covered |
| FR-038 / AE-036 | adjustments.post.ts:12 `assertRole`; stock.vue:139-140 | AT-018 | covered |
| FR-045 / AE-042 | practice-dashboard.ts; dashboard.vue | AT-023, AT-026, AT-037 | partial: S6 title and practice name (R4), empty copy (R5) |
| FR-046 / AE-043 | practice-dashboard.ts | AT-024, AT-037 | partial (pass6 R1, R2 still filed) |
| FR-047 / AE-044 | practice-dashboard.ts | AT-025 | covered (pass6) |
| FR-069 / AE-066 | practice-dashboard.ts | AT-027, AT-028 | covered (pass6) |

## Not reviewed

- `.handoff/runs/**` and worker result.md files: never read, per the verifier definition. The supervisor's prompt points to the M5-T008 result.md Q2 only through the bug file, and I did not open it.
- `tests/acceptance/M5/*.test.ts` other than close-out.test.ts, and the pricing, stock and dashboard services in detail: reviewed in passes 1 to 6; this pass re-read only the close-out changes and their callers.
- Runtime behaviour: `make check`, the Nuxt SSR and hydration of stock.vue and dashboard.vue, focus trapping, and the 375 px sheet need a browser (no Bash execution or browser in this role).
- The fix-bug skill definition: not found in the repo, so I could not check whether it allows a repro test in `tests/acceptance/**` (R1).
- docs/decisions/DECISION_JOURNAL.md: the diff changes it, but I did not re-read it this pass. Close-out approvals were taken from the acceptance.md history rows.
