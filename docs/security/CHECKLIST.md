---
artifact: security-checklist
milestone: M4
branch: milestone/m4-security-recheck
base_sha: 778e788ffa704760aa593353b8cbdea6e98edabd
head_sha: a1f8c0a6f591265b8abb25e2103ccd298ce884a0
checked: Sat Oct 10 20:02:04 CDT 2026
checker: check-security (Claude Code, claude-opus-5-5)
standard: OWASP ASVS 5.0 Level 1, chapter-level mapping
gate: G5
status: draft
---

# Security checklist: cerbo-supplement-store M4

## Summary

This re-run checks M4 as merged to main, including M4-T011's hardening (705bb3b) and the T901 to T903 deploy gaps (1f0881f: `/healthz`, `/version`, the demo data loader). T011 fixed six of the eleven findings (security headers, absolute session lifetime, safe error logs, no-store caching, the pay rate limit, attempt-row retention); the five still open (the three Nuxt-tooling advisories, the CSRF reliance on SameSite, the uncapped quantity) all carry your recorded acceptance (D49 to D53), so the G5 security condition is met.

- **G5 security condition:** met: secrets 0, unaccepted high/critical 0
- **Rows:** 11 pass · 3 fail · 0 n.a. (of 14)
- **Open findings:** 1 critical · 2 high · 1 medium · 1 low
- **Secret scan:** grep heuristic (unverified): 1 hit: 0 secret, 0 revoked, 1 false positive
- **Dependency audit:** `package-lock.json`: npm 11.19.1 `npm audit --package-lock-only` → 15 advisory entries (6 critical, 9 high), unchanged from the previous run; 14 in the production tree (`--omit=dev`), all inside Nuxt and kysely-codegen tooling and absent from the built server (Log 2026-10-10 15:47 CDT build check)
- **Accepted risks:** D51 SEC-1, D49 SEC-2, D50 SEC-3, D52 SEC-5, D53 SEC-10
- **Biggest gap:** N4: no verified (gitleaks) history scan has ever run; the grep heuristic is all the secret evidence there is, on a repo with a public mirror

## Scope and method

- **Milestone:** M4 `milestone/m4-security-recheck` (main @ 74cafcf plus the job file); diff `778e788`..`a1f8c0a`, 289 files changed (CMD-3). Base 778e788 is the v1 main the previous run used (job file), so the scope and ids match the previous checklist; the diff still carries the M1 to M3 planning work and the v1 Laravel removal (D48).
- **Milestone kind:** code (CMD-4 lists non-doc paths under `server/`, `app/`, `db/`, `scripts/`)
- **Trust boundaries in play:** TB-1 internet to web app (every route, now deployed on Railway); TB-2 between roles (patient, provider, operations roles); TB-3 web app to database (grants, triggers); TB-4 web app to outside providers (stub payment and messaging, in-process); TB-5 host platform (Railway, deploy and secrets) (from `docs/architecture/hld.md` §5)
- **Change plan security field:** no change plan (greenfield)
- **Inherited findings routed here:** no AUDIT.md
- **Tools on PATH:** gitleaks absent, osv-scanner absent, pnpm absent, npm 11.19.1, composer present (no composer.lock at the head) (CMD-5)
- **Tests cited:** `make check` at a1f8c0a → exit 0, 122 unit and 43 M4 acceptance tests passed (CMD-6)

## Checklist

Status: `pass`, `fail` or `n.a.`; no evidence is `fail`. Evidence: `path:line` or `CMD-<n>` plus its result.

