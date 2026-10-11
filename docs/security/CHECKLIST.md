---
artifact: security-checklist
milestone: M6
branch: milestone/m6-measurement-and-operations
base_sha: c95695976dc9c0c60423a91cbf82f68a8d2bf063
head_sha: eaf0a52af43136365160c01ec4f4c481a6f0174e
checked: Sun Oct 11 12:45:37 CDT 2026
checker: check-security (Claude Code, claude-opus-5-5)
standard: OWASP ASVS 5.0 Level 1, chapter-level mapping
gate: G5
status: draft
---

# Security checklist: cerbo-supplement-store M6

## Summary

M6 adds seven staff API routes and five staff pages: the financial report and its CSV export (finance lead only), the staff list and role change (SRE only, never on their own account) with an append-only access log, the access-log screen (finance lead only), system health with per-hour request counters and 5-minute uptime pings (SRE only), and platform health with totals per practice (finance lead, operations specialist, data analyst); plus input bounds on price and stock, `from`/`event` on invalid-transition refusals, and one migration that creates three tables and grants the app a column-level `UPDATE (role, role_changed_at)` on `users`. Every new route signs the caller in and checks an allow-list role on the server (role change checks inside BE-18 and logs the refusal); no privilege escalation path was found: only the SRE may change a role, never their own, only on a staff account (no practice), only to a staff role, and the database's role-and-practice check backs that up; the role is re-read on every request, so a removal bites at once. The CSV holds only numbers and fixed words (no formula injection, no patient), the export log line and the request counters record no id, name or path. Two new low findings (SEC-16: a patient or provider who hand-crafts a role-change request gets their own name and free-text reason written to the append-only log the finance lead reads; SEC-17: the request counter adds one database write per counted request, anonymous ones included); the only critical and high findings are the three Nuxt tooling advisories already accepted (D49 to D51) and absent from the built server, so the G5 security condition is met and nothing critical or high is reachable inside Cerbo's EHR.

- **G5 security condition:** met: secrets 0, unaccepted high/critical 0
- **Rows:** 9 pass · 5 fail · 0 n.a. (of 14)
- **Open findings:** 1 critical · 2 high · 1 medium · 6 low
- **Secret scan:** grep heuristic (unverified): 13 hits: 0 secret, 0 revoked, 13 false positive
- **Dependency audit:** `package-lock.json`: npm 11.19.1 `npm audit --package-lock-only` → 15 advisory entries (6 critical, 9 high), the same six root advisories as M5 to M5.2; 14 in the production tree (`--omit=dev`); M6 changes no manifest or lockfile (CMD-7)
- **Accepted risks:** D51 SEC-1, D49 SEC-2, D50 SEC-3, D52 SEC-5, D76 SEC-10, D77 SEC-12, D78 SEC-13, D82 SEC-15
- **Biggest gap:** N4: no verified (gitleaks) history scan has ever run; the grep heuristic is all the secret evidence there is, on a repo with a public mirror

## Scope and method

- **Milestone:** M6 `milestone/m6-measurement-and-operations`; diff `c956959`..`eaf0a52`, 94 files changed (CMD-3); every non-doc path read in full (CMD-4). Local `main` still points at `c956959` (the M5.1 merge), so the diff also carries the M5.2 changes already checked at M5.2 (`e94fe57`, merged as `c9b890d` on `origin/main`); they are covered again below
- **Milestone kind:** code (CMD-4 lists 56 non-doc paths under `app/`, `server/`, `db/`, `tests/`, plus `Makefile` and `.githooks/pre-push`)
- **Trust boundaries in play:** TB-1 internet to web app (seven new `/api/ops/**` routes, five new `/ops/**` pages, `/healthz` now writes); TB-2 web app to database (one new migration with new grants, three new tables, a role update on `users`). TB-3 to TB-5 unchanged: no outbound call, config, manifest or host change (CMD-7, CMD-15) (from `docs/architecture/hld.md` §5, unchanged in this diff, CMD-3)
- **Change plan security field:** no change plan (greenfield)
- **Inherited findings routed here:** no AUDIT.md
- **Tools on PATH:** gitleaks absent, osv-scanner absent, pnpm absent, composer absent, npm 11.19.1 (CMD-5)
- **Tests cited:** `make check` at eaf0a52 (CMD-6) → exit 0; the M6 acceptance suite proves the role refusals (`tests/acceptance/M6/roles.test.ts:48`, :60, :135), the access log's append-only grant (`tests/acceptance/M6/roles.test.ts:167`), removal on the next request (:172), the 403s on every new route and no patient identity on staff answers (`tests/acceptance/M6/platform-health.test.ts:146`, :165)

## Checklist

Status: `pass`, `fail` or `n.a.`; no evidence is `fail`. Evidence: `path:line` or `CMD-<n>` plus its result.

