---
task: M7-J05
harness: claude-code (subagent, worktree)
model: claude-opus-5-5
status: human_review
reason: "acceptance test M4_AT_029 hand-pays an order with no line fee shares; LINV-1 as designed refuses it at commit"
base_sha: dec3030
head_sha: dec3030
changes: db/migrations/1760000015000_fee-shares-sum.sql (uncommitted), tests/unit/fee-shares-sum.test.ts (uncommitted)
tests: unit fee-shares-sum 3/3 pass; make check red (M4 acceptance: M4_AT_029 fails, caused by this trigger)
not_verified: whether M4_AT_028 (paid_at < sent_at by 33 ms) is a pre-existing timing flake; baseline make check on dec3030 not run
---

Note: written in the worktree's .handoff because writing to the main checkout's .handoff was blocked by worktree isolation.

## Changes
- `db/migrations/1760000015000_fee-shares-sum.sql` (new, uncommitted): function `order_fee_shares_sum()`
  (plpgsql, `set search_path = public, pg_temp`), constraint triggers `ct_order_lines_fee_shares_sum`
  (after insert/update/delete on order_lines) and `ct_orders_fee_shares_sum` (after insert/update on orders,
  `when (new.status = 'paid')`), both deferrable initially deferred. Refuses when the order is paid and any line
  share is null or sum(shares) <> platform_fee_cents. Error: `fee shares of order <id> do not add up to its platform
  fee`, errcode check_violation (23514). Down section drops both triggers and the function.
- `tests/unit/fee-shares-sum.test.ts` (new, uncommitted): uses tests/acceptance/support/db (import, read-only),
  takes the advisory lock, rebuilds the schema; cases: shares 23+22=45 commits; 23+21 refused at commit with the
  message naming the order and the order rolled back; a null share refused.

## Tests run
- `npx vitest run tests/unit/fee-shares-sum.test.ts` -> Test Files 1 passed (1), Tests 3 passed (3)
- Mutation: replaced the sum comparison with `false` -> "× refuses at commit a paid order whose shares are one
  cent off" (1 failed | 2 passed); restored.
- `make -k check` -> exit 2. Unit tests: Test Files 23 passed (23), Tests 347 passed (347). M4 acceptance:
  M4_AT_029 FAIL (audit-order.test.ts:153, "fee shares of order ... do not add up", raised by this trigger);
  M4_AT_028 FAIL once (paid_at 33 ms before sent_at; timing, not touched by this trigger). M5, M5.1, M5.2, M6,
  M6.1 suites all passed.

## Questions
- ⚠ M4_AT_029 (tests/acceptance/M4/audit-order.test.ts:151-153) sets order `a` to paid by direct SQL with
  platform_fee_cents = 45 but never sets order_lines.fee_share_cents, and expects no error. LINV-1 (lld.md:733,
  :2646) says a paid order's fee shares must add up to its platform fee, so the trigger refuses it. The task says
  every acceptance suite must stay green. Options:
  (a) Recommended: `define-acceptance` amends M4_AT_029 to also set the lines' fee shares (e.g. 30+15) before
      paying order `a`; keeps LINV-1 strict. Cost: a QA-owned test edit.
  (b) Weaken the trigger to skip orders whose lines have no shares at all (all null). Keeps the suite green with
      no test edit; cost: a hand-written paid order with no allocation slips past LINV-1.
  (c) Do nothing / drop LINV-1 from M7.
- M4_AT_028 failed once with paid_at 33 ms before sent_at; looks like a pre-existing clock/timing flake (app vs DB
  time), not this trigger. Worth a separate fix-bug if it recurs.

Assumed: one shared function for both triggers, reading the order id via to_jsonb (order_id for lines, id for
orders). Manifest gaps: read tests/acceptance/support/db.ts, tests/acceptance/M4/audit-order.test.ts,
tests/acceptance/M4/pay-order.test.ts, server/services/payments.ts (grep), db/seed/demo.ts (grep).
Uncommitted: both Owns files above.
