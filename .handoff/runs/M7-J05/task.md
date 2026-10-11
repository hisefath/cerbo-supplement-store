---
id: M7-J05
milestone: M7
skill: implement-task
---
Owns: db/migrations/1760000015000_fee-shares-sum.sql,tests/unit/fee-shares-sum.test.ts
## Ask
Build LINV-1 as designed and approved at G3: constraint trigger `ct_order_lines_fee_shares_sum` (docs/architecture/lld.md:733 and :2646): at commit, for a paid order, the sum of its order_lines fee shares equals the order's platform fee. Follow the exact style of db/migrations/1760000002000_payments-ledger.sql (ledger_entries_balance: deferrable initially deferred constraint trigger, plpgsql, runs as supplements_owner, with a down section). Pin `set search_path = public, pg_temp` on the function. Read the orders and order_lines columns from db/migrations/1760000001000_core-orders.sql and how paying sets them (server/services, BE-6 allocateFee in server/services/money.ts). The trigger must fire on order_lines changes and on orders changes that make an order paid.
Test (tests/unit/fee-shares-sum.test.ts, against the test DB the way existing DB-touching unit tests do; if none do, mirror how tests/acceptance helpers connect, read-only reference): one paid order whose shares sum to the fee commits; one whose shares are off by one cent is refused at commit; the error names the order.
Must not change: any existing migration, any service code, tests/acceptance/**. Every existing acceptance suite must stay green (the seed and pay path already produce correct shares).
## Done-when
npx vitest run tests/unit/fee-shares-sum.test.ts && make check
Rules: read AGENTS.md first. Write result.md at $HANDOFF_DIR/runs/M7-J05/result.md (or the worktree copy if blocked). Commit owned files with "feat(m7/M7-J05): LINV-1 fee-shares constraint trigger" and trailer "Task: M7-J05".
