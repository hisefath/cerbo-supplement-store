status: done
id: M7-J03
branch: m7/j03-reviewer-guide
worktree: /Users/mastershefu/Desktop/gauntlet_workbench/cerbo-supplement-store/.claude/worktrees/agent-a027bf83ab87ff4ad
base: 8d0262b
head: 47806c42b05f651c332f09bac1f424ebd6dbff8e

## Changed paths
- scripts/evidence-table.sh (new, bash + awk/sed/grep only)
- docs/REVIEWER_GUIDE.md (new)

## Done-when output
```
$ bash scripts/evidence-table.sh | grep -c '^| FR-'
69
$ grep -c '^- \*\*FR-' docs/product/prd.md      # active FR count (no FR is retired)
69
$ grep -q 'evidence:start' docs/REVIEWER_GUIDE.md && echo marker-ok
marker-ok
```

## Checks
- `bash -n scripts/evidence-table.sh` → ok
- `make lint decisions` → ok ("decision-views: docs/decisions/REVIEW.md is current")
- Full `make check` NOT run: this worktree has no node_modules and no test database (needs `make setup` + `make db-test-up`). Docs + a standalone script only; no product code touched. Supervisor should run `make check` in the worktree.

## Findings worth a look
- "Active FR" = all 69 FR lines in prd.md. FR-016, FR-033, FR-034 (milestone "Later") print "⚠ none" for tests. Every other FR has at least one AT.
- LINV-1: lld.md §7 and "Invariants the database enforces" name constraint trigger `ct_order_lines_fee_shares_sum`, but no migration creates it (only `ck_order_lines_fee_share_nonneg`, db/migrations/1760000001000_core-orders.sql:95). The guide marks it "⚠ not built"; the app layer (`allocateFee`, server/services/money.ts:29) and M5_AT_022/027/028 still cover it.
- No root README.md exists; the guide links docs/README.md and marks the root README "⚠ not built".
- THREAT_MODEL.md and embedding-plan.md are linked by path but were written in parallel (not on this branch).

## Questions
none