| ID | Area | ASVS 5.0 | Status | Evidence | Finding |
|---|---|---|---|---|---|
| CK-01 | Authentication | V6 | pass | Every new API route starts with `requireViewer` (401 without a live session): `server/api/ops/finance/report.get.ts:10`, `server/api/ops/finance/export.get.ts:11`, `server/api/ops/access-log.get.ts:11`, `server/api/ops/health.get.ts:11`, `server/api/ops/system-health.get.ts:11`, `server/api/ops/staff/index.get.ts:8`, `server/api/ops/staff/[userId]/role.put.ts:11`. New pages sit under the existing page guard and send a 401 answer to sign-in with the `safeNext`-checked `next` (CMD-11). `/healthz` stays public by design and returns only "ok" or "unavailable" (`server/routes/healthz.get.ts:23`). No sign-in or password change (CMD-7) | — |
| CK-02 | Session management | V7 | pass | No cookie or timeout change (`server/services/session.ts:196` unchanged, CMD-4). The role is read from `users` on every request (`server/services/session.ts:180`), so a removed role is refused on the next request (M6_AT_028, `tests/acceptance/M6/roles.test.ts:172`, CMD-6) | — |
| CK-03 | Access control and IDOR | V8 | pass | Deny-by-default allow lists (`server/services/access-policy.ts:16`): report, export and access log need `FINANCE_ROLES` (:50), staff list and system health `SRE_ROLES` (:52), platform health `PLATFORM_HEALTH_ROLES` (:48); the report service checks again (`server/services/finance-report.ts:134`, :141). Role change: only the SRE, never their own account (`server/services/access-policy.ts:62`); the target must be a staff account with no practice, else 404 (`server/services/staff-access.ts:80`); the new role must be a staff role (`server/services/staff-access.ts:18`) and the database refuses any role that does not match the practice column (`db/migrations/1760000001000_core-orders.sql:23`); the target and every finance lead are locked before the update (`server/services/staff-access.ts:93`). Tests: M6_AT_016, M6_AT_019, M6_AT_020, M6_AT_025, M6_AT_032, M6_AT_038 and M6_AT_008 (`tests/acceptance/M6/financial-report.test.ts:113`, `tests/acceptance/M6/roles.test.ts:48`, :60, :135, `tests/acceptance/M6/access-log.test.ts:46`, `tests/acceptance/M6/system-health.test.ts:89`, `tests/acceptance/M6/platform-health.test.ts:165`), green in CMD-6 | — |
| CK-04 | Input validation and injection | V1, V2 | fail | New input is allow-listed: month `YYYY-MM`, dates round-tripped, period at most 366 days, limit 1 to 100, keyed cursors checked as real instants (`server/utils/paging.ts:47`, :54, :67, :26); role body is a strict schema with enums and a 200-character reason (`server/services/staff-access.ts:17`), user id `^\d{1,18}$` (`server/api/ops/staff/[userId]/role.put.ts:13`). D83 bounds price at 10,000,000 cents and stock at ±1,000,000 (`server/services/pricing.ts:17`, `server/services/stock-adjustments.ts:17`). New SQL is Kysely with bound parameters only (CMD-9). Row stays fail on the accepted SEC-10 and SEC-12 (the price-history cursor still passes `Date.parse` only, `server/services/pricing.ts:88`) | SEC-10, SEC-12 |
| CK-05 | Output encoding and XSS | V1, V3 | pass | No `v-html`, `innerHTML` or `dangerouslySetInnerHTML` in `app/` or `server/` (CMD-10, 0 hits); names and reasons on S12 and S13 reach the page through Vue text interpolation (`app/pages/ops/access-log.vue:85`). CSV: every cell is an integer or a fixed word, so none can start with `=`, `+`, `-` or `@` (`server/services/finance-report.ts:63`, proved at `tests/unit/finance-report.test.ts:123`); sent as `text/csv` attachment (`server/api/ops/finance/export.get.ts:19`) | — |
| CK-06 | CSRF | V3 | fail | The one new write, EP-37, is a PUT that needs a JSON body and an Idempotency-Key header (`server/api/ops/staff/[userId]/role.put.ts:15`, `server/services/idempotency.ts:43`), which forces a CORS preflight no config allows. The export GET writes only a log line (`server/api/ops/finance/export.get.ts:18`); `/healthz` GET records an uptime slot but is unauthenticated and idempotent (`server/routes/healthz.get.ts:22`). Row stays fail on the accepted M5 findings | SEC-5, SEC-13 |
| CK-07 | Secrets and cryptography | V11, V13 | pass | Secret scan: 13 tree hits and 8 history commits, all false positive; no tracked env file (CMD-12, CMD-13, CMD-14). No secret, token or crypto code in the diff (CMD-4) | — |
| CK-08 | Errors and logging (no PII or secrets) | V16 | pass | The diff adds three log calls (CMD-8): the export line logs actor id, period dates and row count only (`server/api/ops/finance/export.get.ts:18`); the two best-effort writes log `errorFacts` (`server/services/request-metrics.ts:73`, :83). Request counters store only a fixed route group, never an id, name or query (`server/services/request-metrics.ts:43`, :46; proved at `tests/unit/request-metrics.test.ts:49`), meeting NFR-010. Problem bodies add only a status and an event name (`server/services/orders.ts:160`) | — |
| CK-09 | Data protection | V14 | fail | Staff answers carry no patient identity: the report names providers and practices only (`server/services/finance-report.ts:89`), the CSV order numbers only (`server/services/finance-report.ts:59`), platform health totals per practice (`server/services/platform-health.ts:97`), the staff list only accounts with no practice (`server/services/staff-access.ts:63`); proved by M6_AT_007 and M6_AT_013 (`tests/acceptance/M6/platform-health.test.ts:146`, `tests/acceptance/M6/financial-report.test.ts:68`). `/api/**` and `/ops/**` are no-store (`nuxt.config.ts:43`, :45) and the export sets it itself (`server/api/ops/finance/export.get.ts:21`). Gap: a refused role change by any signed-in caller is logged with that caller's name (`server/services/staff-access.ts:86`), so a patient who crafts one appears on S13. S15 gap stays (SEC-15, accepted D82) | SEC-15, SEC-16 |
| CK-10 | TLS verified | V12 | pass | No outbound client, `http://` URL or verification switch added (CMD-15, 0 hits); HSTS unchanged (`nuxt.config.ts:25`, CMD-7) | — |
| CK-11 | Configuration and headers | V13, V3 | pass | `nuxt.config.ts`, `package.json` and the lockfile untouched (CMD-7): CSP with `frame-ancestors 'self'` (`nuxt.config.ts:21`), devtools off (`nuxt.config.ts:33`). The new Nitro plugin only counts requests (`server/plugins/request-metrics.ts:9`). The pre-push change is a local harness file, not shipped (`.githooks/pre-push:25`) | — |
| CK-12 | Dependencies | V15 | fail | `package-lock.json` committed; no manifest or lockfile change in M6 (CMD-7). npm audit still reports the accepted Nuxt and kysely-codegen tooling advisories (CMD-16, exit 1; CMD-17) | SEC-1, SEC-2, SEC-3 |
| CK-13 | Business logic and money integrity | V2 | pass | The report and export read ledger entries alone, in one repeatable-read transaction (`server/services/finance-report.ts:130`), and flag any order whose four entries do not balance (`server/services/finance-report.ts:104`); unit tests at `tests/unit/finance-report.test.ts:96`, :128. Migration grants (CMD-18): `access_log` select and insert only (`db/migrations/1760000014000_operations-access.sql:39`, UPDATE and DELETE refused with 42501 at `tests/acceptance/M6/roles.test.ts:167`); `request_stats` select, insert, update, no delete (:41); `health_pings` select, insert (:42); `users` only the columns `role` and `role_changed_at` (:44), the same column-level pattern as M5's stock grant; the down migration revokes it (:47). Role change and its granted row commit together (`server/services/staff-access.ts:90`); the last finance lead cannot be removed without confirmation (`server/services/staff-access.ts:45`) | — |
| CK-15 | APIs and webhooks | V4 | fail | All seven new routes authenticate and check the role (CK-01, CK-03); responses carry only the fields the openapi schemas list (`server/services/staff-access.ts:50`, `server/services/platform-health.ts:121`). Gap: the request-metrics plugin writes one upsert per counted request, signed-in or not, unawaited (`server/plugins/request-metrics.ts:19`), and no rate limit covers the new read routes | SEC-17 |

