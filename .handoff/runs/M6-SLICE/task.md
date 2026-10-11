---
id: M6-SLICE
milestone: M6
skill: slice-tasks
covers: [FR-032, FR-048, FR-049, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059, FR-060, FR-061, FR-062, FR-063, FR-064, FR-065]
after: [M6-ACC]
harness: claude
mode: workspace-write
hitl: false
parallel: false
budget: 1 run, 90 min
---
Owns: specs/M6-measurement-and-operations/tasks/,MILESTONES.md

## Ask

Slice M6 into at most 10 task files

- Inputs are approved: G1 prd.md (clarify pass 4), G3 lld.md (M6 delta, D83-D87 accepted), G-ux screens.md, G4 acceptance part (specs/M6-measurement-and-operations/acceptance.md, Q-1 to Q-13 answered with their recommendations, waivers recorded in its Change log).
- Answers to honour: acceptance Q-1 (M6 joins make check only in the last M6 task, with a test-acceptance-m6 target), Q-2 (Done-when counts passing ids), Q-11 (M5.2 AT-001 already narrowed; the task that adds sre/data_analyst/finance pages to ROLE_PAGES in app/utils/role-home.ts must keep make check green).
- Lessons from M5 and M5.1 (put them in each relevant task): Owns lines may contain bracketed Nuxt paths (scope-guard now matches them literally); every new .vue file reads colours only from app/assets/css/theme.css (M5.1 AT-002 scans app/**); pages wrap their h1 in `page-band` (M5.1 AT-004 pattern); wrong-role pages use ProblemMessage, which adds "Go to your home".
- Migrations: new SQL files in db/migrations (never edit one that ran); production migrations are a human-run step.
- No live human: take your recommended answer for every interview question and list it under Assumed answers.
- HITL: none

## Done-when

The slice-tasks skill's own Done when checks pass, including the analyze script's RESULT: PASS.

## Must not change

- acceptance.md, tests/**, docs/**, code, .handoff/** (except this run's result.md).

## Context manifest

- give: this file; AGENTS.md; the slice-tasks skill; docs/product/prd.md; docs/architecture/lld.md; docs/architecture/contracts/openapi.yaml; docs/design/screens.md; docs/design/flows.md; specs/M6-measurement-and-operations/acceptance.md; tests/acceptance/M6/**; specs/M5-prices-and-stock/tasks/T001.md (pattern); MILESTONES.md; docs/decisions/DECISION_JOURNAL.md; the code tree (read)
- never give: .env, .env.railway, any secret
