---
learning: use-the-git-trailer-flag
date: 2026-10-11
project: cerbo-supplement-store
finding: F35
proposal: H26
layer: Skill
status: proposed
---

# Add the Task trailer with `git commit --trailer`, never as its own `-m` paragraph.

## What happened

The recipe said `git commit -m "<subject>" -m "Task: M<N>-T###"`. The harness then adds a separate
Co-Authored-By paragraph, so `Task:` is no longer in git's trailer block. Workers noticed and amended their own
commits, and report-milestone flagged six M5 squash commits (DV-1).

## Why it happened

1. `git log --format=%(trailers:key=Task)` printed nothing for commits that showed a `Task:` line.
2. Git parses trailers only from the last paragraph, and Co-Authored-By came after Task.
3. Harness gap: the recipe used `-m` for a trailer instead of git's own `--trailer` flag.

## The rule now

Commit with `--trailer "Task: <id>"`; git merges it into the existing trailer block wherever Co-Authored-By sits.
- Enforced by: implement-task, gather-evidence and the CLAUDE.md squash step once H26 and H27 are adopted.
- Interview line: "A trailer is a parsed block, not a line that looks right, so the commit command builds it."

## Evidence

- runs/M6-T001/result.md ; TRACKER Log 2026-10-11 00:20 CDT NOTE DV-1 ; TRACKER Approvals 2026-10-11 00:20 CDT G5 Revise
- Guard: `git log -1 --format=%(trailers:key=Task,valueonly)` prints the id with no amend
- Factory record: `FINDINGS.md` F35, `HARNESS_CHANGELOG.md` H26, H27
