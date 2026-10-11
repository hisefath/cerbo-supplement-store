---
id: M7-J04
milestone: M7
skill: implement-task (tooling)
---
Owns: scripts/mutation-check.sh,docs/ops/MUTATION.md,Makefile
## Ask
Build a planted-bug (mutation) check for the money code, closing finding F43. Find the money code (fee split, rounding half-up per order, payout, totals, ledger posting, price floor, idempotent pay) under server/ and app/utils by reading lld.md BE rows. scripts/mutation-check.sh: a list of 8-15 mutants, each = file + exact perl one-line substitution + name (e.g. half-up → banker's/floor rounding, fee on cost instead of total, off-by-one cent, drop the row lock FOR UPDATE, skip idempotency key lookup, allow price below floor, swap payout/fee). For each: apply to a temp copy via git stash-safe approach (apply in place, run, then git checkout -- file always via trap), run the fastest test command that covers it (unit tests: npx vitest run --dir tests/unit; acceptance subset with -t filter when needed; test DB at 127.0.0.1:54329 per AGENTS.md), record KILLED/SURVIVED, restore. Fail (exit 1) if any mutant SURVIVED or a substitution did not apply (matched 0 times). Add Makefile target "mutation-check" (NOT in make check: too slow). docs/ops/MUTATION.md: what it is, how to run, the last run's table (pasted real output, date, SHA). Surviving mutants: do not edit tests (tests/acceptance is QA-owned; tests/unit you may NOT edit either in this job) — report them in result.md and MUTATION.md as findings.
## Done-when
make mutation-check (paste output; exit 0 or each SURVIVED listed as a finding) && make check
Rules: read AGENTS.md first. Synthetic data only (example.test users); no secrets. Every claim cites a repo file:line, a D-row, an AT id or a SEC id; anything not in the repo is marked "⚠ not built" — never claim a defence or test that does not exist. Plain words, short sentences. Write result.md at $HANDOFF_DIR/runs/<id>/result.md (status, changed paths, the Done-when output). Commit your owned files on your worktree branch with message "docs(m7/<id>): <summary>" and trailer "Task: <id>".
