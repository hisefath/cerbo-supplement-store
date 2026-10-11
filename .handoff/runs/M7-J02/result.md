---
id: M7-J02
status: done
base_sha: 8d0262b
head_sha: 34ca79f
branch: m7/j02-threat-model
worktree: /Users/mastershefu/Desktop/gauntlet_workbench/cerbo-supplement-store/.claude/worktrees/agent-a133ae0188af56d3f
---
## Changed paths
- docs/security/THREAT_MODEL.md (new)

## Done-when
$ test -s docs/security/THREAT_MODEL.md && grep -cE '^\| T-[0-9]+' docs/security/THREAT_MODEL.md
28

## make check
(tail) M6.1 acceptance: 1 file, 5 tests passed · decision-views: docs/decisions/REVIEW.md is current · make check: OK (exit 0)

## Notes
- 5 trust boundaries (TB-1..TB-5), 28 threat rows with STRIDE, file:line defence, AT id + file or "⚠ no test", residual risk; HLD TH-1..TH-12 mapped to rows; 8 ranked gaps.
- Gaps: T-28 embed launch identity (not built), T-27 host/secrets (not built, N3/N4/N6), T-26 real payment provider signature check (not built), T-13 no test that cost/fee/payout are absent from patient views, T-5 no test sending a forged price field, T-16/T-17/T-24 unit-only (no AT).
- Discrepancy noticed: CHECKLIST N7 says "D55 names this as a pre-embed fix", but D55 in DECISION_JOURNAL.md is "Deploy the demo from the M4 branch before merging". Not cited in the threat model.
- This result.md was written inside the worktree (the sandbox blocks writes to the shared .handoff); it is not committed.

## Questions
none
