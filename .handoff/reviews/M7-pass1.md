# M7 review pass 1 · 2026-10-11 17:56 CDT · verifier (Claude subagent, read-only) on .handoff/reviews/M7-diff.patch

| Row | Sev | Where | Finding | Disposition |
|---|---|---|---|---|
| R1 | P1 | docs/REVIEWER_GUIDE.md LINV-1 row | said "⚠ not built" though the branch adds the trigger | fixed: points at 1760000015000_fee-shares-sum.sql and tests/db |
| R2 | P2 | tests/unit/fee-shares-sum.test.ts | a database test in the unit folder makes unit runs and mutation baselines need the DB | fixed: moved to tests/db, new make test-db in check |
| R3 | P2 | THREAT_MODEL.md T-9 | M4_AT_030 citation :160 stale | fixed: :162 |
| R4 | P3 | fee-shares-sum.sql:3 | comment said runs as owner | fixed: says it runs as the writing role (not security definer) |
| R5 | P3 | mutation-check.sh trap | Ctrl-C did not stop the run | fixed: INT/TERM restore then exit 130 |
| R6 | P3 | mutation-check.sh | mid-run editor saves discarded; kill -9 leaves mutant | documented in MUTATION.md Limits |
| R7 | P3 | REVIEWER_GUIDE INV-1, INV-6 | constraint citations pointed at a header comment | fixed: payments-ledger.sql:10, :12 |
| R8 | P3 | .handoff/runs/M7-J0*/result.md | absolute local paths | fixed: repo-relative |

Migration verified on every write path (paid is terminal; lines frozen after paid; pay path writes lines before the order). ~45 citations spot-checked; three wrong, all fixed.