## LLM risks

n.a.: no model call in code (CMD-19 → only non-code hits: `.claude/settings.json:6`, an agent plugin setting, not a model call); no model container in docs/architecture/hld.md.

## Secret scan

- **Scanner:** grep heuristic (unverified)
- **Scope:** working tree + tracked env files + history commit list
- **Commands:** CMD-12 → 13 tree hits: `.handoff/reviews/M6-diff.patch` (4), `docs/milestones/M5.1.md` (3), `docs/milestones/M5.2.md` (3), `docs/milestones/M5.md` (2), `docs/security/CHECKLIST.md` (1); CMD-13 → exit 1, no tracked env file; CMD-14 → 8 commits: `eaf0a52` (the M6 diff patch), `8f18a05` (docs/milestones/M5.2.md), `e94fe57` (docs/security/CHECKLIST.md), `c26710a`, `691b4e1`, `b045719`, `8949ae4`, `cc64669` (public/.htaccess, triaged at M4)
- **History (heuristic only):** H1 (CMD-14)
- **Open secrets:** 0

Locations only. Never a value.

| Hit | Location | Rule or kind | Triage | Finding |
|---|---|---|---|---|
| H1 | history: `public/.htaccess:14 @cc64669` (removed at `8949ae4` and at `b045719`) | token=… pattern | false positive: an Apache rewrite rule copying the X-XSRF-Token request header into an environment variable; no credential value | — |
| H2 | `docs/milestones/M5.md:637` (added at `691b4e1`) | secret=… pattern | false positive: the M5 report's G5 count line (`secrets=` followed by a count); no credential value | — |
| H3 | `docs/milestones/M5.md:828` (added at `691b4e1`) | secret=… pattern | false positive: the same G5 count text in the M5 report's security summary | — |
| H4 | `docs/milestones/M5.1.md:417` (added at `c26710a`) | secret=… pattern | false positive: the M5.1 report's Done-when count line | — |
| H5 | `docs/milestones/M5.1.md:572` (added at `c26710a`) | secret=… pattern | false positive: the same count text in the M5.1 merge recommendation | — |
| H6 | `docs/milestones/M5.1.md:583` (added at `c26710a`) | secret=… pattern | false positive: the same count text in the M5.1 security line | — |
| H7 | `docs/milestones/M5.2.md:333` (added at `8f18a05`) | secret=… pattern | false positive: the M5.2 report's Done-when count line | — |
| H8 | `docs/milestones/M5.2.md:459` (added at `8f18a05`) | secret=… pattern | false positive: the same count text in the M5.2 merge recommendation | — |
| H9 | `docs/milestones/M5.2.md:470` (added at `8f18a05`) | secret=… pattern | false positive: the same count text in the M5.2 security line | — |
| H10 | `.handoff/reviews/M6-diff.patch:3897` (added at `eaf0a52`) | secret=… pattern | false positive: the patch's copy of H7 | — |
| H11 | `.handoff/reviews/M6-diff.patch:4023` (added at `eaf0a52`) | secret=… pattern | false positive: the patch's copy of H8 | — |
| H12 | `.handoff/reviews/M6-diff.patch:4034` (added at `eaf0a52`) | secret=… pattern | false positive: the patch's copy of H9 | — |
| H13 | `.handoff/reviews/M6-diff.patch:4266` (added at `eaf0a52`) | secret=… pattern | false positive: the patch's copy of the M5.2 checklist's H4 row, which quotes the count text | — |
| H14 | `docs/security/CHECKLIST.md:78` at the head (added at `e94fe57`) | secret=… pattern | false positive: the M5.2 checklist's H4 row quoting the count text; this file replaces it | — |