| ID | Area | ASVS 5.0 | Status | Evidence | Finding |
|---|---|---|---|---|---|
| CK-01 | Authentication | V6 | pass | Every data route calls `requireViewer` (CMD-7); public by design: EP-15 sign-in, EP-24 notice, and the T901/T902 probes `server/routes/healthz.get.ts:10` and `server/routes/version.get.ts:20`, which return only ok/unavailable and a commit plus build time. Passwords use scrypt with a timing-safe compare (`server/services/session.ts:58`); sign-in limited to 10 per 15 minutes per email or address (`server/services/session.ts:75`, :96). Seeded fictional accounts in production are the designed sign-in (`docs/architecture/hld.md:394`, D36); their shared password is random and kept only in the git-ignored `.env.railway` (`scripts/railway-setup.sh:43`, `.gitignore:6`) | — |
| CK-02 | Session management | V7 | pass | Cookie HttpOnly, Secure, SameSite=Lax, never in a URL (`server/services/session.ts:187`); new 32-byte token per sign-in (`server/services/session.ts:135`); idle limit 15 minutes (`server/services/session.ts:22`); absolute lifetime 12 hours from sign-in (`server/services/session.ts:23`, :157), proven by `tests/unit/hardening.test.ts:101` in CMD-6 | SEC-6 (fixed) |
| CK-03 | Access control and IDOR | V8 | pass | Ownership and role checks in `server/services/access-policy.ts:16`, :22, :30, :41, called before any state read; unknown and forbidden orders both answer 404; proven by AT-007, AT-008, AT-022, AT-025, AT-043, AT-044 in `make check` (CMD-6) | — |
| CK-04 | Input validation and injection | V1, V2 | fail | Request bodies are Zod strict objects (`server/api/orders/index.post.ts:11`), JSON-only (`server/utils/problem.ts:52`); every raw SQL template binds its values (CMD-9, incl. the new `server/services/payments.ts:67`); no shell, eval or deserialisation (CMD-9). Order line quantity still has no upper bound (`server/api/orders/index.post.ts:13`), accepted in D53 | SEC-10 |
| CK-05 | Output encoding and XSS | V1, V3 | pass | Vue auto-escapes and no `v-html`, `innerHTML` or `dangerouslySetInnerHTML` exists (CMD-10, 0 hits); production CSP allows scripts only from self plus the one hashed config script, no `unsafe-inline` (`nuxt.config.ts:14`, :39), proven by `tests/unit/hardening.test.ts:66`; live CSP and inline-hash check SM-6 in `scripts/smoke.sh` | SEC-4 (fixed) |
| CK-06 | CSRF | V3 | fail | Still no anti-CSRF token or Origin check (CMD-11). Protection rests on SameSite=Lax (`server/services/session.ts:187`) and JSON-only bodies (`server/utils/problem.ts:52`); accepted in D52 until the app is embedded with SameSite=None | SEC-5 |
| CK-07 | Secrets and cryptography | V11, V13 | pass | Secret scan: 0 tree hits, 1 history hit triaged false positive (CMD-12, CMD-13, CMD-14); no tracked env file (CMD-13); `.env` and `.env.railway` ignored (`.gitignore:3`, :6); DATABASE_URL from the environment (`server/utils/db.ts:10`); deploy passwords generated by `openssl rand` and never printed (`scripts/railway-setup.sh:41`); tokens from `randomBytes` (`server/services/session.ts:135`); scrypt and `timingSafeEqual` (`server/services/session.ts:58`) | — |
| CK-08 | Errors and logging (no PII or secrets) | V16 | pass | Clients get a generic `internal` problem with an instance id; every server log of an error now writes only `errorFacts` (class, PostgreSQL code, constraint name), never the message or row (`server/utils/problem.ts:60`, :85; `server/services/payment-gateway.ts:24`; `server/services/payments.ts:159`; `server/routes/healthz.get.ts:22`; CMD-22), proven by `tests/unit/hardening.test.ts:120`, :128, :141. The operator-only seed script prints counts and an error message, no data (`db/seed/demo.ts:97`, :99) | SEC-7 (fixed) |
| CK-09 | Data protection | V14 | pass | Operations queries select no patient column (`server/services/ops-order-queries.ts:85`, AT-023); notices hold only practice name and sign-in path (`server/services/messaging.ts:35`); no card data (stub gateway). `Cache-Control: no-store` on `/api/**`, `/orders/**`, `/ops/**` (`nuxt.config.ts:40`) and on the probes (`server/routes/healthz.get.ts:11`), proven by `tests/unit/hardening.test.ts:86`; sign-in and pay attempt rows pruned every 15 minutes (`nuxt.config.ts:48`, `server/tasks/prune-attempts.ts:14`), proven by `tests/unit/hardening.test.ts:214` | SEC-8 (fixed), SEC-11 (fixed) |
| CK-10 | TLS verified | V12 | pass | No outbound HTTP client and no verification switch in app code (CMD-15, 0 hits); HSTS on every production response (`nuxt.config.ts:25`, :39); the smoke script refuses non-https and keeps verification on (`scripts/smoke.sh:20`, :27). Database TLS on Railway's private network not checked (N6) | SEC-4 (fixed) |
| CK-11 | Configuration and headers | V13, V3 | pass | Devtools off (`nuxt.config.ts:33`); build tools in devDependencies (CMD-20); CSP with `frame-ancestors 'self'`, nosniff, Referrer-Policy and HSTS on every production response (`nuxt.config.ts:13`, :21, :39); no CORS configuration, so same-origin only (CMD-11); `/version` returns only commit and build time (`server/routes/version.get.ts:13`) | SEC-4 (fixed) |
| CK-12 | Dependencies | V15 | fail | `package-lock.json` committed; npm audit reports 6 critical and 9 high (CMD-16, exit 1), 14 in the production tree (CMD-17), all in Nuxt and kysely-codegen tooling; accepted in D49, D50, D51; every added package has a decision (D33, D39, D44, D46); no package added since the previous run (CMD-20) | SEC-1, SEC-2, SEC-3 |
| CK-13 | Business logic and money integrity | V2 | pass | Prices come from the server (`server/services/orders.ts:66`, :71), never the request (`server/api/orders/index.post.ts:11`); integer cents in every money column (`db/migrations/1760000002000_payments-ledger.sql:48`, :66); split and payout checks (`db/migrations/1760000002000_payments-ledger.sql:10`, :12); one success per order (`db/migrations/1760000002000_payments-ledger.sql:54`); ledger balance at commit (`db/migrations/1760000002000_payments-ledger.sql:100`); paid orders frozen (`db/migrations/1760000002000_payments-ledger.sql:28`); idempotency keys; proven by AT-006, AT-009 to AT-011, AT-021, AT-026 to AT-030, AT-038, AT-041 in `make check` (CMD-6) | — |
| CK-15 | APIs and webhooks | V4 | pass | Every data route authenticated (CK-01); sign-in and pay both limited to 10 per 15 minutes per person or address (`server/services/session.ts:75`, `server/services/payments.ts:49`, :58, called at `server/api/orders/[orderId]/payments.post.ts:15` inside the idempotency guard; CMD-18), proven by `tests/unit/hardening.test.ts:158`, :185. No inbound webhook exists (stub gateway) | SEC-9 (fixed) |

