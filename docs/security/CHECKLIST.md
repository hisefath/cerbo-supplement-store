---
artifact: security-checklist
milestone: M4
branch: milestone/m4-tracer-bullet
base_sha: 778e788ffa704760aa593353b8cbdea6e98edabd
head_sha: 0d19347c46390868b117467540a28aa2a6a859d9
checked: 2026-10-10 15:46 CDT
checker: check-security (Claude Code, claude-opus-5-5)
standard: OWASP ASVS 5.0 Level 1, chapter-level mapping
gate: G5
status: draft
---

# Security checklist: cerbo-supplement-store M4

## Summary

M4 adds the first running code: sign-in with server-side sessions, provider order sending, the test payment with a recorded split, reviewer views and cancel, on Nuxt 4 with PostgreSQL. The application code holds up on authentication, access control, injection, secrets and money integrity, but the dependency audit reports 6 critical and 9 high advisories inside Nuxt's own tooling, and the app sends no security headers, so the G5 security condition is not met until you decide those findings.

- **G5 security condition:** not met: secrets 0, unaccepted high/critical 3
- **Rows:** 4 pass · 10 fail · 0 n.a. (of 14)
- **Open findings:** 1 critical · 2 high · 6 medium · 2 low
- **Secret scan:** grep heuristic (unverified): 1 hit: 0 secret, 0 revoked, 1 false positive
- **Dependency audit:** `package-lock.json`: npm 11.19.1 `npm audit --package-lock-only` → 15 advisory entries (6 critical, 9 high); 14 of them reach the production dependency tree (`--omit=dev`), all through `nuxt` and `kysely-codegen` tooling
- **Accepted risks:** none
- **Biggest gap:** Q1: whether the critical simple-git and high node-forge and braces code ends up in the built server (`.output`); no build was inspected, so their reachability is unknown

## Scope and method

- **Milestone:** M4 `milestone/m4-tracer-bullet`; diff `778e788`..`0d19347`, 263 files changed (CMD-3). The branch also carries the unmerged M1 to M3 planning work and the removal of the v1 Laravel app (D48), so the diff includes those deletions.
- **Milestone kind:** code (CMD-4 lists non-doc paths under `app/`, `server/`, `db/`)
- **Trust boundaries in play:** TB-1 internet to web app (every route); TB-2 between roles (patient, provider, operations roles); TB-3 web app to database (grants, triggers); TB-4 web app to outside providers (stub payment and messaging, in-process); TB-5 host platform (not deployed yet) (from `docs/architecture/hld.md` §5)
- **Change plan security field:** no change plan (greenfield)
- **Inherited findings routed here:** no AUDIT.md
- **Tools on PATH:** gitleaks absent, osv-scanner absent, pnpm absent, npm 11.19.1, composer present (no composer.lock at the head) (CMD-5)
- **Tests cited:** `make check` at 0d19347 → exit 0, 96 unit and 43 M4 acceptance tests passed (CMD-6)

## Checklist

Status: `pass`, `fail` or `n.a.`; no evidence is `fail`. Evidence: `path:line` or `CMD-<n>` plus its result.