## Dependency audit

| Lockfile | Tool + version | Command | Exit | Result | Findings |
|---|---|---|---|---|---|
| `package-lock.json` | npm 11.19.1 | CMD-16, CMD-17 | 1 | 15 advisory entries: 6 critical, 9 high, 0 moderate, 0 low; production tree (`--omit=dev`): 6 critical, 8 high. Root advisories unchanged from M5: simple-git (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5), @simple-git/argv-parser (GHSA-v5rq-49vh-5v5c), node-forge (GHSA-86w9-cpqp-85rv), braces (GHSA-vfj7-8cjw-p6xm) | SEC-1, SEC-2, SEC-3 |

- **Packages added or upgraded in this milestone:** none (CMD-7)
- **Manifests without a committed lockfile:** none

## Threat and invariant trace

| HLD id | What the design says (mitigation or invariant, short) | Checked in | Result |
|---|---|---|---|
| TH-1 | server sessions; secure, HTTP-only, same-site cookie; 15-minute idle; sign-in rate limit | CK-01, CK-02 | pass (unchanged; every new route calls `requireViewer`) |
| TH-2 | server ignores browser prices | CK-13 | pass (D83 adds an upper bound; prices still computed on the server) |
| TH-3 | rate limits on sign-in and pay; idempotent payment | CK-15 | pass for sign-in and pay (unchanged); new metric writes per request: SEC-17 |
| TH-4 | every API call checked against the person's orders or practice; unknown and forbidden look the same | CK-03 | pass (new routes allow-listed by role; role change 404s non-staff targets) |
| TH-5 | operations read de-identified views | CK-09 | pass for report, export, platform health and staff list (M6_AT_007); fail: SEC-16 (a refusing patient's own name on S13) |
| TH-6 | only the SRE changes roles, never their own | CK-03 | pass (`server/services/access-policy.ts:62`, M6_AT_019, M6_AT_020) |
| TH-7 | append-only histories of price, stock, role | CK-13 | pass (`access_log` insert-only, 42501 test) |
| TH-8 | app user cannot change append-only records; database checks the split | CK-13 | pass (new grants checked, CMD-18) |
| TH-9 | database password only in the host's secret store; private network | CK-07 | pass in code (unchanged); host side not checked (N3) |
| TH-10 | verify a real provider's signature (later); stub in-process now | CK-15 | n.a.: stub gateway in-process, no inbound call |
| TH-11 | notices carry only practice name and sign-in link | CK-09 | pass (notice code unchanged) |
| TH-12 | deploys human-only; host account two-factor | CK-11 | n.a.: host account settings are outside the code (N3) |
| INV-1 | split adds up to the cent | CK-13 | pass (unchanged; the report now flags any order that does not) |
| INV-2 | paid at most once | CK-13 | pass (unchanged; refusals only gain `from` and `event`) |
| INV-3 | whole cents only | CK-13 | pass (report and CSV in integer cents) |
| INV-4 | paid money records, ledger, price, stock and access histories never changed or deleted | CK-13 | pass for the app role (`access_log` grant, 42501 test); the demo reset now also empties the access log (`db/seed/demo.ts:40`, Q5) |
| INV-5 | stock never below zero | CK-13 | pass (and now at most 1,000,000, D83) |
| INV-6 | payout never below $0.00 | CK-13 | pass (unchanged) |
| INV-7 | people see only their own or their practice's orders; operations never see patient identity | CK-03, CK-09 | pass for every M6 report and list; fail: SEC-16 |
| INV-8 | checkout pays the prices fixed at checkout start | CK-13 | pass (unchanged) |
| INV-9 | report totals equal the ledger | CK-13 | pass (ledger-only reads, repeatable read, `tests/unit/finance-report.test.ts:138`) |
| INV-10 | only the SRE changes roles, never their own | CK-03 | pass (M6_AT_019, M6_AT_020, M6_AT_025) |

## Diff coverage

| Path | Rows touched | Note |
|---|---|---|
| `db/migrations/1760000014000_operations-access.sql` | CK-04, CK-13 | access_log (insert-only), request_stats, health_pings; column-level role update grant on users |
| `db/seed/demo.ts` | CK-13 | demo reset also empties the three new tables (Q5) |
| `server/api/ops/finance/report.get.ts` | CK-01, CK-03 | EP-34, finance lead only |
| `server/api/ops/finance/export.get.ts` | CK-01, CK-03, CK-05, CK-08, CK-09 | EP-35 CSV; one log line with actor id, period, row count; no-store |
| `server/api/ops/access-log.get.ts` | CK-01, CK-03, CK-04 | EP-38, finance lead only; cursor and month validated |
| `server/api/ops/health.get.ts` | CK-01, CK-03, CK-09 | EP-33 platform health, totals only |
| `server/api/ops/system-health.get.ts` | CK-01, CK-03 | EP-39, SRE only |
| `server/api/ops/staff/index.get.ts` | CK-01, CK-03, CK-09 | EP-36, SRE only, staff accounts only |
| `server/api/ops/staff/[userId]/role.put.ts` | CK-01, CK-03, CK-04, CK-06 | EP-37 role change; strict body; Idempotency-Key |
| `server/services/access-policy.ts` | CK-03 | role allow lists; only the SRE, never self |
| `server/services/staff-access.ts` | CK-03, CK-09, CK-13 | BE-18 role change with locks and the access log; refused rows logged (SEC-16) |
| `server/services/finance-report.ts` | CK-03, CK-05, CK-09, CK-13 | BE-17 report and CSV from the ledger only |
| `server/services/platform-health.ts` | CK-09 | BE-16 totals per practice, no order id or patient |
| `server/services/request-metrics.ts` | CK-08, CK-15 | BE-19 counters by fixed route group; uptime slots; system health |
| `server/plugins/request-metrics.ts` | CK-11, CK-15 | per-request counter hook (SEC-17) |
| `server/routes/healthz.get.ts` | CK-01, CK-06 | public health check now records its 5-minute slot |
| `server/utils/paging.ts` | CK-04 | month, period, limit and cursor validation |
| `server/utils/problem.ts` | CK-08 | keeps the problem slug on the event for the stock-refusal count |
| `server/utils/db-types.ts` | none | types for the three new tables |
| `server/services/pricing.ts` | CK-04 | D83 price ceiling |
| `server/services/stock-adjustments.ts` | CK-04, CK-13 | D83 stock bounds; FOR NO KEY UPDATE (D84) |
| `server/services/stock.ts` | CK-13 | FOR NO KEY UPDATE lock (D84) |
| `server/services/orders.ts` | CK-08 | invalid-transition carries `from` and `event` (D85) |
| `server/services/payments.ts` | CK-08 | same (D85) |
| `app/pages/ops/finance.vue` | CK-05 | S11 report; export is a same-origin link with the period query |
| `app/pages/ops/access.vue` | CK-05 | S12 staff list and role dialog |
| `app/pages/ops/access-log.vue` | CK-05, CK-09 | S13 access log, text interpolation only |
| `app/pages/ops/health.vue` | CK-05 | S10 platform health |
| `app/pages/ops/system.vue` | CK-05 | S14 system health |
| `app/pages/ops/orders/[orderId].vue` | CK-05 | S4 shows the refusal message |
| `app/pages/index.vue` | CK-01, CK-03, CK-09 | S15 landing (M5.2, re-covered) |
| `app/error.vue` | CK-05, CK-08 | fixed error page (M5.2, re-covered) |
| `app/utils/role-home.ts` | CK-03 | constant role-to-page table, now with the M6 pages |
| `app/components/` | CK-05 | MonthPicker, RoleDialog, OrderFunnel, MoneyEquation, ProblemMessage: display and form components, no raw HTML (CMD-10) |
| `tests/acceptance/M5.2/landing.test.ts` | CK-01, CK-03 | M5.2 acceptance, AT-001 narrowed for M6 |
| `tests/acceptance/M6/` | CK-03, CK-09, CK-13 | M6 acceptance: role refusals, append-only log, 403s, no patient identity |
| `tests/unit/` | CK-04, CK-05, CK-08, CK-13 | paging, CSV, request-metrics, staff-access, bounds unit tests |
| `.githooks/pre-push` | CK-11 | harness only, not shipped |
| `Makefile` | none | adds the M5.2 and M6 acceptance suites to `make check` |
| `MILESTONES.md` | none | milestone table |
| `docs/` | none | PRD, LLD, openapi, diagrams, decisions, screens, runbook, M5.2 report and checklist |
| `specs/` | none | M5.2 and M6 acceptance and task specs |
| `.handoff/` | none | supervisor state, run jobs, the diff patches and reviews |

## Findings

| ID | Source | Severity | Finding | Evidence | Reachable | Recommend | Disposition | State |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | dependency | critical | simple-git up to 4.0.1 and @simple-git/argv-parser below 2.0.1 allow git command execution past the unsafe-operation guard (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c); pulled in by @nuxt/devtools | CMD-16 | no: devtools off (`nuxt.config.ts:33`) and absent from `.output/server` (Log 2026-10-10 15:47 CDT build check; M6 changes no lockfile, CMD-7) | accept | accepted (D51) | open |
| SEC-2 | dependency | high | node-forge accepts forged RSA PKCS#1 v1.5 signatures (GHSA-86w9-cpqp-85rv); pulled in by listhen (the Nuxt dev server) through nitropack and @nuxt/cli | CMD-16 | no: dev server only, absent from `.output/server` (same build check) | accept | accepted (D49) | open |
| SEC-3 | dependency | high | braces allows stack-exhaustion denial of service on crafted glob patterns (GHSA-vfj7-8cjw-p6xm); pulled in by micromatch, fast-glob and globby under nuxt build tooling and kysely-codegen | CMD-16 | no: build-time only, absent from `.output/server` (same build check) | accept | accepted (D50) | open |
| SEC-4 | CK-05, CK-10, CK-11 | medium | The app sends no security headers: no Content-Security-Policy with frame-ancestors, no X-Content-Type-Options, no Referrer-Policy, no HSTS | `nuxt.config.ts:13` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-5 | CK-06 | medium | No anti-CSRF token or Origin check; protection rests on SameSite=Lax and JSON-only bodies, which weakens if the app is embedded in the EHR iframe with SameSite=None | `server/services/session.ts:196` | no: SameSite=Lax today; even embedded, every write needs JSON plus a custom Idempotency-Key header, which forces a CORS preflight that no CORS config allows | accept | accepted (D52) | open |
| SEC-6 | CK-02 | medium | No absolute session lifetime: a session kept active never expires | `server/services/session.ts:157` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-7 | CK-08 | medium | Unexpected errors are logged as whole error objects; a PostgreSQL constraint error includes the failing row with order amounts, against NFR-010 | `server/utils/problem.ts:85` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-8 | CK-09 | medium | Order, session and operations responses carry no Cache-Control: no-store, so a shared clinic browser or proxy may keep order details | `nuxt.config.ts:40` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-9 | CK-15 | medium | The pay endpoint has no per-person or per-address rate limit, which TH-3 names; idempotency stops double charges but not floods | `server/services/payments.ts:58` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-10 | CK-04 | low | Order line quantity has no upper bound in validation; since FR-025 the send refuses more than is in stock (`server/services/orders.ts:60`, AT-014), so only a stock count large enough to overflow the integer total still reaches the 500; D83 now caps stock at 1,000,000, which keeps the total far below the overflow | `server/api/orders/index.post.ts:13` | yes: only with an extreme stock count, now impossible under D83 | accept | accepted (D76) | open |
| SEC-11 | CK-09 | low | sign_in_attempts keeps typed emails (including mistyped ones of other people) and client addresses with no retention rule; rows are pruned only when someone signs in | `server/tasks/prune-attempts.ts:14` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-12 | CK-04 | low | Out-of-range input returns a 500 instead of a 422. M6-T006 (D83, `d5fdfbc`) closed the price and stock parts; what is left is a price-history cursor whose date JavaScript parses but PostgreSQL rejects | `server/services/pricing.ts:88` | yes: signed-in provider only, hand-crafted cursor; no data exposed, error facts logged without values | accept | accepted (D77) | open |
| SEC-13 | CK-06 | low | GET EP-21 now writes: viewing an in_checkout order ends a due hold or closes an abandoned payment; a cross-site top-level GET can trigger it, but only a transition that is already due, for an order the viewer may see | `server/services/orders.ts:312` | yes: no attacker benefit, the write is time-driven and idempotent | accept | accepted (D78) | open |
| SEC-14 | CK-13 | low | No test proves stock_movements refuses UPDATE and DELETE, which INV-4 names; the grant enforces it (insert-only) but a later migration could widen it unnoticed | `db/migrations/1760000013000_stock-movements.sql:26` | no: the grant is in place today | fix | fix (AT-044, Approvals 2026-10-10 23:59 CDT) | fixed @ae240c2 (CMD-6) |
| SEC-15 | CK-09 | low | The S15 home at `/` shows the signed-in person's display name and role name but `/` has no `Cache-Control: no-store` rule, so a shared clinic browser's back button or cache may show it to the next person after sign-out | `nuxt.config.ts:42` | yes: only on a shared browser, only the previous person's own name and role, no order data; HTTPS rules out shared proxies | accept | accepted (D82) | open |
| SEC-16 | CK-09 | low | EP-37 logs a refused row for any signed-in caller, so a patient or provider who hand-crafts a role-change PUT (no page offers it) puts their own display name and up to 200 characters of their own text into the append-only access log the finance lead reads on S13, against INV-7's letter; nothing limits how many such rows a caller adds, the app cannot remove them, and the 403-versus-404 answer tells the caller which user ids are staff | `server/services/staff-access.ts:86` | yes: signed-in patient or provider only, by a deliberate crafted request; it exposes only the attacker's own name and words, no order or health data | accept | pending G5 | open |
| SEC-17 | CK-15 | low | The request-metrics plugin adds one database upsert per counted request, including signed-out page loads such as `/sign-in`, all landing on the same hourly row per route group; under a request flood these unawaited writes compete with real requests for database connections, and no rate limit covers the new read routes | `server/plugins/request-metrics.ts:19` | yes: anyone on the internet, but harm is slower answers only; no data exposed, failed writes never fail a request (`server/services/request-metrics.ts:72`) | accept | pending G5 | open |

## Accepted risks

| D-id | Finding | Severity | Human's words (verbatim) | Revisit if | Follow-up |
|---|---|---|---|---|---|
| D51 | SEC-1 | critical | "Approve, accept SEC-1" | simple-git appears in .output/server, devtools are switched on, or a Nuxt 4 release ships patched devtools. | upgrade when a patched Nuxt release exists |
| D49 | SEC-2 | high | "Approve, accept SEC-2" | node-forge appears in .output/server, the app starts verifying signatures (for example real payment webhooks), or a Nuxt 4 release removes the advisory. | upgrade when a patched release exists |
| D50 | SEC-3 | high | "Approve, accept SEC-3" | braces appears in .output/server, the app matches file patterns from user input, or patched Nuxt and kysely-codegen releases exist. | upgrade when patched |
| D52 | SEC-5 | medium | "Approve, add T011 and run it" | the app is embedded in an iframe or the session cookie moves to SameSite=None, or a write endpoint accepts a non-JSON body. | none |
| D53 | SEC-10 | low | "Approve, add T011 and run it" | M5 adds stock limits (FR-025), or a real user hits the 500. | trigger met in M5; superseded by D76 |
| D76 | SEC-10 | low | accept (re-decided after FR-025) — STANDING row 2026-10-10 23:09 CDT: "i approve all next recommendations until project completion" | a real user hits the 500, or stock limits are removed | none |
| D77 | SEC-12 | low | accept — STANDING row 2026-10-10 23:09 CDT: "i approve all next recommendations until project completion" | a real user hits one, or the routes open to patients | none |
| D78 | SEC-13 | low | accept — STANDING row 2026-10-10 23:09 CDT: "i approve all next recommendations until project completion" | a GET handler gains a write that is not time-driven, or a job runner arrives | none |
| D82 | SEC-15 | low | accept — STANDING row 2026-10-10 23:09 CDT: "i approve all next recommendations until project completion" | S15 starts to show order or health data, or the app runs on shared clinic machines inside the EHR. | none |

## Not checked

| ID | What | Why not | Risk of the gap | Who closes it |
|---|---|---|---|---|
| N1 | Live TLS certificate, HTTPS redirect and response headers on the deployed app | check-security sends no requests to deployments | the host could differ from config | ship-milestone (G-live) |
| N2 | The sign-in and pay limits' client address behind Railway's proxy (`TRUST_PROXY=1`, last X-Forwarded-For entry, `server/services/session.ts:84`) | needs live traffic | if the proxy's last entry is not the client, every visitor shares one bucket or a client can spoof its bucket | ship-milestone (G-live) |
| N3 | Host account settings: secret store, private database network, two-factor sign-in (TH-9, TH-12) | outside the repo | a leaked host account is the key to everything | the human |
| N4 | A verified secret scan of full history with gitleaks | gitleaks not on PATH; installing is not allowed here | the grep heuristic can miss credential formats it does not know, on a repo with a public mirror | the human or CI: `gitleaks git --redact --no-banner -v .` |
| N5 | Whether advisory code (simple-git, node-forge, braces) is in the built server | closed at M4 by the supervisor's build check (Log 2026-10-10 15:47 CDT); not re-run here. M6 changes no manifest or lockfile (CMD-7) | a later dependency change could pull one in; D49 to D51 name that trigger | re-check on any lockfile change that adds a dependency tree |
| N6 | Database connection TLS to the managed PostgreSQL | depends on the host's private network | traffic between app and database could be readable on the host network | ship-milestone |
| N7 | The in-EHR embed itself: launch-token verification and framing by Cerbo's origin | the app is not embedded yet: `frame-ancestors 'self'` blocks framing (`nuxt.config.ts:21`) and no launch handler exists (D55 names this as a pre-embed fix) | when embedded, the cookie moves to SameSite=None and the launch identity becomes a trust boundary this checklist has never seen; who may hold the SRE role then depends on Cerbo's identity, not demo passwords | the milestone that embeds the app (CK-16 then applies) |
| N8 | The built bundle's font and stylesheet URLs in production (`.output/public/_nuxt/`) | check-security runs no build or serve | a production-only asset setting could move assets to another origin; none is set (`nuxt.config.ts:9` holds `cdnURL:""`) | ship-milestone (G-live) |
| N9 | The production build's error responses for a page request that fails with a 500 | needs a production build and a forced server error | if a production payload carried an error message, a signed-in person could read a server detail in page source; no secret or PHI path is known | ship-milestone (G-live) |
| N10 | That the migration ran as the owner role and the live app role holds exactly the M6 grants (CMD-18 reads the SQL, not the live database) | check-security never connects to a deployment's database | a hand-run grant on the host could widen what the app may change | ship-milestone (G-live): `\dp access_log` and `\dp users` on the deployed database |

## Questions

| ID | Question | Why it matters | Recommended answer | Blocks |
|---|---|---|---|---|
| Q1 | ⚠ Does `nuxt build` output (`.output/server`) contain simple-git, node-forge or braces? | decided whether SEC-1 to SEC-3 ship to production | answered 2026-10-10 15:47 CDT (tracker Log, VERIFY SEC-1): none of them is in `.output/server`; M6 adds no dependency | nothing |
| Q2 | ⚠ Every seeded demo person, including the SRE, shares one demo password (`db/seed/demo.ts:63`); now that M6 lets the SRE account change roles, should it get its own password? | anyone holding the demo password can sign in as the SRE and change roles on the public demo; since the same password already opens the finance lead and every other account, role change adds no new reach | not before G5: it is not an escalation while every demo account shares the password; give role-changing accounts their own password (or keep them out of the public demo) if the demo password is ever handed to someone who should not hold every role, and rely on Cerbo's identity once embedded (N7) | nothing |
| Q3 | ⚠ D53's revisit trigger ("M5 adds stock limits (FR-025)") has happened; re-accept SEC-10? | an accepted risk whose trigger fired becomes a decision again | answered 2026-10-10 23:59 CDT (Approvals G5 SEC-10): re-accepted as D76 | nothing |
| Q4 | ⚠ The M5.1 branch moved during that run; re-run after M5.1-T005? | the M5.1 checklist went stale at the next commit | answered 2026-10-11 08:20 CDT by the M5.1 re-run at `e54eca8`; M5.1 merged (`c956959`) | nothing |
| Q5 | ⚠ The demo reset empties the append-only price, stock and ledger histories and, since M6, the access log (`db/seed/demo.ts:40`), which INV-4 otherwise forbids. Should it refuse to run once the database holds real, non-demo data? | today it is human-run with the owner role, needs `DEMO_RESET=yes` (`db/seed/demo.ts:62`), and production setup skips it (`docs/runbooks/deploy.md:153`); with real patients it would erase money, stock and role records | no action while the deployment is a demo; before real patients, make the reset refuse on a production marker or remove it from the production image | nothing |
| Q6 | ⚠ Local `main` is at `c956959` while `origin/main` has the M5.2 merge `c9b890d`; should the supervisor fast-forward local `main` before the next run? | `base_sha` follows local `main`, so this diff re-covers M5.2's 12 paths; the checks are unaffected but the file count is larger than M6 alone (82 files against `c9b890d`) | yes, fast-forward local `main` (a supervisor git action); no re-run needed for this checklist | nothing |

## Commands run

- **CMD-1** `date` → exit 0 · Sun Oct 11 12:45:37 CDT 2026
- **CMD-2** `git branch --show-current`; `git status --porcelain -- . ':!docs/milestones' ':!.handoff' ':!docs/security/CHECKLIST.md'`; `git rev-parse milestone/m6-measurement-and-operations` → exit 0 · on the milestone branch, empty status, eaf0a52af43136365160c01ec4f4c481a6f0174e
- **CMD-3** `git merge-base main milestone/m6-measurement-and-operations`; `git diff --stat c956959 milestone/m6-measurement-and-operations`; `git rev-parse main origin/main` → exit 0 · c95695976dc9c0c60423a91cbf82f68a8d2bf063; 94 files, 16058 insertions, 451 deletions; `docs/architecture/hld.md` not among them; origin/main is c9b890d (82 files from there)
- **CMD-4** `git diff --name-only c956959 HEAD` filtered to non-doc paths, then every one of them read in full (`git diff c956959 HEAD -- server db app Makefile .githooks tests`, plus `cat` of each new server file) → exit 0 · 56 paths
- **CMD-5** `command -v gitleaks osv-scanner pnpm npm; npm --version` → npm present, gitleaks, osv-scanner and pnpm absent, npm 11.19.1
- **CMD-6** `make check` at eaf0a52 → exit 0 · 337 unit passed (21 files), 43 M4 acceptance (5 files), 44 M5 acceptance (5 files), 5 M5.1 (1 file), 5 M5.2 (1 file), 44 M6 acceptance (6 files), make check: OK
- **CMD-7** `git diff --name-only c956959 HEAD -- nuxt.config.ts package.json package-lock.json` → exit 0 · empty (no config, manifest or lockfile change)
- **CMD-8** `git diff c956959 HEAD -- server` added lines matching `console.` → exit 0 · 3 lines: the export's privileged-action line (actor id, from, to, rows) and two `errorFacts` warnings
- **CMD-9** `git diff c956959 HEAD -- server` added lines matching `sql.raw`, `sql.lit`, `exec(`, `child_process`, `eval(` or template interpolation → exit 0 · only Kysely `sql` tagged templates whose values are bound parameters (period dates, category, counts); no raw or literal SQL, no shell
- **CMD-10** `git grep -nE 'v-html/innerHTML/dangerouslySetInnerHTML' -- app server` → exit 1 · 0 hits
- **CMD-11** `git diff c956959 HEAD -- app` added lines matching `navigateTo/https?:///v-html/localStorage/console.` → exit 0 · only constant paths (`/sign-in` with `next: route.fullPath`, the `ROLE_PAGES` path) and same-page `month`/`from`/`to` query changes; no external URL, no storage, no log
- **CMD-12** `git grep -nIiE "$P" -- . ':!vendor' ':!node_modules' ':!*.lock' ':!package-lock.json' ':!*.min.js' / cut -d: -f1-2` → exit 0 · 13 hits: .handoff/reviews/M6-diff.patch:3897, :4023, :4034, :4266; docs/milestones/M5.1.md:417, :572, :583; docs/milestones/M5.2.md:333, :459, :470; docs/milestones/M5.md:637, :828; docs/security/CHECKLIST.md:78
- **CMD-13** `git ls-files / grep -E '(^/\/)\.env' / grep -vE '\.(example/sample/dist/template)$'` → exit 1 · none
- **CMD-14** `git log --all -E -i -G"$P" --format='%h %ad' --date=short --name-only -- …` → exit 0 · eaf0a52 (.handoff/reviews/M6-diff.patch), 8f18a05 (docs/milestones/M5.2.md), e94fe57 (docs/security/CHECKLIST.md), c26710a, 691b4e1, b045719, 8949ae4, cc64669 (public/.htaccess)
- **CMD-15** `git diff c956959 HEAD -- app server db` added lines matching `https?://`, `rejectUnauthorized`, `NODE_TLS`, `fetch(` → exit 1 · 0 hits
- **CMD-16** `npm audit --package-lock-only` (and `--json`) → exit 1 · 15 vulnerabilities (9 high, 6 critical); advisories GHSA-858h-whjf-mvg5, GHSA-86w9-cpqp-85rv, GHSA-g4wm-2vf7-vfgr, GHSA-v5rq-49vh-5v5c, GHSA-vfj7-8cjw-p6xm, GHSA-x6jw-m9v5-85vh
- **CMD-17** `npm audit --package-lock-only --omit=dev` → exit 1 · 14 vulnerabilities (8 high, 6 critical)
- **CMD-18** `grep -rn -i 'grant/revoke' db/migrations/*.sql` → exit 0 · M6 adds `select, insert` on access_log, `select, insert, update` on request_stats, `select, insert` on health_pings, `update (role, role_changed_at)` on users, and its down migration revokes the users grant; earlier grants unchanged
- **CMD-19** `git grep -nIiE 'openai/anthropic/…/llamaindex' -- . ':!vendor' ':!node_modules' ':!docs' ':!specs' ':!.handoff' ':!*.md'` → exit 0 · 1 hit, `.claude/settings.json:6` (agent plugin setting, not a model call)
