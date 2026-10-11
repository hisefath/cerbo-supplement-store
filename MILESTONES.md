# Milestones

One row per milestone = one merge request (WORKFLOW.md §8). The planning rows M1-M3 (Full track) ship
pre-seeded here and the supervisor keeps them (it adds the `M4` row when the human splits Design into M3 HLD / M4
LLD); `slice-tasks` adds each implementation milestone's row at G4; the supervisor updates the **status** column; `report-milestone` and the human fill the SHAs and the tag.

- **status:** planned → in-progress → in-review (MR open, G5 pending) → merged → done
- **done** means merged **and** `make check` re-run on main, with that SHA in *main-check SHA* and in TRACKER Resume.
- **gate SHAs:** the artifact SHA each gate approved, e.g. `G3@abc1234 G4@def5678` (matches the Approvals rows).
- **Planning milestones** (Full track, WORKFLOW.md §8) are docs-only MRs: M1 Research, M2 Product, M3 Design.
  Implementation milestones (tracer bullet first) follow, each with its own acceptance + tasks. Standard track
  (an existing product) deletes no rows and starts at its design-delta milestone.

| id | goal | tasks | D-ids | MR | status | gate SHAs | merge SHA | main-check SHA | tag |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Research: brief + cited research (docs only) | — | D18-D24 | !1 | done | G0 (TRACKER Approvals) | 8ddfc80 | c6a9438 | — |
| M2 | Product: PRD + clarifications (docs only) | — | D25-D31 | !2 | done | G1@998ed94 | 371224a | c6a9438 | — |
| M3 | Design: HLD, LLD, DB design, API contract, diagrams (docs only) | — | D32-D44 | !3 | done | G2@fea2e18 G3@5a984b8 | 8377ce0 | c6a9438 | — |
| M4 | Each person signs in; provider sends an order, patient pays once, the split is recorded and shown to the cent | 11 tasks: T001–T011 (+ T901–T903 deploy gaps) | D45-D56 (close-out D57-D69) | !4 (close-out !5) | done | G1@998ed94 G2@fea2e18 G3@5a984b8 G5@2604a27 | 10a020e (close-out c6a9438) | c6a9438 | — |
