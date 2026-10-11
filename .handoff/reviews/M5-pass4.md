# Verifier review: M5 pass 4 (scope: M5-T003 fix round r2)

- Date: 2026-10-10 · Diff: `.handoff/reviews/M5-T003-r2.patch` (2 files: `server/services/orders.ts`, `tests/unit/order-notices.test.ts`) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.handoff/reviews/M5-T003-r2.patch`; `.handoff/reviews/M5-pass2.md`. From worktree `m5-t003`: `specs/M5-prices-and-stock/tasks/T003.md`, `specs/M5-prices-and-stock/acceptance.md`, `docs/architecture/lld.md` (BE-4, BE-9, BE-10, BE-11, BE-13, SEQ-2, SEQ-5, SM-1, SM-2, §7 INV-5/LINV-6, §8 FM-1..FM-9, §9), `server/services/orders.ts`, `server/services/payments.ts`, `server/services/stock.ts`, `server/services/payment-gateway.ts`, `server/services/access-policy.ts`, `server/utils/problem.ts`, `server/utils/db-types.ts`, `tests/unit/order-notices.test.ts`

## Status of the four chosen fixes

- **pass2 R3 (P0: a hold ended while a payment was in flight).** Fixed. `expireHoldIfDue` now locks the order row (orders.ts:240-245, `.forUpdate()`), the same lock `pay` takes in transaction 1 (payments.ts:94-99). After the lock it reads `payment_attempts` in a new statement, so under READ COMMITTED it sees an attempt that transaction 1 just committed. Any processing attempt under 2 minutes old returns before any write (orders.ts:266 `if (attempt / !o.hold_over) return`). `recordPayment` then still finds `in_checkout` (payments.ts:229-230).
- **pass2 R5 (a state change ran before the access check).** Fixed. `assertCanViewOrder` (orders.ts:298) now runs before `expireHoldIfDue` (orders.ts:299-302). The unit test at test:120-125 would fail against the old order of calls.
- **pass2 R1 (the test's held price equalled the sent price).** Fixed. In test:157-164 the held price ($25.00), the sent price ($24.00) and the current price ($26.00) all differ. A view that showed the sent or the current price would give 6000 or 6200, not 6100. AT-007's own weakness stays, because that file is QA-owned.
- **lld FM-7 (reconcile an abandoned attempt).** Delivered on the EP-21 read path (orders.ts:253-264). The attempt goes to `failed` with reason `no_answer`, guarded by a conditional update. `releaseForOrder` writes `sale_release`. The order goes to `payment_failed`. A warn log carries only ids. The pay path is not delivered (see R4).

## Findings

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | tests-that-lie | P2 | high | tests/unit/order-notices.test.ts:21-36, 92-99 | The fake driver returns the attempt and its `abandoned` flag no matter what SQL it receives. That leaves three parts of the R3/FM-7 fix untested: the `.forUpdate()` lock that makes R3 race-safe (orders.ts:244), the `status = 'processing'` filter (orders.ts:251), and the 2-minute threshold (orders.ts:249). All tests stay green if any of these is removed or changed, for example `interval '2 seconds'`, which would bring back the R3 charged-but-unpaid outcome through FM-7. lld.md §9 says the PostgreSQL engine is "never faked" in a transaction test. | `return { rows: fake.attempt?.status === 'processing' ? [fake.attempt] : [] }` · `fake.attempt = { id: '90', status: 'processing', abandoned: false }` | fix (cheapest option: assert the compiled SQL, i.e. `for update` on the first orders select, `interval '2 minutes'`, and the status filter; or move the case to a test against the real test database) |
| R2 | tests-that-lie | P3 | high | tests/unit/order-notices.test.ts:108-109 | The "gives its 2 units back once" check can pass even if the once-only guard is broken. On the second call the fake order is already `payment_failed`, so `expireHoldIfDue` returns at orders.ts:246. The guard `if (closed.numUpdatedRows !== 1n) return` (orders.ts:260) never runs, and removing it stays green. | `await expireHoldIfDue(41n) // read again: nothing more to reconcile` · `expect(fake.moves).toHaveLength(1)` | file |
| R3 | tests-that-lie | P3 | high | tests/unit/order-notices.test.ts:118-126 | The R5 test only shows the refusal. It has no allowed twin: no test in `make check` shows that the patient's own EP-21 read still ends a due hold. Deleting orders.ts:299-302 keeps `make check` green. Only AT-007 would catch it, and AT-007 is not in `make check` (pass2 R2). | `describe('getOrderForViewer: access is checked before any write (R5)'` has only the stranger case | file |
| R4 | spec-fidelity | P3 | high | server/services/payments.ts:93-103 (context, outside Owns) | FM-7 says an abandoned attempt is "found by BE-9.expireHoldIfDue or the next pay on that order", and SM-1 says the hold ends "on any read or action". Only EP-21 reconciles. **Pay:** with an abandoned attempt, Pay fails on `uq_payment_attempts_one_processing` and answers 409 invalid-transition until something reads EP-21. **startCheckout:** a new checkout started over an abandoned attempt is turned into `payment_failed` by the next EP-21 read. `payments.ts` is not in T003's `Owns:`, so this needs a slicing decision. | lld.md FM-7 "found by BE-9.expireHoldIfDue or the next pay on that order"; payments.ts:139-141 `'23505' ? new ProblemError('invalid-transition')` | file |
| R5 | correctness | P3 | med | server/services/orders.ts:249, 253-262 | FM-7's 2-minute cut-off can close an attempt whose process did not die but stalled. If `recordPayment` starts more than 2 minutes after transaction 1 (for example, connection-pool starvation), the reconcile marks the attempt `failed` and the order `payment_failed`. `recordPayment` then refuses (payments.ts:230) after the gateway has charged. The window is bounded: the gateway gives up after 10 s (payment-gateway.ts:16) and FM-3 adds a 5 s statement timeout, so 2 minutes is a wide margin. The stub moves no money, and lld FM-7 accepts this for the stub ("later ask the provider by key first"). | `sql<boolean>`created_at <= now() - interval '2 minutes'`` | keep (track for the real-gateway integration) |