| ID | Area | ASVS 5.0 | Status | Evidence | Finding |
|---|---|---|---|---|---|
| CK-01 | Authentication | V6 | pass | Every non-public route calls `requireViewer` first (CMD-7: `server/api/orders/index.post.ts:17`, `server/api/ops/orders/index.get.ts:10`, `server/api/patients/[patientId]/catalog.get.ts:9` and the rest); public by design: EP-15 sign-in, EP-24 notice. Passwords use scrypt with a timing-safe compare (`server/services/session.ts:41`, :54); sign-in limited to 10 per 15 minutes per email or address (`server/services/session.ts:71`, :115); seed accounts exist only in `tests/acceptance/support/people.ts:47` | — |
| CK-02 | Session management | V7 | fail | Cookie HttpOnly, Secure, SameSite=Lax, token never in a URL (`server/services/session.ts:180`); a new 32-byte token per sign-in (`server/services/session.ts:131`); idle limit 15 minutes (`server/services/session.ts:22`); sign-out ends the session server-side (EP-16). No absolute session lifetime: an always-active session never expires (CMD-8) | SEC-6 |
| CK-03 | Access control and IDOR | V8 | pass | Ownership and role checks in `server/services/access-policy.ts:16`, :22, :30, :41, called before any state read; unknown and forbidden orders both answer 404; proven by AT-007, AT-008, AT-022, AT-025, AT-043, AT-044 in `make check` (CMD-6) | — |
| CK-04 | Input validation and injection | V1, V2 | fail | Request bodies are Zod strict objects (`server/api/orders/index.post.ts:11`), JSON-only (`server/utils/problem.ts:50`); every query is Kysely-parameterised, the one raw template binds its values (`server/services/session.ts:100`, CMD-9); no shell, eval or deserialisation (CMD-9). Order line quantity has no upper bound (`server/api/orders/index.post.ts:13`) | SEC-10 |
| CK-05 | Output encoding and XSS | V1, V3 | fail | Vue templates auto-escape and no `v-html`, `innerHTML` or `dangerouslySetInnerHTML` exists (CMD-10, 0 hits); no Content-Security-Policy is set anywhere (CMD-11, 0 hits; `nuxt.config.ts:2` has no headers) | SEC-4 |
| CK-06 | CSRF | V3 | fail | No anti-CSRF token or Origin check exists (CMD-11). Protection rests on SameSite=Lax cookies (`server/services/session.ts:180`) and JSON-only bodies (`server/utils/problem.ts:50`), which a cross-site form cannot send; an in-EHR iframe would need SameSite=None and then has no CSRF defence | SEC-5 |
| CK-07 | Secrets and cryptography | V11, V13 | pass | Secret scan: 0 tree hits, 1 history hit triaged false positive (CMD-12, CMD-13, CMD-14); no tracked env file (CMD-13); `.env` ignored (`.gitignore:3`); DATABASE_URL read from the environment (`server/utils/db.ts:10`); tokens from `randomBytes` (`server/services/session.ts:131`, `server/services/messaging.ts:19`); scrypt and `timingSafeEqual` (`server/services/session.ts:54`). The test database password in `.env.example:2` and `docker-compose.yml` is a local test-only value | — |
| CK-08 | Errors and logging (no PII or secrets) | V16 | fail | Clients get a generic `internal` problem with only an instance id (`server/utils/problem.ts:72`); Nuxt devtools off (`nuxt.config.ts:4`). But the unexpected-error log writes the whole error object (`server/utils/problem.ts:73`), and a PostgreSQL constraint error carries the failing row (order amounts and ids), which NFR-010 forbids in logs; `server/services/payment-gateway.ts:22` and `server/services/payments.ts:117` also log whole errors | SEC-7 |
| CK-09 | Data protection | V14 | fail | Operations queries select no patient column (`server/services/ops-order-queries.ts:85`, AT-023); notices hold only practice name and sign-in path (`server/services/messaging.ts:35`, AT-017); no card data (stub gateway). Missing: `Cache-Control: no-store` on order and session responses (CMD-11, 0 hits); `sign_in_attempts` keeps typed emails and addresses with no retention rule (`db/migrations/1760000006000_sign-in-attempts.sql:6`) | SEC-8, SEC-11 |
| CK-10 | TLS verified | V12 | fail | No outbound HTTP client and no verification switch anywhere (CMD-15, 0 hits): payment and messaging are in-process stubs. Production HTTPS forcing (HSTS) is not configured (CMD-11, 0 hits) | SEC-4 |
| CK-11 | Configuration and headers | V13, V3 | fail | Devtools disabled (`nuxt.config.ts:4`); build tools sit in devDependencies (`package.json`). No security headers at all: no CSP with frame-ancestors, no nosniff, no Referrer-Policy, no HSTS (CMD-11, 0 hits) | SEC-4 |
| CK-12 | Dependencies | V15 | fail | `package-lock.json` committed; npm audit reports 6 critical and 9 high (CMD-16, exit 1), 14 in the production tree (CMD-17); every added package has a decision (D33, D39, D44, D46) | SEC-1, SEC-2, SEC-3 |
| CK-13 | Business logic and money integrity | V2 | pass | Prices come from the server (`server/services/orders.ts:66`, :71), never the request (`server/api/orders/index.post.ts:11` accepts ids and quantities only); integer cents in every money column (`db/migrations/1760000002000_payments-ledger.sql:48`, :66); split and payout checks (`db/migrations/1760000002000_payments-ledger.sql:10`, :12); one success per order (`db/migrations/1760000002000_payments-ledger.sql:54`); ledger balance at commit (`db/migrations/1760000002000_payments-ledger.sql:100`); paid orders frozen (`db/migrations/1760000002000_payments-ledger.sql:28`); idempotency keys; proven by AT-006, AT-009 to AT-011, AT-021, AT-026 to AT-030, AT-038, AT-041 in `make check` (CMD-6) | — |
| CK-15 | APIs and webhooks | V4 | fail | Every API route authenticated (CK-01) and sign-in rate-limited (`server/services/session.ts:71`). The pay endpoint has no per-person or per-address rate limit, which TH-3 names (CMD-18, 0 hits outside session.ts). No inbound webhook exists (stub gateway) | SEC-9 |

