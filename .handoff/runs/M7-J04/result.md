# M7-J04 result
status: done
base: 8d0262b · head: 5730a82 · branch: m7/j04-mutation-check
worktree: .claude/worktrees/agent-a035b60b71063bfe6

## Changed paths
- scripts/mutation-check.sh (new): 15 mutants. Each one has a name, a file, a perl substitution and a test command. A trap restores the file with git checkout. The script will not run over uncommitted changes. It exits 1 on SURVIVED or NOT APPLIED.
- docs/ops/MUTATION.md (new): what it is, how to run it, the last run's table, finding MUT-1
- Makefile: new `mutation-check` target (not part of `check`)

## Done-when output
`make mutation-check` (2026-10-11 22:32-22:40 UTC, code at 8d0262b). Exit 1, with one SURVIVED listed as a finding:
```
KILLED  fee-floor-not-half-up
KILLED  fee-half-down
KILLED  fee-plus-one-cent
KILLED  payout-adds-fee
KILLED  fee-share-ties-to-later-line
KILLED  floor-one-cent-low
KILLED  fee-on-cost-not-total
KILLED  fee-rounded-per-line
KILLED  price-change-below-floor
KILLED  send-below-floor-allowed
KILLED  order-row-payout-fee-swapped
KILLED  ledger-payout-fee-swapped
SURVIVED  pay-without-order-row-lock
KILLED  negative-payout-charged
KILLED  idempotent-replay-skipped
mutation-check: FAIL (a mutant survived or did not apply)
```
`make check` (on the committed tree):
```
unit: Test Files 23 passed (23), Tests 347 passed (347)
M4: 43 passed · M5: 44 passed · M5.1: 5 passed · M5.2: 6 passed · M6: 44 passed · M6.1: 5 passed
decision-views: docs/decisions/REVIEW.md is current
make check: OK
```
Note: the first `make check` run failed M4_AT_028. A paid_at value was 33 ms earlier than a Node timestamp (tests/acceptance/M4/pay-order.test.ts:189). This looks like a clock-timing flake, and this job changed no source. That run's log was also mixed with another worker's output, because both used the same scratchpad file name. The rerun above is clean.

## Findings
- MUT-1 (SURVIVED): no test catches deleting `.forUpdate()` in pay() transaction 1 (server/services/payments.ts:107). M4_AT_038 still passes because uq_payment_attempts_one_processing (db/migrations/1760000002000_payments-ledger.sql:55) blocks the second Pay. No test checks the lock against a parallel cancel or hold expiry: ⚠ not tested. Route to QA (define-acceptance). Tests were not edited here.
- The M4_AT_028 timing flake above: a candidate for QA review.

## Questions
- None.
