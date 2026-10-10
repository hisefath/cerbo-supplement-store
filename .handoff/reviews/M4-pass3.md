# Verifier review — M4 pass 3

- Date: 2026-10-10 · Diff: `.handoff/reviews/M4-diff.patch` (7 files; this pass covers M4-T003 only, on top of merged M4-T001 and M4-T002) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.handoff/reviews/M4-diff.patch`, `specs/M4-tracer-bullet/tasks/T003.md`, `.handoff/reviews/M4-pass2.md` (for R1, R4 and R5), `specs/M4-tracer-bullet/acceptance.md` (AT-006/013/021/031/038/040 and the EDGE and SS rows, searched), `tests/acceptance/M4/pay-order.test.ts`, `pay-failure.test.ts`, `send-order.test.ts` (AT-021), `tests/acceptance/support/db.ts` (truncate), `docs/architecture/lld.md` (BE-5, the BE-10 and BE-11 contracts, §1 payment_attempts and idempotency_keys, §4 Idempotency, SEQ-1 and SEQ-2 alternatives, SM-1, SM-2, SM-3, §7 INV-2, §8 FM table), `docs/decisions/DECISION_JOURNAL.md` (D41, D47). For context I read these worktree files in `.claude/worktrees/m4-t003`: `server/services/payments.ts`, `payment-gateway.ts`, `orders.ts` (Order shape), `server/utils/problem.ts`, `db/migrations/1760000002000_payments-ledger.sql`, `app/pages/patients/[patientId]/supplements.vue`, `app/components/checkout/CheckoutStep.vue`
- Tooling note: this session had no Grep or Glob tool. I used Bash only for read-only `grep`, `sed -n` and `cat`. I ran nothing and edited nothing.

## Findings

No tests-that-lie findings. I checked `tests/unit/idempotency.test.ts`:
- The expected slugs and statuses come from lld.md §4 and SM-3, not from implementation output.
- Nothing mocks the system under test, nothing is skipped and every assertion can fail.
- The file is inside `make check`'s `vitest run --dir tests/unit`.
- The diff does not touch `tests/acceptance/**`.

One caveat: the case "a stored problem is replayed too (e.g. the 502 of a failed payment)" encodes the behaviour that R1 questions.

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | spec-fidelity | P1 | high | server/services/idempotency.ts:117 | `guard` stores every 4xx problem and the 502 `payment-failed` as `completed`, and replays them for 24 h. It releases only on other 5xx. The LLD releases the key in all of these cases: BE-5 `release` is called "when the service fails with 5xx or a retryable problem"; SEQ-1 a2/a3 (insufficient-stock, below-price-floor); SEQ-2 a3 (payment-failed) and a2 (insufficient-stock, order-under-review). The effect with the merged FE-4 is real. `supplements.vue` keeps the same key after a problem (ST-9). A provider who gets 422 below-price-floor and then removes the line or lowers the quantity now gets 422 `idempotency-mismatch`. A provider who fixes the price in Practice prices and sends the same draft again gets the stale 422 replayed. No D-id records the change. | `if (status >= 500 && status !== 502) await release(userId, key!)` · :109-110 "A 4xx problem and the 502 of a failed payment are stored and replayed like a success" · lld.md:1502, :1510, :1617 "BE-1 → BE-5: release(user, key)" | fix (release on the LLD's retryable problems), or record a decision and update the LLD |
| R2 | correctness | P3 | med | server/services/payments.ts:105 | The R1 fix sends every non-gateway error through `failAttempt`, which also moves the order to `payment_failed`. Those errors are a bad `PAYMENT_STUB_MODE` and a database error in transaction 2. It writes `failure_reason = 'error'`, but the LLD lists only `declined` or `no_answer`. FM-3 says the database-failure path rolls back and that "BE-5.release lets the patient retry the same key". Here the key is released (500), but a same-key retry now gets 409 `invalid-transition`, and that response is stored, because the order is `payment_failed`. Once the order is re-checked-out, the same key also collides with the old attempt on `uq_payment_attempts_order_key`, and the blanket 23505 mapping at :96 turns that into `invalid-transition`. Today FE-8 mints a new key after a 500, so the UI does not hit this. | `let failureReason = 'error'` · :146 `.set({ status: 'payment_failed' })…where('status', '=', 'in_checkout')` · lld.md:481 "declined, no_answer" · lld.md FM-3 "BE-5.release lets the patient retry the same key" | file |
| R3 | correctness | P3 | med | server/services/idempotency.ts:118 | If `complete()` fails after a successful payment, the patient gets a 500 even though the order is paid. The key then stays `in_flight`: retries get 409 for 60 s, then FM-6 takes the key over and re-runs `pay`, which returns 409 `invalid-transition` and stores it. That patient never gets the receipt replay that FR-008 asks for ("show the existing payment result"). There is no double charge, because INV-2 holds. | `else await complete(userId, key!, status, body)` runs after `work` has committed, outside any retry | file |
| R4 | spec-fidelity | P3 | med | server/services/payment-gateway.ts:11 | Nothing enforces the 10 s no-answer timeout. BE-11's contract says it "times out after 10 s as `no_answer`", and FM-2 detection is "10 s timeout". The stub answers at once and `pay` has no timeout around `charge()`. A hanging gateway would hold the request and its in-flight key indefinitely. Pass 2's coverage map gave this to T003, and T003 owns this file. Only the stub exists in M4, so nothing hangs today. | `// ponytail: no_answer answers at once instead of after the 10 s timeout` · lld.md:980 | file |
| R5 | spec-fidelity | P3 | high | — | Nothing tests the review fixes or the database half of BE-5: R1 (a stuck `processing` attempt is marked failed after a non-gateway throw); R4 (conditional attempt updates and the lock order); R5 (`tg_payment_attempts_succeeded_frozen`); the BE-5 SQL paths (409 for a same key in flight, the 60 s FM-6 takeover UPDATE, release on 5xx, and the purge on write). The unit test covers only the pure `decide()` and `requestHash()`, and no acceptance test reaches these paths. | tests/unit/idempotency.test.ts imports only `decide, requestHash`; no acceptance test updates `payment_attempts` or reuses an in-flight key | file |

No security findings. Checked:
- Keys are scoped to (user_id, key), and the stored response is replayed only to the same user.
- Route and request hash are both compared, and EP-23's hash includes the orderId path param, so one key cannot replay across orders or routes.
- The key length is capped at 255, and `!key` gives 400.
- Queries are parameterised through Kysely.
- The grant on `idempotency_keys` matches Q-5 (the app may delete these rows).
- The R5 trigger message holds only the attempt id.
- No secrets or PHI are in code or tests.
- The stored `response_body` holds the receipt or order lines for 24 h, as the LLD's D41 design specifies.

No simplicity findings. Checked:
- Every changed path is inside T003 `Owns:`.
- No dependency or lockfile changed.
- `decide` is a pure helper, used by `begin` and exercised by the unit test.
- The nested `defineApiHandler` in `guard` is needed to capture the problem status and body.
- The D47 branch is kept unchanged at payments.ts:79-88.

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-008 / AE-006 | idempotency.ts:37-120 (`begin`, `complete`, `guard`); payments.post.ts:14-18 | M4_AT_006 (same key sequential → same receipt; new key → 409); unit `decide` | covered for sequential repeats. A repeat while the first is still in flight returns 409 `idempotency-in-flight`, as lld.md §4 specifies, not the first result; untested (R5) |
| FR-008 (EP-19, D41) / AT-021 | index.post.ts:20-27; idempotency.ts | M4_AT_021 | covered (replay, mismatch, missing key); see R1 for problem replay |
| AT-013 (key required) | idempotency.ts:43 | M4_AT_013, M4_AT_021 | covered |
| LINV-6 / INV-2 / AT-038 | payments.ts:89-97 (23505 → 409 on `uq_payment_attempts_one_processing`), tx1 `forUpdate` | M4_AT_038 | covered |
| FR-035 / AE-031 (no answer) | payments.ts:107-117, :135-148 `failAttempt` | M4_AT_031 | covered (stub answers at once; 10 s timeout missing, R4) |
| FR-035 / AT-040 (decline) | same | M4_AT_040 | covered |
| S2 failure copy (FE-23) | CheckoutStep.vue:85 (merged in T002, not in this diff) | none until T005 | out of this diff |
| pass2 R1 (stuck processing attempt) | payments.ts:103-117 | none | delivered, untested (R2, R5) |
| pass2 R4 (lock order; conditional attempt updates) | payments.ts:162-163, :144, :209-211 | none | delivered, untested (R5) |
| pass2 R5 (succeeded attempt frozen, INV-2) | migration:29-39 | none | delivered, untested (R5) |
| D41 (keys in a table) | migration:11-27; db-types.ts | M4_AT_006, M4_AT_021 | covered |
| D47 (negative payout → needs_review before charge) | payments.ts:79-88 (unchanged) | none (D47 defers the acceptance test to after M4) | kept |

## Not reviewed

- Running anything: no `make check`, no acceptance run, and no migration up/down against PostgreSQL 16. I judged by reading only: the trigger behaviour; the `ON CONFLICT DO NOTHING` race; jsonb round-tripping of the stored body (jsonb reorders object keys, and the bodies compared deep-equal); whether calling a nested `defineEventHandler` directly works under the h3 version installed.
- `docs/architecture/hld.md` and `contracts/openapi.yaml`: not read. The EP-19 and EP-23 contracts were taken from lld.md §4.
- `docs/product/prd.md`: not read. The FR text was taken from the task file and acceptance.md.
- `specs/M4-tracer-bullet/acceptance.md`: searched for T003 rows only, not read in full.
- Worker self-reports (`.handoff/runs/**`, result.md): not read, and none was quoted in the prompt.
