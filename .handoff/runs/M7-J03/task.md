---
id: M7-J03
milestone: M7
skill: none (doc + script job)
---
Owns: docs/REVIEWER_GUIDE.md,scripts/evidence-table.sh
## Ask
Write scripts/evidence-table.sh (bash, no new deps) that prints a markdown table: one row per active FR-### in docs/product/prd.md: FR id · its EARS sentence shortened to ≤12 words · milestone (from the PRD Milestone cut) · acceptance test ids that cover it (from every specs/M*/acceptance.md ## Traceability Covers column) · test file paths (grep test names M<N>_AT_### under tests/acceptance). FRs with no AT print "⚠ none". Then docs/REVIEWER_GUIDE.md: "Start here (10 minutes)" reading order with links (README, PRD, HLD, LLD, milestone reports, DECISION_JOURNAL/REVIEW.md, THREAT_MODEL.md, embedding-plan.md, live URL https://web-v2-production-6640.up.railway.app and the demo users from db/seed/demo.ts by email/role only, password lives in the operator's env), "What is stubbed and where the seam is" table (from lld.md §9 seams), "Invariants and how each is enforced" table (hld §7/lld §7), "How to verify" commands (make check, smoke.sh), then the generated evidence table pasted between <!-- evidence:start --> and <!-- evidence:end --> markers with a line saying regenerate with bash scripts/evidence-table.sh.
## Done-when
bash scripts/evidence-table.sh | grep -c '^| FR-' (equals active FR count) && grep -q 'evidence:start' docs/REVIEWER_GUIDE.md
Rules: read AGENTS.md first. Synthetic data only (example.test users); no secrets. Every claim cites a repo file:line, a D-row, an AT id or a SEC id; anything not in the repo is marked "⚠ not built" — never claim a defence or test that does not exist. Plain words, short sentences. Write result.md at $HANDOFF_DIR/runs/<id>/result.md (status, changed paths, the Done-when output). Commit your owned files on your worktree branch with message "docs(m7/<id>): <summary>" and trailer "Task: <id>".
