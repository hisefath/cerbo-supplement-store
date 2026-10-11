---
id: M6-ACC
milestone: M6
skill: define-acceptance
covers: [FR-032, FR-048, FR-049, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059, FR-060, FR-061, FR-062, FR-063, FR-064, FR-065]
after: []
harness: claude
mode: workspace-write
hitl: false
parallel: false
budget: 1 run, 120 min
---
Owns: specs/M6-measurement-and-operations/acceptance.md,tests/acceptance/M6/

## Ask

M6 acceptance (first pass)

- Milestone M6, folder specs/M6-measurement-and-operations/ (create it). Tests in tests/acceptance/M6/ (QA header, real test database, no fakes beyond lld.md §9 seams).
- In scope: the PRD M6 Milestone cut row (FR-032, FR-048, FR-049, FR-051 to FR-065; AE-029, AE-045, AE-046, AE-048 to AE-062; SC-001 to SC-003), plus NFR-013 and NFR-014 (with the CQ-6 note), and the INV/LINV rows lld.md §7 ties to these FRs (INV-1, INV-4, INV-7, INV-9, INV-10).
- Answered questions you must honour: prd.md CQ-6 (export review), CQ-7 (role none signs in to S15, pages refuse), CQ-8 (AE-049 reworded); lld.md D83 to D87 accepted (D83 bounds, D84 from/event, D85 stock_refusals, D86 five-minute slots).
- Suites: make check runs tests/acceptance/M4, M5, M5.1, M5.2 today. Recommend (as Q-n) that M6 joins make check only in the last M6 task (the M5 Q-2 pattern), and that Done-when lines count passing ids (M5 Q-5).
- No live human: write each interview question as ⚠ Q-n with its recommendation and design tests to that recommendation.
- HITL: none

## Done-when

The define-acceptance skill's own Done when checks pass (run them with $A, $T, $S as the skill says).

## Must not change

- Everything outside Owns. Never edit product code, migrations, the Makefile, docs/**, or other milestones' tests.

## Context manifest

- give: this file; AGENTS.md; the define-acceptance skill; docs/product/prd.md; docs/architecture/lld.md and contracts/openapi.yaml; docs/design/screens.md S9 to S15 and flows.md; docs/architecture/hld.md; tests/acceptance/support/** and tests/acceptance/M5/*.test.ts (patterns, read-only)
- never give: .env, .env.railway, any secret
