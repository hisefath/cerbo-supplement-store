# Backfill tags for D1–D64

Topic, weight and one-liner for the decisions written before journal entries carried a `- Review:` line
(software-factory-kit WORKFLOW.md §9). `scripts/decision-views.sh` reads this table as if each line were in its
entry, so the project review (`REVIEW.md`) covers the whole history while the journal stays untouched. Approved once
as a whole; a correction is a new decision. Weight: ●●● critical · ●●○ important · ●○○ minor.

| D | Topic | Weight | One-liner |
|---|---|---|---|
| D1 | Infrastructure | ●●● | v1: Laravel 13 on PHP 8.5, set aside with the v1 build. |
| D2 | Data | ●●● | v1: Postgres in production, SQLite in tests, suite run on both. |
| D3 | Money | ●●● | v1: 75 bps fee on the subtotal, once per order, rounded half-up. |
| D4 | Money | ●●● | v1: split stored on the order plus a settlement ledger. |
| D5 | Money | ●●● | v1: reserve, charge outside a transaction, then settle. |
| D6 | Data | ●●○ | v1: stock column plus movement log, decremented at payment. |
| D7 | Infrastructure | ●○○ | v1: outside services stubbed behind seams. |
| D8 | Product | ●●○ | v1: an explicit out-of-scope list. |
| D9 | Process | ●○○ | v1: diagrams as .mmd sources with embedded copies. |
| D10 | Process | ●○○ | v1: changes from a design-review panel accepted. |
| D11 | Data | ●○○ | v1: one stock path through a single method. |
| D12 | Product | ●○○ | v1: order cancel added to scope. |
| D13 | Infrastructure | ●●○ | v1: Railway with a Dockerfile and Railway Postgres. |
| D14 | Product | ●○○ | v1: neutral branding on the public demo. |
| D15 | Process | ●○○ | v1: repo visibility stays the human's step. |
| D16 | Process | ●○○ | v1: changes from a code-review panel accepted. |
| D17 | Data | ●●○ | v1: never edit a migration that already ran in production. |
| D18 | Process | ●●● | Restarted from scratch on a milestone branch with the gated workflow. |
| D19 | Process | ●○○ | Docs-only rules until the stack was designed. |
| D20 | Process | ●○○ | Harness findings F1–F3 routed at M1 close. |
| D21 | Process | ●●○ | Briefs and PRDs name a North Star and the hiring partner's lens. |
| D22 | Process | ●●● | The v1 build in main is set aside: never read, cited or reused. |
| D23 | Process | ●○○ | Full track for the M1 brief. |
| D24 | Process | ●●○ | Research sizes market, competitors and load before design. |
| D25 | Product | ●●● | Money path first, HIPAA-ready, campaigns later. |
| D26 | Security | ●●● | Sign-in, notices without health details, no patient identity for platform staff. |
| D27 | Product | ●●○ | Live payout builder, two-step patient checkout, equation-first audit. |
| D28 | Product | ●●○ | UX contract: 9 screens, six states each, 90-second demo. |
| D29 | Money | ●●○ | Financial report with gross and net; four least-privilege operations roles. |
| D30 | Product | ●○○ | Operations layouts: order funnel, balance-first report, people-list access. |
| D31 | Product | ●○○ | UX contract extended to M6: 14 screens, every key screen demoed. |
| D32 | Infrastructure | ●●● | TypeScript on Node.js with server-rendered Vue, matching Cerbo's front end. |
| D33 | Data | ●●● | PostgreSQL managed by the host. |
| D34 | Infrastructure | ●●○ | Pages and logic deploy together as one app. |
| D35 | Money | ●●● | Split stored on the paid order plus an append-only ledger. |
| D36 | Infrastructure | ●●● | One deployable, built API-first. |
| D37 | Security | ●●○ | Seeded test accounts with server-side sessions. |
| D38 | Infrastructure | ●●● | Nuxt 3 as the web framework, named from model memory. |
| D39 | Data | ●●○ | Kysely queries with plain SQL migrations. |
| D40 | Data | ●●○ | Bigint identity keys, order number = id, random tokens for outside links. |
| D41 | Money | ●●● | One idempotency_keys table plus database backstops stop double charges. |
| D42 | Money | ●●● | Synchronous charge between short transactions; webhooks for production. |
| D43 | Product | ●○○ | Broader holistic-care products parked as a future non-goal. |
| D44 | Infrastructure | ●●● | Nuxt 4, the current major per the npm registry. |
| D45 | Process | ●●○ | M4 built as 9 vertical slices, tracer bullet first. |
| D46 | Process | ●○○ | App code type-checked with vue-tsc inside make check. |
| D47 | Money | ●●○ | A negative payout at payment sends the order to review. |
| D48 | Process | ●○○ | Stacked milestones M1 to M4 merge in order. |
| D49 | Security | ●○○ | node-forge advisory accepted: Nuxt dev tooling only. |
| D50 | Security | ●○○ | braces advisory accepted: build tooling only. |
| D51 | Security | ●○○ | simple-git advisory accepted: Nuxt devtools only. |
| D52 | Security | ●●○ | SameSite cookies plus JSON-only requests as the CSRF defence. |
| D53 | Product | ●○○ | Order quantity unbounded until stock limits exist. |
| D54 | Process | ●○○ | M4 keeps 11 tasks as a one-time exception. |
| D55 | Infrastructure | ●●○ | Demo deployed from the M4 branch before the merge chain. |
| D56 | Data | ●○○ | Demo database runs PostgreSQL 18 while tests run 16. |
| D57 | Process | ●●○ | One script applies, tests, commits and pushes factory changes. |
| D58 | Process | ●●○ | Commit per decision, one MR per milestone, TL;DR first. |
| D59 | Process | ●○○ | This repo's MR template starts with a TL;DR. |
| D60 | Process | ●●○ | A test counts only after it is seen failing on broken code. |
| D61 | Process | ●○○ | scope-guard reads brackets in Owns literally. |
| D62 | Process | ●●○ | Each task's check is one only that task can pass. |
| D63 | Process | ●●○ | Versions in design decisions cite a registry check. |
| D64 | Process | ●○○ | Worker worktrees start from the milestone branch. |
