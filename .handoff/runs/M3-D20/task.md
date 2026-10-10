---
id: M3-D20
milestone: M3
skill: draw-diagrams
covers: []
after: []
harness: claude
mode: workspace-write
hitl: false
parallel: true
budget: 1 run, 15 min
slug: state-payment-attempt
milestone_branch: milestone/m1-research
---
Owns: docs/architecture/diagrams/state-payment-attempt.mmd

## Ask

Draw state-payment-attempt diagram

Draw state-payment-attempt from docs/architecture/lld.md.

- Why claude: Claude subagent is the default worker (CLAUDE.md Dispatch); Codex is not on PATH in this session.

## Done-when

draw-diagrams' own Done-when checks pass, and `bash scripts/scope-guard.sh .handoff/runs/M3-D20/task.md milestone/m1-research` exits 0.

## Must not change

- every path except docs/architecture/diagrams/state-payment-attempt.mmd, above all docs/architecture/*.md

## Consumes / Produces

- Consumes: none
- Produces: none

## Context manifest

- give: this file; AGENTS.md; docs/architecture/lld.md#SM-2 Payment attempt
- never give: other runs, .handoff/TRACKER.md, any secret or PHI

## Return

- Commit on the branch your worktree was started on, with the trailer `Task: M3-D20`; never push or merge.
- Write $HANDOFF_DIR/runs/M3-D20/result.md from specs/_templates/result.md.
