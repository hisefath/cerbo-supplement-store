---
id: M6-LLD
milestone: M6
skill: design-lld
covers: [FR-032, FR-048, FR-049, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059, FR-060, FR-061, FR-062, FR-063, FR-064, FR-065]
after: []
harness: claude
mode: workspace-write
hitl: false
parallel: false
budget: 1 run, 120 min
---
Owns: docs/architecture/lld.md,docs/architecture/contracts/openapi.yaml

## Ask

M6 design-lld delta pass

- Pass: delta for milestone M6-measurement-and-operations (lld.md's first draft already covers M4-M6; every M6 FR has a Requirement trace row). Mark changed rows (changed)/(new), add one Change log row.
- Reconcile every M6 row (BE-16 to BE-19, EP-10 to EP-14, EP-33 to EP-40, FE-17 to FE-21, FE-24, SEQ-8 to SEQ-12, tables request_stats, health_pings, access_log, users role changes) with the code M4, M5 and M5.1 shipped (server/**, app/**, db/migrations/**): names, signatures, problem types, pagination, the M5.1 Theme paragraph, the site-root page.
- Fold in these routed design catch-up items (from .handoff/reviews/M5-pass*.md, dispositions in .handoff/TRACKER.md ## Approvals):
  - attention items carry the patient's name and order total (M5-pass6 R4) — check screens.md S6 first;
  - upper bounds for price_cents and stock change/quantity, answered 422 not 500 (M5-pass1 R2, M5-pass5 R1; journal D77 accepted the 500 for now: propose the bound as a D-row, do not silently change);
  - 422 for an unknown or malformed cursor, in the contract (M5-pass1 R5, M5-pass5 R5, M5-pass6 R8);
  - one shared paging helper (M5-pass5 R7);
  - `reserveForOrder` signature as built (M5-pass3 R5);
  - SEQ-2 step order: the one-in-flight attempt insert comes before reserving stock (M5-pass3 R3, as built);
  - FOR NO KEY UPDATE on products (M5-pass3 R6): propose as a D-row;
  - Q-8 invalid-transition `from`/`event` members (open since M5) and the M5-pass7 R2 lesson: the client cannot tell why a transition was refused;
  - D41, D42, D72 still marked proposed in lld.md although the journal accepted them: mark them as the journal says.
- New decisions are proposed D-rows numbered from D82 (the journal's last is D81).
- HITL: none

## Done-when

The design-lld skill's own "Done when" checks all print nothing (run them as the skill says, with N=6).

## Must not change

- docs/product/prd.md, docs/design/**, docs/decisions/**, .handoff/** (except this run's result.md), code, tests.
- Accepted decisions in docs/decisions/DECISION_JOURNAL.md are constraints.

## Context manifest

- give: this file; AGENTS.md; the design-lld skill; docs/product/prd.md (M6 row, FR-032..FR-065, NFR-013, NFR-014, SC-001..003); docs/architecture/hld.md; docs/architecture/lld.md; docs/architecture/contracts/openapi.yaml; docs/design/screens.md (S6, S9 to S14); docs/decisions/DECISION_JOURNAL.md; .handoff/reviews/M5-pass1..7.md; .handoff/TRACKER.md ## Approvals (read only); the code under server/, app/, db/migrations/
- never give: .env, .env.railway, any secret; worker self-reports under .handoff/runs/*/result.md