## LLM risks

n.a.: no model call in code (CMD-19 → only non-code hits: `.claude/settings.json:6`, a disabled agent plugin name in tool settings, not a model call); no model container in docs/architecture/hld.md.

## Secret scan

- **Scanner:** grep heuristic (unverified)
- **Scope:** working tree + tracked env files + history commit list
- **Commands:** CMD-12 → exit 0, 0 tree hits; CMD-13 → exit 0, no tracked env file; CMD-14 → 2 commits (`cc64669` added, `8949ae4` removed) touching `public/.htaccess`
- **History (heuristic only):** H1 (CMD-14)
- **Open secrets:** 0

Locations only. Never a value.

| Hit | Location | Rule or kind | Triage | Finding |
|---|---|---|---|---|
| H1 | history: `public/.htaccess:14 @cc64669` (removed at `8949ae4`) | token=… pattern | false positive: an Apache rewrite rule copying the X-XSRF-Token request header into an environment variable; no credential value | — |

## Dependency audit

| Lockfile | Tool + version | Command | Exit | Result | Findings |
|---|---|---|---|---|---|
| `package-lock.json` | npm 11.19.1 | CMD-16, CMD-17 | 1 | 15 advisory entries: 6 critical, 9 high, 0 moderate, 0 low; production tree (`--omit=dev`): 6 critical, 8 high. Root advisories: simple-git (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5), @simple-git/argv-parser (GHSA-v5rq-49vh-5v5c), node-forge (GHSA-86w9-cpqp-85rv), braces (GHSA-vfj7-8cjw-p6xm); the rest inherit (nuxt, @nuxt/devtools, @nuxt/cli, @nuxt/nitro-server, @nuxt/vite-builder, listhen, nitropack, micromatch, fast-glob, globby, kysely-codegen). npm's only offered fixes are downgrades (nuxt 3.7.4, kysely-codegen 0.6.1) | SEC-1, SEC-2, SEC-3 |

- **Packages added in this milestone:** kysely 0.29.6, nuxt 4.5.2, pg 8.23.0, vue 3.5.43, zod 4.6.5; dev: @nuxt/test-utils, @types/pg, kysely-codegen, node-pg-migrate, typescript, vitest: toolchain bootstrap (Approvals 2026-10-10 11:32 CDT, D33, D39, D44); vue-tsc 3.3.11: D46 (CMD-20)
- **Manifests without a committed lockfile:** none (`composer.json` and `composer.lock` were deleted with the v1 app)

## Threat and invariant trace

