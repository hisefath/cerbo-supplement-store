---
learning: hooks-see-git-dir-in-worktrees
date: 2026-10-11
project: cerbo-supplement-store
finding: F30
proposal: H22
layer: Verification/hooks
status: proposed
---

# A git hook runs with GIT_DIR set, so it must unset it before calling tools that run git from other folders.

## What happened

Pushes from task worktrees failed `make check` inside the pre-push hook, and the failures were first logged as a
flaky test. In a linked worktree git exports `GIT_DIR` to the hook, so `git -C <subdir> rev-parse --show-toplevel`
in embed-diagrams answered the subfolder, built doubled paths and failed. The same `make check` passed when run by
hand. Cerbo's hook now unsets the variables (7e96344); the kit template does not yet.

## Why it happened

1. A pre-push `make check` failed only when pushing from a worktree.
2. Git sets `GIT_DIR` for hooks run from a linked worktree, and `-C` does not override it.
3. Harness gap: the hook template ran `make check` with the hook's git environment, and no test pushed from a
   worktree.

## The rule now

The pre-push hook unsets `GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX` before running `make check`, and a kit
test pushes from a linked worktree.
- Enforced by: `templates/.githooks/pre-push` and `scripts/test.sh` once H22 is adopted.
- Interview line: "The 'flaky' push failures were the hook's own environment: git hands hooks a GIT_DIR that
  breaks any tool calling git from another folder."

## Evidence

- TRACKER Log 2026-10-11 10:04 CDT FAIL flaky ; TRACKER Log 2026-10-11 10:05 CDT FIX ; 7e96344
- Guard: `scripts/test.sh` case "pre-push: make check in a linked worktree sees that worktree (GIT_DIR unset)"
- Factory record: `FINDINGS.md` F30, `HARNESS_CHANGELOG.md` H22
