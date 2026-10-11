---
id: M5-D01
milestone: M5
skill: draw-diagrams
covers: []
after: []
harness: claude
mode: workspace-write
hitl: false
parallel: true
budget: 1 run, 15 min
slug: erd
milestone_branch: milestone/m5-prices-and-stock
---
Owns: docs/architecture/diagrams/erd.mmd

## Ask

Redraw erd

Redraw erd from docs/architecture/lld.md#1-data-model: the M5-R01 catch-up changed this section (lld.md Change log, revise row of 2026-10-10).

- Why claude: Claude subagent is the default worker (CLAUDE.md Dispatch).

## Done-when

draw-diagrams' own Done-when checks pass, and `bash scripts/scope-guard.sh .handoff/runs/M5-D01/task.md milestone/m5-prices-and-stock` exits 0.

## Must not change

- every path except docs/architecture/diagrams/erd.mmd, above all docs/architecture/*.md

## Consumes / Produces

- Consumes: none
- Produces: none

## Context manifest

- give: this file; AGENTS.md; docs/architecture/lld.md#1-data-model
- never give: other runs/, worker self-reports

## Return

write $HANDOFF_DIR/runs/M5-D01/result.md
