---
id: M3-D03
milestone: M3
skill: draw-diagrams
covers: []
after: []
harness: claude
mode: workspace-write
hitl: false
parallel: true
budget: 1 run, 15 min
slug: deployment
milestone_branch: milestone/m1-research
---
Owns: docs/architecture/diagrams/deployment.mmd

## Ask

Draw deployment diagram

Draw deployment from docs/architecture/hld.md.

- Why claude: Claude subagent is the default worker (CLAUDE.md Dispatch); Codex is not on PATH in this session.

## Done-when

draw-diagrams' own Done-when checks pass, and `bash scripts/scope-guard.sh .handoff/runs/M3-D03/task.md milestone/m1-research` exits 0.

## Must not change

- every path except docs/architecture/diagrams/deployment.mmd, above all docs/architecture/*.md

## Consumes / Produces

- Consumes: none
- Produces: none

## Context manifest

- give: this file; AGENTS.md; docs/architecture/hld.md#11-deployment-view
- never give: other runs, .handoff/TRACKER.md, any secret or PHI

## Return

- Commit on the branch your worktree was started on, with the trailer `Task: M3-D03`; never push or merge.
- Write $HANDOFF_DIR/runs/M3-D03/result.md from specs/_templates/result.md.