## LLM risks

n.a.: no model call in code (CMD-19 → only non-code hits: `.claude/settings.json:6`, a disabled agent plugin name in tool settings, not a model call); no model container in docs/architecture/hld.md.

## Secret scan

- **Scanner:** grep heuristic (unverified)
- **Scope:** working tree + tracked env files + history commit list
- **Commands:** CMD-12 → exit 1, 0 tree hits; CMD-13 → exit 1, no tracked env file; CMD-14 → 3 commits (`cc64669` added, `8949ae4` and `b045719` removed on two lines of history) touching `public/.htaccess`
- **History (heuristic only):** H1 (CMD-14)
- **Open secrets:** 0

Locations only. Never a value.

| Hit | Location | Rule or kind | Triage | Finding |
|---|---|---|---|---|
| H1 | history: `public/.htaccess:14 @cc64669` (removed at `8949ae4` and at `b045719`) | token=… pattern | false positive: an Apache rewrite rule copying the X-XSRF-Token request header into an environment variable; no credential value | — |

## Dependency audit

| Lockfile | Tool + version | Command | Exit | Result | Findings |
|---|---|---|---|---|---|
| `package-lock.json` | npm 11.19.1 | CMD-16, CMD-17 | 1 | 15 advisory entries: 6 critical, 9 high, 0 moderate, 0 low; production tree (`--omit=dev`): 6 critical, 8 high. Root advisories unchanged: simple-git (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5), @simple-git/argv-parser (GHSA-v5rq-49vh-5v5c), node-forge (GHSA-86w9-cpqp-85rv), braces (GHSA-vfj7-8cjw-p6xm); the rest inherit (nuxt, @nuxt/devtools, @nuxt/cli, @nuxt/nitro-server, @nuxt/vite-builder, listhen, nitropack, micromatch, fast-glob, globby, kysely-codegen) | SEC-1, SEC-2, SEC-3 |

