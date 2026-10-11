---
id: M7-J01
milestone: M7
skill: none (doc job)
---
Owns: docs/architecture/embedding-plan.md
## Ask
Write the Cerbo EHR embedding plan. Sources: docs/architecture/hld.md (trust boundaries, containers, NFR-016), docs/product/prd.md (Problem, Constraints, A-rows about Cerbo), docs/research/*.md (anything on Cerbo, its API, iframe/launch), nuxt.config.ts (current CSP incl. frame-ancestors 'self'), server/ auth/session code, docs/decisions/DECISION_JOURNAL.md.
Sections: 1 What exists today (standalone app, stand-in sign-in, CSP). 2 Target: how the pages appear inside Cerbo (which screens become embedded panels in the chart and patient portal). 3 Launch handshake options (e.g. signed launch token / SMART-on-FHIR-style launch / OAuth) with a recommendation and its cost; never invent Cerbo API facts — cite research or mark ⚠. 4 Data that becomes a read from Cerbo (patients, providers, practices) vs stays ours (orders, ledger). 5 Security changes: frame-ancestors allowlist, cookies SameSite=None+Secure+Partitioned in a third-party frame, CSRF/Origin checks, clickjacking. 6 Phases with exit checks. 7 Open questions.
## Done-when
test -s docs/architecture/embedding-plan.md && grep -c '^## ' docs/architecture/embedding-plan.md (≥7)
Rules: read AGENTS.md first. Synthetic data only (example.test users); no secrets. Every claim cites a repo file:line, a D-row, an AT id or a SEC id; anything not in the repo is marked "⚠ not built" — never claim a defence or test that does not exist. Plain words, short sentences. Write result.md at $HANDOFF_DIR/runs/<id>/result.md (status, changed paths, the Done-when output). Commit your owned files on your worktree branch with message "docs(m7/<id>): <summary>" and trailer "Task: <id>".
