# Mutation check (planted bugs in the money code)

Closes finding F43 (`docs/product/prd.md:584`): proof that the money tests catch planted bugs.

## What it is
`scripts/mutation-check.sh` plants one known bug ("mutant") at a time in the money code, runs the fastest test
that covers it, and puts the file back. A mutant is **KILLED** when that test fails, **SURVIVED** when it still
passes. Each mutant is a name, a file and one perl substitution, listed in the script.

- Money code covered: `server/services/money.ts` (BE-6: fee, payout, fee shares, price floor),
  `server/services/payments.ts` (BE-10: split, order row, ledger posting, row lock, negative-payout review),
  `server/services/pricing.ts` (BE-8: price-change floor), `server/services/orders.ts` (BE-9: send-time floor),
  `server/services/idempotency.ts` (BE-5: replay of a repeated Pay).
- After every mutant the script runs `git checkout -- <file>`; a trap does the same on exit or Ctrl-C.
- It refuses to start when those five files have uncommitted changes, so it never wipes your work.
- It fails (exit 1) when any mutant SURVIVED or a substitution matched nothing (NOT APPLIED).
- Limit: KILLED means "the test command failed". An acceptance run that fails for another reason (database
  down, build error) also reads as KILLED. The script checks the unit tests pass before it starts; run
  `make check` first so the acceptance baseline is green too.

## How to run
```
make db-test-up        # PostgreSQL 16 test database on 127.0.0.1:54329 (acceptance mutants need it)
make mutation-check    # about 8 minutes; NOT part of make check (too slow)
```

## Last run
- Date: 2026-10-11, 22:32 to 22:40 UTC
- Code SHA: `8d0262b` (milestone/m7-defensibility) plus this script
- Result: 14 KILLED, 1 SURVIVED, 0 NOT APPLIED; exit 1

| Mutant | File | Test command | Result |
|---|---|---|---|
| fee-floor-not-half-up | server/services/money.ts | `npx vitest run --dir tests/unit` | KILLED |
| fee-half-down | server/services/money.ts | `npx vitest run --dir tests/unit` | KILLED |
| fee-plus-one-cent | server/services/money.ts | `npx vitest run --dir tests/unit` | KILLED |
| payout-adds-fee | server/services/money.ts | `npx vitest run --dir tests/unit` | KILLED |
| fee-share-ties-to-later-line | server/services/money.ts | `npx vitest run --dir tests/unit` | KILLED |
| floor-one-cent-low | server/services/money.ts | `npx vitest run --dir tests/unit` | KILLED |
| fee-on-cost-not-total | server/services/payments.ts | `npx vitest run --dir tests/unit` | KILLED |
| fee-rounded-per-line | server/services/payments.ts | `npx vitest run --dir tests/unit` | KILLED |
| price-change-below-floor | server/services/pricing.ts | `npx vitest run --dir tests/unit` | KILLED |
| send-below-floor-allowed | server/services/orders.ts | `npx vitest run tests/acceptance/M4/send-order.test.ts -t M4_AT_0(03\|41)` | KILLED |
| order-row-payout-fee-swapped | server/services/payments.ts | `npx vitest run tests/acceptance/M4/pay-order.test.ts -t M4_AT_009` | KILLED |
| ledger-payout-fee-swapped | server/services/payments.ts | `npx vitest run tests/acceptance/M4/pay-order.test.ts -t M4_AT_009` | KILLED |
| pay-without-order-row-lock | server/services/payments.ts | `npx vitest run tests/acceptance/M4/pay-order.test.ts -t M4_AT_038` | SURVIVED |
| negative-payout-charged | server/services/payments.ts | `npx vitest run tests/acceptance/M5/m4-regressions.test.ts -t M5_AT_033` | KILLED |
| idempotent-replay-skipped | server/services/idempotency.ts | `npx vitest run tests/acceptance/M4/pay-order.test.ts -t M4_AT_006` | KILLED |

(The `\|` in one row is the escaped `|` of the `-t` regex.)

## Findings
**MUT-1: removing the order row lock in Pay survives.** The mutant deletes `.forUpdate()` from transaction 1 of
`pay()` (`server/services/payments.ts:107`). M4_AT_038 (two Pay presses at once, different keys) still passes:
one 201, one 409, one ledger payment. The second Pay is still stopped, by the partial unique index
`uq_payment_attempts_one_processing` (`db/migrations/1760000002000_payments-ledger.sql:55`; comment at
`server/services/payments.ts:143`), not by the lock. So no money is at risk in this race, but no test pins the lock
itself. What the lock alone protects (status read and hold check against a parallel cancel or hold expiry) is
⚠ not tested. Fix belongs to QA (`define-acceptance`): a test that races Pay against another writer of the
order row. Tests were not edited in this job (M7-J04 rules).

## Limits

- Do not edit the five target files while it runs (~8 minutes): each mutant is undone with `git checkout --`, which discards an editor save made mid-run.
- Ctrl-C restores the current file and stops the run. A `kill -9` cannot be trapped and can leave the planted bug in place: run `git checkout -- server/services` afterwards.
- The unit baseline runs `tests/unit` only; the LINV-1 database test lives in `tests/db` (`make test-db`).

**MUT-1 follow-up (M7.1):** M7.1_AT_004 proves Pay waits while another transaction holds the order row, but it does not kill MUT-1: `expireHoldIfDue` (server/services/orders.ts:238) takes the same lock just before Pay's first transaction, so removing only Pay's `forUpdate` still waits. The window it guards is between those two transactions; testing it needs a fault-injection seam, which is not built. Accepted as an equivalent mutant under test.
