---
learning: kit-fixes-miss-project-copies
date: 2026-10-11
project: cerbo-supplement-store
finding: F29
proposal: H20
layer: Skill
status: proposed
---

# A fix to a file the kit copies into projects is not done until each project's copy has it too.

## What happened

On 2026-10-10 the kit fixed scope-guard so a `[` in `Owns:` is literal (H4, F5). Cerbo's copy of
`scripts/scope-guard.sh` never got that fix, because `init-repo.sh` never overwrites a file and H4 was filed for
the kit only. That evening M5-T008 hit the same bug on `app/pages/orders/[orderId].vue`. The project then patched
its copy differently (428cd99), and that patch still fails folder globs like `server/api/orders/[orderId]/**`.

## Why it happened

1. A worker was stopped by a scope-guard bug the kit had already fixed.
2. The project's scope-guard is a copy made at bootstrap, and `init-repo.sh` never overwrites a copy.
3. Harness gap: route-failure's reach table listed copied scripts as "factory skill", whose row never asks for a
   project block, so H4 had no project half.

## The rule now

When a kit change touches a file `init-repo.sh` copies (the verifier, scope-guard, delegate, embed-diagrams,
decision-views, templates), file a project block too, after a `cmp` of the project copy.
- Enforced by: `skills/route-failure/references/routing.md` §3 (H20); Cerbo's copy synced by H21.
- Interview line: "A fix in the factory isn't a fix in a project that copied the old file, so every copied file
  gets a project change too."

## Evidence

- TRACKER Log 2026-10-10 23:37 CDT FAIL M5-T008 ; TRACKER Approvals 2026-10-11 07:29 CDT harness fix ; 428cd99
- Guard: `cmp "$KIT/scripts/scope-guard.sh" scripts/scope-guard.sh` exits 0
- Factory record: `FINDINGS.md` F29, `HARNESS_CHANGELOG.md` H20, H21
