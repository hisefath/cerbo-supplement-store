---
id: M7-J02
milestone: M7
skill: none (doc job)
---
Owns: docs/security/THREAT_MODEL.md
## Ask
Write a threat model. Sources: docs/architecture/hld.md §5 trust boundaries and §7 invariants, docs/architecture/lld.md §7 invariants/§8 failure modes, docs/security/CHECKLIST.md (SEC ids), db/migrations/*.sql (triggers, grants), server/**, tests/acceptance/** (AT ids by grep on test names).
Format: trust-boundary list, then one table row per threat: id T-n · attacker and goal · attack (concrete, e.g. open another patient's order, tamper price in the request, pay twice in parallel, replay a payment, edit the ledger via the app login, oversell the last unit, cost/fee leak to a patient, session theft, sign-in brute force, cross-site form post, clickjacking, PII to platform staff, log leakage) · defence with file:line · proving test (AT id + file) or "⚠ no test" · residual risk. STRIDE tag per row. End with gaps ranked (⚠ rows).
## Done-when
test -s docs/security/THREAT_MODEL.md && grep -cE '^\| T-[0-9]+' docs/security/THREAT_MODEL.md (≥12)
Rules: read AGENTS.md first. Synthetic data only (example.test users); no secrets. Every claim cites a repo file:line, a D-row, an AT id or a SEC id; anything not in the repo is marked "⚠ not built" — never claim a defence or test that does not exist. Plain words, short sentences. Write result.md at $HANDOFF_DIR/runs/<id>/result.md (status, changed paths, the Done-when output). Commit your owned files on your worktree branch with message "docs(m7/<id>): <summary>" and trailer "Task: <id>".