- **Packages added in this milestone:** kysely 0.29.6, nuxt 4.5.2, pg 8.23.0, vue 3.5.43, zod 4.6.5; dev: @nuxt/test-utils, @types/pg, kysely-codegen, node-pg-migrate, typescript, vitest: toolchain bootstrap (Approvals 2026-10-10 11:32 CDT, D33, D39, D44); vue-tsc 3.3.11: D46. None added by T011 or T901 to T903 (CMD-20)
- **Manifests without a committed lockfile:** none (`composer.json` and `composer.lock` were deleted with the v1 app)

## Threat and invariant trace

| HLD id | What the design says (mitigation or invariant, short) | Checked in | Result |
|---|---|---|---|
| TH-1 | server sessions; secure, HTTP-only, same-site cookie; 15-minute idle; sign-in rate limit | CK-01, CK-02 | pass (absolute lifetime added: SEC-6 fixed) |
| TH-2 | server ignores browser prices | CK-13 | pass |
| TH-3 | rate limits on sign-in and pay; idempotent payment | CK-15 | pass (pay limit added: SEC-9 fixed) |
| TH-4 | every API call checked against the person's orders or practice; unknown and forbidden look the same | CK-03 | pass |
| TH-5 | operations read de-identified views | CK-09 | pass |
| TH-6 | only the SRE changes roles, never their own | CK-03 | n.a.: no role-change endpoint in M4 (EP-34 to EP-37 are M6) |
| TH-7 | append-only histories of price, stock, role | CK-13 | n.a.: price, stock and role histories arrive in M5 and M6; order money history covered by INV-4 |
| TH-8 | app user cannot change append-only records; database checks the split | CK-13 | pass |
| TH-9 | database password only in the host's secret store; private network | CK-07 | pass in code (`server/utils/db.ts:10`; `scripts/railway-setup.sh` sets DATABASE_URL on the private domain); host side not checked (N3) |
| TH-10 | verify a real provider's signature (later); stub in-process now | CK-15 | n.a.: stub gateway in-process, no inbound call |
| TH-11 | notices carry only practice name and sign-in link | CK-09 | pass |
| TH-12 | deploys human-only; host account two-factor | CK-11 | n.a.: host account settings are outside the code (N3); CI deploys nothing (`.gitlab-ci.yml`) |
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
| `server/` | CK-01 to CK-13, CK-15 | all M4 API routes, services, utilities; T011 hardening; `/healthz`, `/version`; the prune-attempts task |
| `app/` | CK-05, CK-06, CK-11 | Nuxt pages and components; also the deleted v1 Laravel `app/` classes |
| `db/` | CK-03, CK-07, CK-09, CK-13 | SQL migrations (incl. `pay_rate_attempts`); the operator-only demo seed (`db/seed/demo.ts`) |
| `tests/` | CK-02, CK-03, CK-08, CK-09, CK-13, CK-15 | acceptance and unit tests (incl. `hardening.test.ts`); deleted v1 PHP tests |
| `package.json` | CK-12 | new manifest |
| `package-lock.json` | CK-12 | new lockfile, audited |
| `nuxt.config.ts` | CK-05, CK-08, CK-09, CK-10, CK-11 | devtools off; CSP, nosniff, Referrer-Policy, HSTS; no-store rules; prune schedule |
| `tsconfig.json` | none | type-check configuration |
| `docker-compose.yml` | CK-07 | local test database with a test-only password |
| `.env.example` | CK-07 | test database URL only |
| `.gitignore` | CK-07 | ignores `.env` files and `.env.railway` |
| `.gitlab-ci.yml` | CK-11 | CI runs `make check` on a shell runner; deploys nothing |
| `Makefile` | none | build and test commands |
| `scripts/` | CK-07, CK-10 | workflow scripts; `railway-setup.sh` (generates and masks deploy passwords), `smoke.sh` (https only, TLS verified, GET only) |
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
| SEC-1 | dependency | critical | simple-git up to 4.0.1 and @simple-git/argv-parser below 2.0.1 allow git command execution past the unsafe-operation guard (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c); pulled in by @nuxt/devtools | CMD-16 | no: devtools off (`nuxt.config.ts:33`) and absent from `.output/server` (Log 2026-10-10 15:47 CDT build check) | accept | accepted (D51) | open |
| SEC-2 | dependency | high | node-forge accepts forged RSA PKCS#1 v1.5 signatures (GHSA-86w9-cpqp-85rv); pulled in by listhen (the Nuxt dev server) through nitropack and @nuxt/cli | CMD-16 | no: dev server only, absent from `.output/server` (same build check) | accept | accepted (D49) | open |
| SEC-3 | dependency | high | braces allows stack-exhaustion denial of service on crafted glob patterns (GHSA-vfj7-8cjw-p6xm); pulled in by micromatch, fast-glob and globby under nuxt build tooling and kysely-codegen | CMD-16 | no: build-time only, absent from `.output/server` (same build check) | accept | accepted (D50) | open |
| SEC-4 | CK-05, CK-10, CK-11 | medium | The app sends no security headers: no Content-Security-Policy with frame-ancestors, no X-Content-Type-Options, no Referrer-Policy, no HSTS | `nuxt.config.ts:13` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-11, CMD-6) |
| SEC-5 | CK-06 | medium | No anti-CSRF token or Origin check; protection rests on SameSite=Lax and JSON-only bodies, which breaks if the app is embedded in the EHR iframe with SameSite=None | `server/services/session.ts:187` | no: SameSite=Lax and JSON-only block cross-site posts today | accept | accepted (D52) | open |
| SEC-6 | CK-02 | medium | No absolute session lifetime: a session kept active never expires | `server/services/session.ts:157` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-8, CMD-6) |
| SEC-7 | CK-08 | medium | Unexpected errors are logged as whole error objects; a PostgreSQL constraint error includes the failing row with order amounts, against NFR-010 | `server/utils/problem.ts:85` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-22, CMD-6) |
| SEC-8 | CK-09 | medium | Order, session and operations responses carry no Cache-Control: no-store, so a shared clinic browser or proxy may keep order details | `nuxt.config.ts:40` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-11, CMD-6) |
| SEC-9 | CK-15 | medium | The pay endpoint has no per-person or per-address rate limit, which TH-3 names; idempotency stops double charges but not floods | `server/services/payments.ts:58` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-18, CMD-6) |
| SEC-10 | CK-04 | low | Order line quantity has no upper bound; a huge quantity overflows the integer total and returns a 500 instead of a validation error | `server/api/orders/index.post.ts:13` | yes | accept | accepted (D53) | open |
| SEC-11 | CK-09 | low | sign_in_attempts keeps typed emails (including mistyped ones of other people) and client addresses with no retention rule; rows are pruned only when someone signs in | `server/tasks/prune-attempts.ts:14` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-21, CMD-6) |

