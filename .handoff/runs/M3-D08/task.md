---
id: M3-D08
milestone: M3
skill: draw-diagrams
covers: []
after: []
harness: claude
mode: workspace-write
hitl: false
parallel: true
budget: 1 run, 15 min
slug: sequence-pay-order
milestone_branch: milestone/m1-research
---
Owns: docs/architecture/diagrams/sequence-pay-order.mmd

## Ask

Draw sequence-pay-order diagram

Draw sequence-pay-order from docs/architecture/lld.md.

- Why claude: Claude subagent is the default worker (CLAUDE.md Dispatch); Codex is not on PATH in this session.

## Done-when

draw-diagrams' own Done-when checks pass, and `bash scripts/scope-guard.sh .handoff/runs/M3-D08/task.md milestone/m1-research` exits 0.

## Must not change

- every path except docs/architecture/diagrams/sequence-pay-order.mmd, above all docs/architecture/*.md

## Consumes / Produces

- Consumes: none
- Produces: none

## Context manifest

- give: this file; AGENTS.md; docs/architecture/lld.md#SEQ-2 Review and pay an order
- never give: other runs, .handoff/TRACKER.md, any secret or PHI

## Return

- Commit on the branch your worktree was started on, with the trailer `Task: M3-D08`; never push or merge.
- Write $HANDOFF_DIR/runs/M3-D08/result.md from specs/_templates/result.md.
