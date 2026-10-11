---
id: M4-SEC2   milestone: M4   skill: check-security   covers: [security]   after: []
harness: claude   mode: workspace-write   hitl: false   parallel: true   budget: 1 run, 40 min
milestone_branch: milestone/m4-security-recheck
---
Owns: docs/security/CHECKLIST.md
## Ask
Re-run check-security for M4 on what is now on main (this branch is main @ 74cafcf plus this job file): the M4 code
including M4-T011's hardening and the T901-T903 deploy gaps. This is a re-run (step 10): keep every SEC/H/N/Q id,
mark findings the code now fixes as `fixed @<sha> (CMD-n)`, and copy dispositions verbatim from
`.handoff/TRACKER.md ## Approvals` rows whose gate cell names `G5 SEC-<n>` and from DECISION_JOURNAL D49-D53.
Default branch for this run: use DEF=778e788 (the v1 main the previous run's base_sha used). M4 is already merged,
so merge-base with today's main would be this branch's own head and the diff would be empty; 778e788 keeps the same
scope and ids as the previous checklist (base_sha 778e788).
Triage policy from the human (2026-10-10): only critical and high findings reachable in the expected deployment
(the demo on Railway now, embedded in Cerbo's EHR later) block; recommend accept for medium, low and unreachable.
## Done-when
The check-security Done-when block prints `ALL CHECKS PASSED` with S set to the skill folder, DEF=778e788 and
MB=milestone/m4-security-recheck.
## Must not change
every path outside Owns.
## Consumes / Produces
Consumes: the committed code at this branch head. Produces: docs/security/CHECKLIST.md for the supervisor to merge.
## Context manifest
give: AGENTS.md, docs/architecture/hld.md, docs/decisions/DECISION_JOURNAL.md, .handoff/TRACKER.md ## Approvals, docs/security/CHECKLIST.md ; never give: other runs/, worker self-reports, .handoff/reviews/**
## Return
write $HANDOFF_DIR/runs/M4-SEC2/result.md