## Accepted risks

| D-id | Finding | Severity | Human's words (verbatim) | Revisit if | Follow-up |
|---|---|---|---|---|---|
| D51 | SEC-1 | critical | "Approve, accept SEC-1" | simple-git appears in .output/server, devtools are switched on, or a Nuxt 4 release ships patched devtools. | upgrade when a patched Nuxt release exists |
| D49 | SEC-2 | high | "Approve, accept SEC-2" | node-forge appears in .output/server, the app starts verifying signatures (for example real payment webhooks), or a Nuxt 4 release removes the advisory. | upgrade when a patched release exists |
| D50 | SEC-3 | high | "Approve, accept SEC-3" | braces appears in .output/server, the app matches file patterns from user input, or patched Nuxt and kysely-codegen releases exist. | upgrade when patched |
| D52 | SEC-5 | medium | "Approve, add T011 and run it" | the app is embedded in an iframe or the session cookie moves to SameSite=None, or a write endpoint accepts a non-JSON body. | none |
| D53 | SEC-10 | low | "Approve, add T011 and run it" | M5 adds stock limits (FR-025), or a real user hits the 500. | M5 stock limits |

## Not checked

| ID | What | Why not | Risk of the gap | Who closes it |
|---|---|---|---|---|
| N1 | Live TLS certificate, HTTPS redirect and response headers on the deployed app | check-security sends no requests to deployments; ship-milestone's smoke recorded SMOKE GREEN with SM-6/SM-7 (CSP, HSTS, nosniff) at 158fb11 (`docs/runbooks/deploy.md:152`), not re-run here | the host could differ from config | ship-milestone (G-live) |
| N2 | The sign-in and pay limits' client address behind Railway's proxy (`TRUST_PROXY=1`, last X-Forwarded-For entry, `server/services/session.ts:84`) | needs live traffic | if the proxy's last entry is not the client, every visitor shares one bucket or a client can spoof its bucket | ship-milestone (G-live) |
| N3 | Host account settings: secret store, private database network, two-factor sign-in (TH-9, TH-12) | outside the repo | a leaked host account is the key to everything | the human |
| N4 | A verified secret scan of full history with gitleaks | gitleaks not on PATH; installing is not allowed here | the grep heuristic can miss credential formats it does not know, on a repo with a public mirror | the human or CI: `gitleaks git --redact --no-banner -v .` |
| N5 | Whether advisory code (simple-git, node-forge, braces) is in the built server | closed: the supervisor's build check found none in `.output/server` (Log 2026-10-10 15:47 CDT); not re-run at this head (lockfile unchanged, CMD-20) | a later dependency change could pull one in; D49 to D51 name that trigger | re-check on any lockfile change |
| N6 | Database connection TLS to the managed PostgreSQL | depends on the host's private network; DATABASE_URL carries no sslmode (`scripts/railway-setup.sh` step 3) | traffic between app and database could be readable on the host network | ship-milestone |