| HLD id | What the design says (mitigation or invariant, short) | Checked in | Result |
|---|---|---|---|
| TH-1 | server sessions; secure, HTTP-only, same-site cookie; 15-minute idle; sign-in rate limit | CK-01, CK-02 | pass (no absolute lifetime: SEC-6) |
| TH-2 | server ignores browser prices | CK-13 | pass |
| TH-3 | rate limits on sign-in and pay; idempotent payment | CK-15 | fail: SEC-9 (pay not rate-limited) |
| TH-4 | every API call checked against the person's orders or practice; unknown and forbidden look the same | CK-03 | pass |
| TH-5 | operations read de-identified views | CK-09 | pass |
| TH-6 | only the SRE changes roles, never their own | CK-03 | n.a.: no role-change endpoint in M4 (EP-34 to EP-37 are M6) |
| TH-7 | append-only histories of price, stock, role | CK-13 | n.a.: price, stock and role histories arrive in M5 and M6; order money history covered by INV-4 |
| TH-8 | app user cannot change append-only records; database checks the split | CK-13 | pass |
| TH-9 | database password only in the host's secret store; private network | CK-07 | pass in code (`server/utils/db.ts:10`); host side not checked (N3) |
| TH-10 | verify a real provider's signature (later); stub in-process now | CK-15 | n.a.: stub gateway in-process, no inbound call |
| TH-11 | notices carry only practice name and sign-in link | CK-09 | pass |
| TH-12 | deploys human-only; host account two-factor | CK-11 | n.a.: host account settings are outside the code (N3) |
| INV-1 | split adds up to the cent | CK-13 | pass |
| INV-2 | paid at most once | CK-13 | pass |
| INV-3 | whole cents only | CK-13 | pass |
| INV-4 | paid money records and ledger never changed or deleted | CK-13 | pass |
| INV-5 | stock never below zero | CK-13 | n.a.: stock movement is M5 |
| INV-6 | payout never below $0.00 | CK-13 | pass |
| INV-7 | people see only their own or their practice's orders; operations never see patient identity | CK-03 | pass |
| INV-8 | checkout pays the prices fixed at checkout start | CK-13 | n.a.: hold expiry (FR-037) is outside M4; held prices are paid but not tested beyond AT-005 |
| INV-9 | report totals equal the ledger | CK-13 | n.a.: financial report is M6 |
| INV-10 | only the SRE changes roles, never their own | CK-03 | n.a.: role changes are M6 |

## Diff coverage

| Path | Rows touched | Note |
|---|---|---|
| `server/` | CK-01 to CK-13, CK-15 | all new M4 API routes, services and utilities |
| `app/` | CK-05, CK-06, CK-11 | new Nuxt pages and components; also the deleted v1 Laravel `app/` classes |
| `db/` | CK-03, CK-09, CK-13 | four SQL migrations: tables, checks, triggers, grants |
| `tests/` | CK-03, CK-13 | acceptance and unit tests; deleted v1 PHP tests |
| `package.json` | CK-12 | new manifest |
| `package-lock.json` | CK-12 | new lockfile, audited |
| `nuxt.config.ts` | CK-08, CK-11 | devtools off, no headers |
| `tsconfig.json` | none | type-check configuration |
| `docker-compose.yml` | CK-07 | local test database with a test-only password |
| `.env.example` | CK-07 | test database URL only |
| `.gitignore` | CK-07 | ignores `.env` files |
| `Makefile` | none | build and test commands |
| `scripts/` | none | workflow scripts (delegate, scope-guard, embed-diagrams) |
| `.githooks/` | none | pre-push runs make check |
| `.gitlab/` | none | merge request template |
| `.claude/` | none | agent definitions |
| `.github/` | none | deleted v1 CI |
| `bootstrap/` | none | deleted v1 Laravel |
| `config/` | none | deleted v1 Laravel config |
| `database/` | none | deleted v1 Laravel migrations and seeders |
| `public/` | CK-07 | deleted v1 files; one history hit (H1) |
| `resources/` | none | deleted v1 Blade views |
| `routes/` | none | deleted v1 routes |
| `storage/` | none | deleted v1 placeholders |
| `artisan` | none | deleted v1 |
| `composer.json` | CK-12 | deleted v1 manifest |
| `composer.lock` | CK-12 | deleted v1 lockfile |
| `phpunit.xml` | none | deleted v1 |
| `Dockerfile` | none | deleted v1 image |
| `.dockerignore` | none | deleted v1 |
| `.editorconfig` | none | deleted |
| `.gitattributes` | none | deleted |
| `README.md` | none | deleted |
| `AGENTS.md` | none | agent rules |
| `CLAUDE.md` | none | agent rules |
| `MILESTONES.md` | none | milestone table |
| `docs/` | none | documentation only |
| `specs/` | none | specifications only |
| `.handoff/` | none | supervisor state |

## Findings

