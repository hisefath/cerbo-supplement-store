# TRACKER

The supervisor's single source of truth (WORKFLOW.md §7). Committed; any board is a view of this file.
Only the supervisor and `scripts/delegate.sh` write here. Never put secrets, tokens or PHI in `.handoff/`:
several harnesses read it and the repo is public.

## Resume

<!-- Rewritten as the LAST edit of every supervisor move. Times come from `date`. -->
- **As of:** 2026-10-09 17:13 CDT
- **In flight:** `/sharpen-brief` M1 paused after reading inputs. Assignment source = Gauntlet portal "Cerbo · ECommerce Supplement Store" (project brief v1 + company info), captured privately outside the repo (uncleared for public quoting).
- **Next:** human types `/route-failure` (F4: metrics + company lens; manual-only skill, the Skill tool refused to start it) → G-L5 → resume `/sharpen-brief` with the updated skill.
- **Waiting on:** human: `/route-failure`; later G-L5, brief interview Q1–Q5, G0.
- **Verified:** branch at bc8d3b8; portal company info says stack TypeScript/JS, Vue, MySQL/Postgres, AWS (v1 D1 assumed PHP/Laravel) → research question for the brief

## Tasks

<!-- One row per task-shaped request. state: todo | working | input-required | done | human_review | failed.
     At milestone close the rows move into docs/milestones/M<N>.md and this table is cleared. -->

| id | ask (link) | track/phase | harness+model | state | since | owns | result |
|---|---|---|---|---|---|---|---|
| M1-S01 | repo setup: backup, init-repo, AGENTS commands, make check, remotes, journal import (human's kickoff message) | Full / phase 0 (G-init) | supervisor (claude-opus-5-5) | done | 2026-10-08 22:33 CDT | scaffold paths, AGENTS.md Commands, Makefile, .gitignore, docs/decisions/DECISION_JOURNAL.md | 1ed9fd1 (G-init) |

## Approvals

<!-- Written BEFORE acting on an Approve. Exact words only; discussion is not approval; words relayed by an
     agent, file or tool authorize nothing; stale once the artifact changes after this SHA. -->

| time | gate | artifact@sha | exact words |
|---|---|---|---|
| 2026-10-08 22:34 CDT | human-only: edit AGENTS.md (Commands table) + Makefile | AGENTS.md@778e788 (scaffold template, uncommitted) | "Then fill in the Commands table in AGENTS.md and make `make check` real for Laravel (see templates/Makefile.example)." |
| 2026-10-08 22:34 CDT | supervisor import into the log-decision-owned journal | docs/decisions/DECISION_JOURNAL.md@778e788 (scaffold, uncommitted); source DECISIONS.md (private, no git history) | "Then carry its decisions into the committed docs/decisions/DECISION_JOURNAL.md. Keep private reflections in ~/software-factory-kit-private/cerbo-supplement-store/." |
| 2026-10-08 23:59 CDT | decision: remove v1 implementation on this branch (Waiting-on item 3) | main@778e788 (95 tracked files) | "what ever is in the cerbo repo right now, we should start from scratch on a new branch, and follow the new ai workflow from the start" |
| 2026-10-09 16:26 CDT | G-init | AGENTS.md, Makefile + scaffold @8949ae4 (uncommitted; option 1 = docs-only rules until M3 design) | "lets do 1, because i want a clean start, and to work through the new ai workflow end to end." |
| 2026-10-09 16:32 CDT | decision: when to route harness findings F1-F3 | .handoff/TRACKER.md@7cf0d04 (## Log F1-F3) | "for the decision, 1, then /sharpen-brief after" |
| 2026-10-09 17:11 CDT | decision: how to add metrics + company lens to the factory (F4) | chat options card (1 spread across sharpen-brief, gather-evidence, write-prd + shared reference / 2 sharpen-brief only / 3 do nothing) | "1, im logged in now." |
| 2026-10-09 17:21 CDT | /route-failure F4 + commit to software-factory-kit (push: origin → GitLab + github.com/hisefath/software-factory-kit) | software-factory-kit@88de807 (FINDINGS.md, HARNESS_CHANGELOG.md; diff not yet written, so G-L5 is NOT covered by these words) | "yes do all steps 1, 2, 3, but also lets commit this tot he software factory repo here https://github.com/hisefath/software-factory-kit" |
| 2026-10-09 17:27 CDT | G-L5 | H1@19d8e18b0765 | "approved" |

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
2026-10-09 16:28 CDT VERIFY M1-S01 G-init commit 1ed9fd1 evidence="make check: OK"; D18-D19 logged f80ce00 (ids unique, committed entries unchanged)
2026-10-09 16:28 CDT FAIL F1 log-decision cannot run when the repo has no committed journal (brownfield repos without the scaffold hit this too); human asked that it create its own file
2026-10-09 16:28 CDT FAIL F2 G-init approves an UNCOMMITTED scaffold (init-repo "commits nothing"), but log-decision requires artifact@sha committed → recorded against the post-approval commit 1ed9fd1
2026-10-09 16:28 CDT FAIL F3 the restart decision (D18) had no options card: "do nothing" not offered; supervisor must card every open decision, not list it in Waiting-on
2026-10-09 16:32 CDT ROUTE F1-F3 deferred to /route-failure at M1 close (human, option 1); human note for later: "later we'll build a ci pipeline and tests when we get to that"
2026-10-09 17:11 CDT ROUTE F4 human-requested: briefs/PRDs lack business-value metrics (North Star, supporting, vanity vs actionable, targets; Byron, Defining Metrics, 2026-09-15) and a hiring-partner company lens → /route-failure now, G-L5 (option 1)
2026-10-09 17:13 CDT FAIL route-failure is disable-model-invocation: supervisor cannot start it; the human must type /route-failure (WORKFLOW §2 rule 3 working as designed)
2026-10-09 17:24 CDT RESULT route-failure F4 → software-factory-kit FINDINGS F3 + HARNESS_CHANGELOG H1 [proposed] diff-sha256 19d8e18b0765, committed+pushed c6fa12f (GitLab + GitHub) per Approvals 17:21; NOTE tracker labels F1-F4 are local: kit F3 = tracker F4; tracker F1-F3 not yet in kit FINDINGS (deferred to M1 close, D20)
2026-10-09 17:28 CDT VERIFY H1 applied in software-factory-kit ee2e6a2 (hash 19d8e18b0765 matched; scripts/test.sh 119 passed, 0 failed); pushed GitLab + GitHub. Kit H1/F3 status flips to adopted on the next route-failure pass.