## Questions

| ID | Question | Why it matters | Recommended answer | Blocks |
|---|---|---|---|---|
| Q1 | ⚠ Does `nuxt build` output (`.output/server`) contain simple-git, node-forge or braces? | decided whether SEC-1 to SEC-3 ship to production | answered 2026-10-10 15:47 CDT (tracker Log, VERIFY SEC-1): none of them is in `.output/server`; SEC-1 to SEC-3 then accepted (D49 to D51) | nothing |
| Q2 | ⚠ Every seeded demo person, including the SRE, shares one demo password; should M6 (role changes, EP-34 to EP-37) give the SRE account its own password? | today the SRE account can change nothing (no role endpoint in M4), so the shared password is harmless; in M6 it would let anyone with the demo password change roles | yes: one password per role-changing account before M6 ships, or keep the SRE account out of the public demo | nothing |

## Commands run

- **CMD-1** `date` → exit 0 · Sat Oct 10 20:02:04 CDT 2026
- **CMD-2** `git rev-parse milestone/m4-security-recheck` → exit 0 · a1f8c0a6f591265b8abb25e2103ccd298ce884a0 (equals the task branch HEAD; working tree clean)
- **CMD-3** `git diff --name-only 778e788 milestone/m4-security-recheck` counted → exit 0 · 289
- **CMD-4** same list grouped by top-level path → exit 0 · non-doc paths under server/, app/, db/, scripts/, tests/ and root files
- **CMD-5** `command -v gitleaks osv-scanner npm pnpm composer; npm --version` → npm and composer present, gitleaks, osv-scanner and pnpm absent, npm 11.19.1
- **CMD-6** `make check` (node_modules linked from the main checkout at the same head and the same package-lock.json; nothing installed) → exit 0 · 122 unit passed (9 files), 43 M4 acceptance passed (5 files), make check: OK
- **CMD-7** `for f in $(git ls-files server/api server/routes); do grep -qE requireViewer "$f" …` → exit 0 · only `server/api/notices/[token].get.ts`, `server/api/session/index.post.ts`, `server/routes/healthz.get.ts`, `server/routes/version.get.ts` lack it, all public by design
- **CMD-8** `grep -nE 'ABSOLUTE_MS/absoluteCutoff' server/services/session.ts` → exit 0 · session.ts:23, :38, :157
- **CMD-9** `git grep -nE 'sql`' -- server` and `git grep -nE 'child_process/exec(/eval(' -- server` → exit 0 · 8 templates, all bind their values or are constant `now()`; the only exec is a RegExp exec in ops-order-queries.ts:58
- **CMD-10** `git grep -nE 'v-html/innerHTML/dangerouslySetInnerHTML' -- app server` → exit 1 · 0 hits
- **CMD-11** `git grep -nIiE 'content-security-policy/frame-ancestors/x-content-type/strict-transport/cache-control/referrer-policy/cors' -- server app nuxt.config.ts` → exit 0 · nuxt.config.ts:14, :21, :23, :24, :25, :29; healthz.get.ts:11; version.get.ts:21; no CSRF token, Origin check or CORS
- **CMD-12** `git grep -nIiE "$P" -- . ':!vendor' ':!node_modules' ':!*.lock' ':!package-lock.json' ':!*.min.js' / cut -d: -f1-2` → exit 1 · 0 hits
- **CMD-13** `git ls-files / grep -E '(^/\/)\.env' / grep -vE '\.(example/sample/dist/template)$'` → exit 1 · none
- **CMD-14** `git log --all -E -i -G"$P" --format='%h %ad' --date=short --name-only -- …` → exit 0 · b045719, 8949ae4, cc64669, all public/.htaccess (line 14 at the parent of each removal, false positive)
- **CMD-15** `git grep -nE 'rejectUnauthorized/NODE_TLS/http:\/\//fetch(/$fetch(' -- server nuxt.config.ts` → exit 1 · 0 hits
- **CMD-16** `npm audit --package-lock-only` (and `--json`) → exit 1 · 15 vulnerabilities (9 high, 6 critical)
- **CMD-17** `npm audit --package-lock-only --omit=dev` → exit 1 · 14 vulnerabilities (8 high, 6 critical)
- **CMD-18** `git grep -nE 'countPayAttempt/MAX_PAY_ATTEMPTS/MAX_ATTEMPTS' -- server` → exit 0 · payments.post.ts:6, :15; payments.ts:49, :58, :78, :79; session.ts:75, :115, :116
- **CMD-19** `git grep -nIiE 'openai/anthropic/…/llamaindex' -- . ':!vendor' ':!node_modules' ':!docs' ':!specs' ':!.handoff' ':!*.md'` → exit 0 · 1 hit, `.claude/settings.json:6` (agent plugin setting, not a model call)
- **CMD-20** `git diff 778e788 milestone/m4-security-recheck -- package.json`; `git diff --quiet HEAD <main checkout HEAD> -- package-lock.json` → exit 0 · the dependencies listed under Dependency audit; no manifest change in T011 or T901 to T903
- **CMD-21** `git log --oneline 0d19347..milestone/m4-security-recheck -- server nuxt.config.ts db` → exit 0 · 705bb3b feat(m4/t011) security hardening; 1f0881f feat(m4/t901-t903) healthz, version, demo loader (plus the squashed M4 task commits)
- **CMD-22** `git grep -nE 'console\.(error/log/warn)' -- server db app` → exit 0 · 6 calls: four log `errorFacts(...)` (problem.ts:85, payment-gateway.ts:24, payments.ts:159, healthz.get.ts:22), two in the operator seed script print counts and an error message (demo.ts:97, :99)