| ID | Source | Severity | Finding | Evidence | Reachable | Recommend | Disposition | State |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | dependency | critical | simple-git up to 4.0.1 and @simple-git/argv-parser below 2.0.1 allow git command execution past the unsafe-operation guard (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c); pulled in by @nuxt/devtools | CMD-16 | unknown: devtools is off (`nuxt.config.ts:4`) and the app never runs git, but the built server output was not inspected (Q1) | investigate | pending G5 | open |
| SEC-2 | dependency | high | node-forge accepts forged RSA PKCS#1 v1.5 signatures (GHSA-86w9-cpqp-85rv); pulled in by listhen (the Nuxt dev server) through nitropack and @nuxt/cli | CMD-16 | unknown: the app verifies no signatures and listhen serves development only, but the built output was not inspected (Q1) | investigate | pending G5 | open |
| SEC-3 | dependency | high | braces allows stack-exhaustion denial of service on crafted glob patterns (GHSA-vfj7-8cjw-p6xm); pulled in by micromatch, fast-glob and globby under nuxt build tooling and kysely-codegen | CMD-16 | unknown: the app passes no user input to glob matching, but the built output was not inspected (Q1) | investigate | pending G5 | open |
| SEC-4 | CK-05, CK-10, CK-11 | medium | The app sends no security headers: no Content-Security-Policy with frame-ancestors, no X-Content-Type-Options, no Referrer-Policy, no HSTS | CMD-11 | yes | fix | pending G5 | open |
| SEC-5 | CK-06 | medium | No anti-CSRF token or Origin check; protection rests on SameSite=Lax and JSON-only bodies, which breaks if the app is embedded in the EHR iframe with SameSite=None | `server/services/session.ts:180` | no: SameSite=Lax and JSON-only block cross-site posts today | accept | pending G5 | open |
| SEC-6 | CK-02 | medium | No absolute session lifetime: a session kept active never expires | `server/services/session.ts:22` | yes | fix | pending G5 | open |
| SEC-7 | CK-08 | medium | Unexpected errors are logged as whole error objects; a PostgreSQL constraint error includes the failing row with order amounts, against NFR-010 | `server/utils/problem.ts:73` | yes | fix | pending G5 | open |
| SEC-8 | CK-09 | medium | Order, session and operations responses carry no Cache-Control: no-store, so a shared clinic browser or proxy may keep order details | CMD-11 | yes | fix | pending G5 | open |
| SEC-9 | CK-15 | medium | The pay endpoint has no per-person or per-address rate limit, which TH-3 names; idempotency stops double charges but not floods | CMD-18 | yes | fix | pending G5 | open |
| SEC-10 | CK-04 | low | Order line quantity has no upper bound; a huge quantity overflows the integer total and returns a 500 instead of a validation error | `server/api/orders/index.post.ts:13` | yes | accept | pending G5 | open |
| SEC-11 | CK-09 | low | sign_in_attempts keeps typed emails (including mistyped ones of other people) and client addresses with no retention rule; rows are pruned only when someone signs in | `db/migrations/1760000006000_sign-in-attempts.sql:6` | yes | fix | pending G5 | open |

## Accepted risks

| D-id | Finding | Severity | Human's words (verbatim) | Revisit if | Follow-up |
|---|---|---|---|---|---|

none yet

## Not checked

| ID | What | Why not | Risk of the gap | Who closes it |
|---|---|---|---|---|
| N1 | Live TLS certificate, HTTPS redirect and response headers on the deployed app | not deployed | the host could differ from code | ship-milestone (G-live) |
| N2 | The sign-in limit's client address behind Railway's proxy (`TRUST_PROXY=1`, X-Forwarded-For format) | needs a deploy | every user could share one address bucket | ship-milestone (G-live) |
| N3 | Host account settings: secret store, private database network, two-factor sign-in (TH-9, TH-12) | outside the repo | a leaked host account is the key to everything | the human, at ship-milestone |
| N4 | A verified secret scan of full history with gitleaks | gitleaks not on PATH; installing is not allowed here | the grep heuristic can miss credential formats it does not know | the human or CI: `gitleaks git --redact --no-banner -v .` |
| N5 | Whether advisory code (simple-git, node-forge, braces) is in the built server | no `nuxt build` output inspected | SEC-1 to SEC-3 reachability stays unknown | the fix task for Q1 |
| N6 | Database connection TLS to the managed PostgreSQL | depends on the host's private network | traffic between app and database could be readable on the host network | ship-milestone |

