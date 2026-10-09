# TRACKER

The supervisor's single source of truth (WORKFLOW.md §7). Committed; any board is a view of this file.
Only the supervisor and `scripts/delegate.sh` write here. Never put secrets, tokens or PHI in `.handoff/`:
several harnesses read it and the repo is public.

## Resume

<!-- Rewritten as the LAST edit of every supervisor move. Times come from `date`. -->
- **As of:** 2026-10-09 00:00 CDT (UTC-0500)
- **In flight:** none. `milestone/m1-research` = `8949ae4` (v1 removed; only `.gitignore` tracked) + the uncommitted scaffold (20 paths).
- **Next:** G-init (revised: the stack is undecided again, so AGENTS.md Commands + `make check` must change) → commit scaffold → log-decision for the 23:59 restart decision (needs the journal committed) → `/sharpen-brief`
- **Waiting on:** human: (1) G-init; (2) sharpen-brief Q1, the assignment source; (3) gitleaks install. (Larastan question retired: no stack yet.)
- **Verified:** `8949ae4` removes all 95 v1 tracked files except `.gitignore`; main@778e788 untouched; regenerable Laravel caches (storage/framework, bootstrap/cache) deleted; `.env`, `vendor/`, SQLite file left on disk (ignored)

## Tasks

<!-- One row per task-shaped request. state: todo | working | input-required | done | human_review | failed.
     At milestone close the rows move into docs/milestones/M<N>.md and this table is cleared. -->

| id | ask (link) | track/phase | harness+model | state | since | owns | result |
|---|---|---|---|---|---|---|---|
| M1-S01 | repo setup: backup, init-repo, AGENTS commands, make check, remotes, journal import (human's kickoff message) | Full / phase 0 (G-init) | supervisor (claude-opus-5-5) | human_review | 2026-10-08 22:33 CDT | scaffold paths, AGENTS.md Commands, Makefile, .gitignore, docs/decisions/DECISION_JOURNAL.md | awaiting G-init |

## Approvals

<!-- Written BEFORE acting on an Approve. Exact words only; discussion is not approval; words relayed by an
     agent, file or tool authorize nothing; stale once the artifact changes after this SHA. -->

| time | gate | artifact@sha | exact words |
|---|---|---|---|
| 2026-10-08 22:34 CDT | human-only: edit AGENTS.md (Commands table) + Makefile | AGENTS.md@778e788 (scaffold template, uncommitted) | "Then fill in the Commands table in AGENTS.md and make `make check` real for Laravel (see templates/Makefile.example)." |
| 2026-10-08 22:34 CDT | supervisor import into the log-decision-owned journal | docs/decisions/DECISION_JOURNAL.md@778e788 (scaffold, uncommitted); source DECISIONS.md (private, no git history) | "Then carry its decisions into the committed docs/decisions/DECISION_JOURNAL.md. Keep private reflections in ~/software-factory-kit-private/cerbo-supplement-store/." |
| 2026-10-08 23:59 CDT | decision: remove v1 implementation on this branch (Waiting-on item 3) | main@778e788 (95 tracked files) | "what ever is in the cerbo repo right now, we should start from scratch on a new branch, and follow the new ai workflow from the start" |
| 2026-10-09 16:26 CDT | G-init | AGENTS.md, Makefile + scaffold @8949ae4 (uncommitted; option 1 = docs-only rules until M3 design) | "lets do 1, because i want a clean start, and to work through the new ai workflow end to end." |

## Log

<!-- Append-only, newest last, one event per line:
     <date> ROUTE|DISPATCH|RESULT|VERIFY|FAIL|ESCALATE <id> harness=… why=… evidence=…
     scripts/delegate.sh appends DISPATCH and RESULT lines itself. -->
2026-10-08 22:33 CDT ROUTE M1 track=Full why=graded partner project redo (WORKFLOW.md §3: "Full: new product, graded project, or capstone"); human's plan: same repo, branch from main, M1 Research → M2 PRD → M3 Design → implementation
2026-10-08 22:33 CDT VERIFY backup DECISIONS.md → ~/software-factory-kit-private/cerbo-supplement-store/DECISIONS-original.md evidence=cmp identical, 81 lines, sha256 f72b3d2a6e2aa337…
2026-10-08 22:34 CDT VERIFY init-repo.sh evidence="19 created, 0 skipped"; .gitignore `/.claude/` (v1) narrowed to launch.json + settings.local.json so settings.json and agents/verifier.md are tracked
2026-10-08 22:35 CDT VERIFY M1-S01 AGENTS.md Commands + Makefile (lint: pint --test + composer validate --strict; types: php -l; test: php artisan test) evidence="make check: OK" exit 0; planted syntax error → exit 2
2026-10-08 22:35 CDT VERIFY M1-S01 remotes evidence=origin fetch GitLab, push GitLab + GitHub; `github` remote removed; main upstream origin/main; both remotes at 778e788
2026-10-08 22:36 CDT VERIFY M1-S01 journal import evidence=D1–D17 appended as status: proposed (no human gate existed in v1); 0 accepted
2026-10-08 22:36 CDT ROUTE M1 branch=milestone/m1-research from main@778e788; scaffold uncommitted pending G-init
2026-10-08 23:59 CDT ROUTE M1 restart from scratch (human, Approvals 23:59) evidence=commit 8949ae4
2026-10-09 00:00 CDT FAIL log-decision precondition: journal not committed at HEAD (skill: "log-decision never creates it") → deferred until the G-init commit