No security findings (checked: the access check now comes before any write; the warn log carries only order and attempt ids (NFR-010); an unknown id and a forbidden id still both answer not-found).

No further correctness findings. Checked:
- **Lock order.** Every path locks the `orders` row first, then `payment_attempts`, then products in id order: `expireHoldIfDue`, `pay` transaction 1, `recordPayment`, `failAttempt`, `closeAttempt` and `startCheckout`. `cancelOrder` is a single conditional UPDATE on `orders`, and `adjust` locks one product only, so no cycle exists.
- **expire vs pay transaction 1.** If expire wins, pay sees `sent` and answers invalid-transition. If pay wins, expire sees its processing attempt and keeps the hold.
- **expire vs failAttempt / closeAttempt.** Whichever runs second finds no processing attempt (`numUpdatedRows` 0), so stock is released once. `failAttempt`'s order update is conditional on `in_checkout`.
- **expire vs cancel.** Cancel stays limited to `sent` and `payment_failed`. After an FM-7 reconcile the stock is already returned, so a later cancel is safe.
- **Missing hold time.** A null `prices_held_until` gives `hold_over` null, and the code treats that as a live hold (no write).
- **Column check.** `payment_attempts.created_at` exists (db-types.ts:110). The raw SQL is not type-checked, so this was checked by reading.

No simplicity findings (checked: the second `load()` happens only for `in_checkout` orders; no new helpers or layers).

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| pass2 R3 (in-flight payment keeps the hold) | orders.ts:240-252, 266 | test:92-99 (fake DB, see R1) | covered in code; test is partial (R1) |
| pass2 R5 (access before write) | orders.ts:298-302 | test:120-125 | covered (no allowed twin, R3) |
| pass2 R1 (held ≠ sent) | n/a (test-only) | test:157-164 | covered |
| FM-7 / SM-2 "abandoned" | orders.ts:253-264 | test:100-110 (fake DB, R1, R2) | partial: EP-21 path only (R4) |
| FR-022 / AE-020 | orders.ts:210-227 | test:138-143; AT-005 | covered (unchanged) |
| FR-023 | orders.ts:215 | test:157-164; AT-006 | covered |
| FR-024 / AE-021 | payments.ts (unchanged) | AT-006 | covered (unchanged) |
| FR-037 / AE-035 | orders.ts:266-268, 299-302 | test:82-86; AT-007 (not in `make check`) | covered; pass2 R4 (S2 hold-ended banner) not in this fix round's scope |
| INV-5 | releaseForOrder via reconcile (orders.ts:261) | test:105 (fake) | covered at unit level only |
| LINV-6 | unchanged (uq index; payments.ts:134-141) | n/a in this diff | not affected |

## Not reviewed

- Runtime behaviour, `make check`, and the T003 Done-when count: needs running (no Bash).
- The Grep and Glob tools were not available in this session. Every file was opened by path, so I could not search for other callers of `expireHoldIfDue` or list `db/migrations/` (column existence was checked through `db-types.ts` instead).
- `docs/architecture/contracts/openapi.yaml`, `docs/product/prd.md`, `docs/decisions/DECISION_JOURNAL.md`: not opened. This patch touches no contract field.
- `tests/acceptance/M5/prices.test.ts`: not re-read this pass. AT-007's held = sent weakness stands as reported in pass2 R1 and is QA-owned.
- pass2 R2, R4, R6 and R7 were not part of this fix round, so they were not re-checked.
- Worker self-reports (`.handoff/runs/**`): never read, as required.