## Questions

| ID | Question | Why it matters | Recommended answer | Blocks |
|---|---|---|---|---|
| Q1 | ⚠ Does `nuxt build` output (`.output/server`) contain simple-git, node-forge or braces? | decides whether SEC-1 to SEC-3 ship to production | build once and grep `.output` for the three package names; if absent, accept them as build-time only with "revisit if they appear in .output" | G5, SEC-1, SEC-2, SEC-3 |

## Commands run

- **CMD-1** `date` → exit 0 · 2026-10-10 15:46 CDT
- **CMD-2** `git rev-parse milestone/m4-tracer-bullet` → exit 0 · 0d19347c46390868b117467540a28aa2a6a859d9
- **CMD-3** `git diff --name-only $BASE $MB | wc -l` → exit 0 · 263
- **CMD-4** `git diff --name-only $BASE $MB | grep -vE '^(docs/specs/.handoff)/' …` → exit 0 · non-doc paths under app/, server/, db/, tests/ and root files
- **CMD-5** `command -v gitleaks osv-scanner npm pnpm composer; npm --version` → exit 1 · npm and composer present, gitleaks, osv-scanner and pnpm absent, npm 11.19.1
- **CMD-6** `make check` (report-milestone recipe 4, same head) → exit 0 · 96 unit passed, 43 M4 acceptance passed, make check: OK
- **CMD-7** `for f in $(git ls-files server/api); do grep -nE 'requireViewer…' "$f"; done` → exit 0 · every route except session POST and notices GET calls requireViewer
- **CMD-8** `grep -nE 'maxAge/absolute/IDLE_MS' server/services/session.ts` → exit 0 · only IDLE_MS, no absolute lifetime
- **CMD-9** `git grep -nE 'sql` with interpolation; exec, eval, child_process' -- server` → exit 0 · one bound template (session.ts:100), no shell or eval
- **CMD-10** `git grep -nE 'v-html/innerHTML/dangerouslySetInnerHTML' -- app server` → exit 1 · 0 hits
- **CMD-11** `git grep -nIiE 'content-security-policy/frame-ancestors/x-content-type/strict-transport/cache-control/referrer-policy/cors' -- server app nuxt.config.ts` → exit 1 · 0 hits
- **CMD-12** `git grep -nIiE "$P" -- . ':!vendor' ':!node_modules' ':!*.lock' ':!package-lock.json' ':!*.min.js' / cut -d: -f1-2` → exit 0 · 0 hits
- **CMD-13** `git ls-files / grep -E '(^/\/)\.env' / grep -vE '\.(example/sample/dist/template)$'` → exit 1 · none
- **CMD-14** `git log --all -E -i -G"$P" --format='%h %ad' --date=short --name-only -- …` → exit 0 · cc64669 and 8949ae4, public/.htaccess (line 14, false positive)
- **CMD-15** `git grep -nE 'rejectUnauthorized/NODE_TLS/http:\/\//fetch(/$fetch(' -- server nuxt.config.ts` → exit 1 · 0 hits
- **CMD-16** `npm audit --package-lock-only` (and `--json`) → exit 1 · 15 vulnerabilities (9 high, 6 critical)
- **CMD-17** `npm audit --package-lock-only --omit=dev` (and `--json`) → exit 1 · 14 vulnerabilities (8 high, 6 critical)
- **CMD-18** `git grep -nE 'rate-limited/RateLimit/MAX_ATTEMPTS' -- server` → exit 0 · server/services/session.ts (sign-in limit) and server/utils/problem.ts (the problem type) only
- **CMD-19** `git grep -nIiE 'openai/anthropic/…/llamaindex' -- . ':!vendor' ':!node_modules' ':!docs' ':!specs' ':!.handoff' ':!*.md'` → exit 0 · 1 hit, `.claude/settings.json:6` (agent plugin setting, not a model call)
- **CMD-20** `git diff $BASE $MB -- package.json` → exit 0 · the dependencies and devDependencies listed under Dependency audit
