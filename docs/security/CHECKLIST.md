---
artifact: security-checklist
milestone: M5.2
branch: milestone/m5.2-safe-landing
base_sha: c95695976dc9c0c60423a91cbf82f68a8d2bf063
head_sha: 7e9634415be37cb221e33a733dde2c3c8f62f8e2
checked: Sun Oct 11 10:07:08 CDT 2026
checker: check-security (Claude Code, claude-opus-5-5)
standard: OWASP ASVS 5.0 Level 1, chapter-level mapping
gate: G5
status: draft
---

# Security checklist: cerbo-supplement-store M5.2

## Summary

M5.2 is a landing fix: the site root (FE-25, S15 Your home) now sends a role with a work page to its first page from the fixed `ROLE_PAGES` table and shows every other role (patient, SRE, data analyst, `none`) a home with its own name and what to do instead; a new error page (FE-26) answers every page error with one of two fixed sentences and a "Go to your home" link to `/`; the wrong-role message gains the same fixed link; and a harness-only pre-push hook change. It adds no API route, no server code, no migration, no dependency, no log call and no raw HTML. No open redirect: every new redirect and link target is a constant path (`/`, `/sign-in`, or a `ROLE_PAGES` literal); none is read from the URL. The error page renders no error message, stack or status text, only a sentence chosen by `statusCode === 404`. A signed-out person never reaches S15 (the page guard answers 303 to sign-in first, and S15 itself falls back to sign-in), and on the error page sees only fixed text and the help footer. One new low finding (SEC-15: the S15 page, which now shows the person's name and role, is not marked `no-store`); the only critical and high findings are the three Nuxt tooling advisories already accepted (D49 to D51) and absent from the built server, so the G5 security condition is met and nothing critical or high is reachable inside Cerbo's EHR.

- **G5 security condition:** met: secrets 0, unaccepted high/critical 0
- **Rows:** 10 pass · 4 fail · 0 n.a. (of 14)
- **Open findings:** 1 critical · 2 high · 1 medium · 4 low
- **Secret scan:** grep heuristic (unverified): 6 hits: 0 secret, 0 revoked, 6 false positive
- **Dependency audit:** `package-lock.json`: npm 11.19.1 `npm audit --package-lock-only` → 15 advisory entries (6 critical, 9 high), the same six root advisories as M5 and M5.1; 14 in the production tree (`--omit=dev`); M5.2 changes no manifest or lockfile (CMD-7)
- **Accepted risks:** D51 SEC-1, D49 SEC-2, D50 SEC-3, D52 SEC-5, D76 SEC-10, D77 SEC-12, D78 SEC-13
- **Biggest gap:** N4: no verified (gitleaks) history scan has ever run; the grep heuristic is all the secret evidence there is, on a repo with a public mirror

## Scope and method

- **Milestone:** M5.2 `milestone/m5.2-safe-landing`; diff `c956959`..`7e96344`, 18 files changed (CMD-3); every non-doc path read in full (CMD-4)
- **Milestone kind:** code (CMD-4 lists 7 non-doc paths: `.githooks/pre-push`, `Makefile`, 4 under `app/`, 1 under `tests/`)
- **Trust boundaries in play:** TB-1 internet to web app (the site root page, the error page and the wrong-role message, all behind or beside the existing page guard) (from `docs/architecture/hld.md` §5, unchanged in this diff, CMD-3). TB-2 to TB-5 unchanged: no server, migration, config or outbound change (CMD-7)
- **Change plan security field:** no change plan (greenfield)
- **Inherited findings routed here:** no AUDIT.md
- **Tools on PATH:** gitleaks absent, osv-scanner absent, pnpm absent, npm 11.19.1 (CMD-5)
- **Tests cited:** `make check` at 7e96344 (CMD-6); the M5.2 acceptance suite covers the landing, the 404 page for a signed-in and a signed-out person, and the wrong-role link (`tests/acceptance/M5.2/landing.test.ts:254`, :266)

## Checklist

Status: `pass`, `fail` or `n.a.`; no evidence is `fail`. Evidence: `path:line` or `CMD-<n>` plus its result.

| ID | Area | ASVS 5.0 | Status | Evidence | Finding |
|---|---|---|---|---|---|
| CK-01 | Authentication | V6 | pass | `/` and every unknown path are outside the page guard's public list (`app/middleware/auth.global.ts:6`), so a stranger gets 303 to `/sign-in?next=…` before S15 or the 404 page renders (`app/middleware/auth.global.ts:30`); proven for an unknown address by M5.2_AT_003 (`tests/acceptance/M5.2/landing.test.ts:261`, CMD-6). If the session read fails anyway, S15 goes to sign-in, fail closed (`app/pages/index.vue:7`, :9). No server, session or sign-in logic change (CMD-7) | — |
| CK-02 | Session management | V7 | pass | `server/` untouched (CMD-7); M4 and M5 cookie and timeout controls stand (`server/services/session.ts:196`), their tests green in CMD-6 | — |
| CK-03 | Access control and IDOR | V8 | pass | No API route or query change (CMD-7). S15 reads only the caller's own `/api/session` (`app/pages/index.vue:7`) and redirects to `pages[0].path` from the constant table (`app/pages/index.vue:10`, `app/utils/role-home.ts:7`) or to `/sign-in` (:9), an unknown role included: no input-chosen target, so no open redirect. The error page link is the constant `/` with `clearError({ redirect: '/' })` (`app/error.vue:20`); the wrong-role link is the constant `/` (`app/components/ProblemMessage.vue:52`); the sign-in page's `next` still passes `safeNext` (`app/pages/sign-in.vue:9`, unchanged). CMD-8 lists every added navigation line: all constants. Pages listed on S15 are links only; each page's own API call still enforces the role (M5.2_AT_004, Fran refused on `/ops/stock`, `tests/acceptance/M5.2/landing.test.ts:275`, CMD-6) | — |
| CK-04 | Input validation and injection | V1, V2 | fail | M5.2 adds no input handling (CMD-7, CMD-8): S15 and the error page read only the session and the error's status code. Row stays fail on the accepted M5 findings | SEC-10, SEC-12 |
| CK-05 | Output encoding and XSS | V1, V3 | pass | No `v-html`, `innerHTML` or `dangerouslySetInnerHTML` in `app/` or `server/` (CMD-10, 0 hits). The person's display name reaches the page only through `{{ }}` and `useHead` title, both escaped (`app/pages/index.vue:19`, :20); the error page shows fixed strings only (`app/error.vue:9`); CSP unchanged (`nuxt.config.ts:14`, CMD-7) | — |
| CK-06 | CSRF | V3 | fail | No write path added (CMD-7, CMD-8); S15 is a GET that reads the session and redirects or renders, no state change (`app/pages/index.vue:7`); `clearError` changes only client state (`app/error.vue:20`). Row stays fail on the accepted M5 findings | SEC-5, SEC-13 |
| CK-07 | Secrets and cryptography | V11, V13 | pass | Secret scan: 5 tree hits and 5 history commits, all false positive; no tracked env file (CMD-12, CMD-13, CMD-14). No secret, token or crypto code in the diff (CMD-8) | — |
| CK-08 | Errors and logging (no PII or secrets) | V16 | pass | The new error page never renders `error.message`, `error.stack`, `statusMessage` or `data`: its only use of the error is `statusCode === 404` to choose between two fixed sentences (`app/error.vue:8`, :9; CMD-8 finds no other error field in added lines). The diff adds no log call (CMD-8). Generic API problem bodies unchanged (`server/utils/problem.ts:86`, CMD-7) | — |
| CK-09 | Data protection | V14 | fail | S15 now prints the signed-in person's display name and role name (`app/pages/index.vue:19`, `app/pages/index.vue:12`) at `/`, which has no `no-store` rule (`nuxt.config.ts:42`, rules cover only `/api/**`, `/orders/**`, `/ops/**`). Only the caller's own name and role, no order data; a signed-out visitor never gets the page (CK-01) | SEC-15 |
| CK-10 | TLS verified | V12 | pass | No outbound client, `http://` URL or verification switch added (CMD-15: one hit, an unchanged comment at `app/middleware/auth.global.ts:10`); HSTS unchanged (`nuxt.config.ts:25`) | — |
| CK-11 | Configuration and headers | V13, V3 | pass | `nuxt.config.ts` untouched (CMD-7): CSP `default-src 'self'` with `frame-ancestors 'self'` (`nuxt.config.ts:15`, :21), devtools off (`nuxt.config.ts:33`). The pre-push change only unsets git's hook variables before `make check` (`.githooks/pre-push:25`), a local harness file, not shipped | — |
| CK-12 | Dependencies | V15 | fail | `package-lock.json` committed; no manifest or lockfile change in M5.2 (CMD-7). npm audit still reports the accepted Nuxt and kysely-codegen tooling advisories (CMD-16, exit 1; CMD-17) | SEC-1, SEC-2, SEC-3 |
| CK-13 | Business logic and money integrity | V2 | pass | No server, migration, money or stock code change (CMD-7); M4 and M5 money and stock tests green in CMD-6 | — |
| CK-15 | APIs and webhooks | V4 | pass | No API route, webhook or rate-limit change (CMD-7); M5 controls stand (`server/services/practice-dashboard.ts:99`), tests green in CMD-6 | — |

## LLM risks

n.a.: no model call in code (CMD-19 → only non-code hits: `.claude/settings.json:6`, an agent plugin setting, not a model call); no model container in docs/architecture/hld.md.

## Secret scan

- **Scanner:** grep heuristic (unverified)
- **Scope:** working tree + tracked env files + history commit list
- **Commands:** CMD-12 → 5 tree hits: `docs/milestones/M5.1.md` (3), `docs/milestones/M5.md` (2); CMD-13 → exit 1, no tracked env file; CMD-14 → 5 commits: `c26710a` (docs/milestones/M5.1.md), `691b4e1` (docs/milestones/M5.md), `b045719`, `8949ae4`, `cc64669` (public/.htaccess, triaged at M4)
- **History (heuristic only):** H1 (CMD-14)
- **Open secrets:** 0

Locations only. Never a value.

| Hit | Location | Rule or kind | Triage | Finding |
|---|---|---|---|---|
| H1 | history: `public/.htaccess:14 @cc64669` (removed at `8949ae4` and at `b045719`) | token=… pattern | false positive: an Apache rewrite rule copying the X-XSRF-Token request header into an environment variable; no credential value | — |
| H2 | `docs/milestones/M5.md:637` (added at `691b4e1`) | secret=… pattern | false positive: the M5 report's G5 count line (`secrets=` followed by a count and the next counter name); no credential value | — |
| H3 | `docs/milestones/M5.md:828` (added at `691b4e1`) | secret=… pattern | false positive: the same G5 count text in the M5 report's security summary; no credential value | — |
| H4 | `docs/milestones/M5.1.md:417` (added at `c26710a`) | secret=… pattern | false positive: the M5.1 report's Done-when count line (`secrets=0 unaccepted_high_critical=0`); no credential value | — |
| H5 | `docs/milestones/M5.1.md:572` (added at `c26710a`) | secret=… pattern | false positive: the same count text inside the M5.1 report's merge recommendation; no credential value | — |
| H6 | `docs/milestones/M5.1.md:583` (added at `c26710a`) | secret=… pattern | false positive: the same count text in the M5.1 report's security line; no credential value | — |

## Dependency audit

| Lockfile | Tool + version | Command | Exit | Result | Findings |
|---|---|---|---|---|---|
| `package-lock.json` | npm 11.19.1 | CMD-16, CMD-17 | 1 | 15 advisory entries: 6 critical, 9 high, 0 moderate, 0 low; production tree (`--omit=dev`): 6 critical, 8 high. Root advisories unchanged from M5: simple-git (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5), @simple-git/argv-parser (GHSA-v5rq-49vh-5v5c), node-forge (GHSA-86w9-cpqp-85rv), braces (GHSA-vfj7-8cjw-p6xm) | SEC-1, SEC-2, SEC-3 |

- **Packages added or upgraded in this milestone:** none (CMD-7)
- **Manifests without a committed lockfile:** none

## Threat and invariant trace

| HLD id | What the design says (mitigation or invariant, short) | Checked in | Result |
|---|---|---|---|
| TH-1 | server sessions; secure, HTTP-only, same-site cookie; 15-minute idle; sign-in rate limit | CK-01, CK-02 | pass (unchanged; S15 and the 404 page sit behind the page guard, AT_003) |
| TH-2 | server ignores browser prices | CK-13 | pass (no server change) |
| TH-3 | rate limits on sign-in and pay; idempotent payment | CK-15 | pass (unchanged) |
| TH-4 | every API call checked against the person's orders or practice; unknown and forbidden look the same | CK-03 | pass (no API change; S15 links are links only, AT_004) |
| TH-5 | operations read de-identified views | CK-09 | pass (no response change) |
| TH-6 | only the SRE changes roles, never their own | CK-03 | n.a.: no role-change endpoint yet (M6); S15 only names the SRE's future pages |
| TH-7 | append-only histories of price, stock, role | CK-13 | pass (unchanged) |
| TH-8 | app user cannot change append-only records; database checks the split | CK-13 | pass (unchanged) |
| TH-9 | database password only in the host's secret store; private network | CK-07 | pass in code (unchanged); host side not checked (N3) |
| TH-10 | verify a real provider's signature (later); stub in-process now | CK-15 | n.a.: stub gateway in-process, no inbound call |
| TH-11 | notices carry only practice name and sign-in link | CK-09 | pass (notice page unchanged) |
| TH-12 | deploys human-only; host account two-factor | CK-11 | n.a.: host account settings are outside the code (N3) |
| INV-1 | split adds up to the cent | CK-13 | pass (unchanged) |
| INV-2 | paid at most once | CK-13 | pass (unchanged) |
| INV-3 | whole cents only | CK-13 | pass (unchanged) |
| INV-4 | paid money records, ledger, price, stock and access histories never changed or deleted | CK-13 | pass for the app role (unchanged); the demo reset caveat stands (Q5) |
| INV-5 | stock never below zero | CK-13 | pass (unchanged) |
| INV-6 | payout never below $0.00 | CK-13 | pass (unchanged) |
| INV-7 | people see only their own or their practice's orders; operations never see patient identity | CK-03 | pass (no API change; S15 shows only the caller's own name) |
| INV-8 | checkout pays the prices fixed at checkout start | CK-13 | pass (unchanged) |
| INV-9 | report totals equal the ledger | CK-13 | n.a.: financial report is M6 |
| INV-10 | only the SRE changes roles, never their own | CK-03 | n.a.: role changes are M6 |

## Diff coverage

| Path | Rows touched | Note |
|---|---|---|
| `app/pages/index.vue` | CK-01, CK-03, CK-05, CK-09 | FE-25 S15: guarded page; reads the caller's session; redirects only to a `ROLE_PAGES` constant or `/sign-in`; else shows the caller's own name, role name and fixed copy |
| `app/error.vue` | CK-03, CK-05, CK-08 | FE-26: two fixed sentences chosen by status code; constant link to `/`; no error message or stack rendered |
| `app/utils/role-home.ts` | CK-03 | `ROLE_PAGES` constant table (role to fixed paths); `ROLE_HOME` derived from it, `/` for roles with none |
| `app/components/ProblemMessage.vue` | CK-03 | constant "Go to your home" link to `/` on the forbidden message |
| `tests/acceptance/M5.2/landing.test.ts` | CK-01, CK-03 | M5.2 acceptance: landing per role, 404 for signed-in and signed-out, wrong-role link, role `none` |
| `.githooks/pre-push` | CK-11 | harness only: unsets git hook variables before `make check`; not shipped |
| `Makefile` | none | adds the M5.2 acceptance suite to `make check` |
| `MILESTONES.md` | none | milestone table |
| `docs/` | none | PRD, screens, flows and LLD updates for S15, FE-25, FE-26 |
| `specs/` | none | M5.2 acceptance and task specs |
| `.handoff/` | none | supervisor state, the milestone diff patch and the pass-1 review |

## Findings

| ID | Source | Severity | Finding | Evidence | Reachable | Recommend | Disposition | State |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | dependency | critical | simple-git up to 4.0.1 and @simple-git/argv-parser below 2.0.1 allow git command execution past the unsafe-operation guard (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c); pulled in by @nuxt/devtools | CMD-16 | no: devtools off (`nuxt.config.ts:33`) and absent from `.output/server` (Log 2026-10-10 15:47 CDT build check; M5.2 changes no lockfile, CMD-7) | accept | accepted (D51) | open |
| SEC-2 | dependency | high | node-forge accepts forged RSA PKCS#1 v1.5 signatures (GHSA-86w9-cpqp-85rv); pulled in by listhen (the Nuxt dev server) through nitropack and @nuxt/cli | CMD-16 | no: dev server only, absent from `.output/server` (same build check) | accept | accepted (D49) | open |
| SEC-3 | dependency | high | braces allows stack-exhaustion denial of service on crafted glob patterns (GHSA-vfj7-8cjw-p6xm); pulled in by micromatch, fast-glob and globby under nuxt build tooling and kysely-codegen | CMD-16 | no: build-time only, absent from `.output/server` (same build check) | accept | accepted (D50) | open |
| SEC-4 | CK-05, CK-10, CK-11 | medium | The app sends no security headers: no Content-Security-Policy with frame-ancestors, no X-Content-Type-Options, no Referrer-Policy, no HSTS | `nuxt.config.ts:13` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-5 | CK-06 | medium | No anti-CSRF token or Origin check; protection rests on SameSite=Lax and JSON-only bodies, which weakens if the app is embedded in the EHR iframe with SameSite=None | `server/services/session.ts:196` | no: SameSite=Lax today; even embedded, every write needs JSON plus a custom Idempotency-Key header, which forces a CORS preflight that no CORS config allows | accept | accepted (D52) | open |
| SEC-6 | CK-02 | medium | No absolute session lifetime: a session kept active never expires | `server/services/session.ts:157` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-7 | CK-08 | medium | Unexpected errors are logged as whole error objects; a PostgreSQL constraint error includes the failing row with order amounts, against NFR-010 | `server/utils/problem.ts:85` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-8 | CK-09 | medium | Order, session and operations responses carry no Cache-Control: no-store, so a shared clinic browser or proxy may keep order details | `nuxt.config.ts:40` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-9 | CK-15 | medium | The pay endpoint has no per-person or per-address rate limit, which TH-3 names; idempotency stops double charges but not floods | `server/services/payments.ts:58` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-10 | CK-04 | low | Order line quantity has no upper bound in validation; since FR-025 the send refuses more than is in stock (`server/services/orders.ts:60`, AT-014), so only a stock count large enough to overflow the integer total still reaches the 500 | `server/api/orders/index.post.ts:13` | yes: only with an extreme stock count | accept | accepted (D76) | open |
| SEC-11 | CK-09 | low | sign_in_attempts keeps typed emails (including mistyped ones of other people) and client addresses with no retention rule; rows are pruned only when someone signs in | `server/tasks/prune-attempts.ts:14` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-12 | CK-04 | low | Out-of-range input on the new routes returns a 500 instead of a 422: a price_cents or a stock change past the 32-bit integer column range, or a history cursor whose date JavaScript parses but PostgreSQL rejects | `server/services/pricing.ts:15` | yes: signed-in provider or operations staff only; no data exposed, error facts logged without values | accept | accepted (D77) | open |
| SEC-13 | CK-06 | low | GET EP-21 now writes: viewing an in_checkout order ends a due hold or closes an abandoned payment; a cross-site top-level GET can trigger it, but only a transition that is already due, for an order the viewer may see | `server/services/orders.ts:312` | yes: no attacker benefit, the write is time-driven and idempotent | accept | accepted (D78) | open |
| SEC-14 | CK-13 | low | No test proves stock_movements refuses UPDATE and DELETE, which INV-4 names; the grant enforces it (insert-only) but a later migration could widen it unnoticed | `db/migrations/1760000013000_stock-movements.sql:26` | no: the grant is in place today | fix | fix (AT-044, Approvals 2026-10-10 23:59 CDT) | fixed @ae240c2 (CMD-6) |
| SEC-15 | CK-09 | low | The S15 home at `/` now shows the signed-in person's display name and role name (for a patient, that she is a patient of a practice) but `/` has no `Cache-Control: no-store` rule, so a shared clinic browser's back button or cache may show it to the next person after sign-out; the same gap already exists for `/practice/**` pages | `nuxt.config.ts:42` | yes: only on a shared browser, only the previous person's own name and role, no order data; HTTPS rules out shared proxies | accept | pending G5 | open |

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

## Not checked

| ID | What | Why not | Risk of the gap | Who closes it |
|---|---|---|---|---|
| N1 | Live TLS certificate, HTTPS redirect and response headers on the deployed app | check-security sends no requests to deployments | the host could differ from config | ship-milestone (G-live) |
| N2 | The sign-in and pay limits' client address behind Railway's proxy (`TRUST_PROXY=1`, last X-Forwarded-For entry, `server/services/session.ts:84`) | needs live traffic | if the proxy's last entry is not the client, every visitor shares one bucket or a client can spoof its bucket | ship-milestone (G-live) |
| N3 | Host account settings: secret store, private database network, two-factor sign-in (TH-9, TH-12) | outside the repo | a leaked host account is the key to everything | the human |
| N4 | A verified secret scan of full history with gitleaks | gitleaks not on PATH; installing is not allowed here | the grep heuristic can miss credential formats it does not know, on a repo with a public mirror | the human or CI: `gitleaks git --redact --no-banner -v .` |
| N5 | Whether advisory code (simple-git, node-forge, braces) is in the built server | closed at M4 by the supervisor's build check (Log 2026-10-10 15:47 CDT); not re-run here. M5.2 changes no manifest or lockfile (CMD-7) | a later dependency change could pull one in; D49 to D51 name that trigger | re-check on any lockfile change that adds a dependency tree |
| N6 | Database connection TLS to the managed PostgreSQL | depends on the host's private network | traffic between app and database could be readable on the host network | ship-milestone |
| N7 | The in-EHR embed itself: launch-token verification and framing by Cerbo's origin | the app is not embedded yet: `frame-ancestors 'self'` blocks framing (`nuxt.config.ts:21`) and no launch handler exists (D55 names this as a pre-embed fix) | when embedded, the cookie moves to SameSite=None and the launch identity becomes a trust boundary this checklist has never seen | the milestone that embeds the app (CK-16 then applies) |
| N8 | The built bundle's font and stylesheet URLs in production (`.output/public/_nuxt/`) | check-security runs no build or serve | a production-only asset setting could move assets to another origin and break NFR-016; none is set (`nuxt.config.ts:9` holds `cdnURL:""`) | ship-milestone (G-live) |
| N9 | The production build's error responses: what Nuxt itself adds to an error page or a JSON error answer for a page request that fails with a 500 (for example a stack in the payload) | needs a production build and a forced server error; check-security builds and serves nothing. `app/error.vue:8` reads only `statusCode`, so the page text holds no detail; Nuxt omits stacks outside dev mode | if a production payload carried an error message, a signed-in person could read a server detail in page source; no secret or PHI path is known | ship-milestone (G-live): force a 500 on the deployed app and read the HTML and payload |

## Questions

| ID | Question | Why it matters | Recommended answer | Blocks |
|---|---|---|---|---|
| Q1 | ⚠ Does `nuxt build` output (`.output/server`) contain simple-git, node-forge or braces? | decided whether SEC-1 to SEC-3 ship to production | answered 2026-10-10 15:47 CDT (tracker Log, VERIFY SEC-1): none of them is in `.output/server`; M5.2 adds no dependency | nothing |
| Q2 | ⚠ Every seeded demo person, including the SRE, shares one demo password; should M6 (role changes, EP-34 to EP-37) give the SRE account its own password? | today the SRE account can change nothing; in M6 it would let anyone with the demo password change roles | yes: one password per role-changing account before M6 ships, or keep the SRE account out of the public demo | nothing |
| Q3 | ⚠ D53's revisit trigger ("M5 adds stock limits (FR-025)") has happened; re-accept SEC-10? | an accepted risk whose trigger fired becomes a decision again | answered 2026-10-10 23:59 CDT (Approvals G5 SEC-10): re-accepted as D76 | nothing |
| Q4 | ⚠ The M5.1 branch moved during that run; re-run after M5.1-T005? | the M5.1 checklist went stale at the next commit | answered 2026-10-11 08:20 CDT by the M5.1 re-run at `e54eca8`; M5.1 merged (`c956959`) | nothing |
| Q5 | ⚠ The demo reset empties the append-only price and stock histories (and, since M4, the ledger), which INV-4 otherwise forbids. Should it refuse to run once the database holds real, non-demo data? | today it is human-run with the owner role, needs `DEMO_RESET=yes`, and production setup skips it (`docs/runbooks/deploy.md:153`); with real patients it would erase money and stock records | no action while the deployment is a demo; before real patients, make the reset refuse on a production marker or remove it from the production image | nothing |

## Commands run

- **CMD-1** `date` → exit 0 · Sun Oct 11 10:07:08 CDT 2026
- **CMD-2** `git branch --show-current`; `git status --porcelain -- . ':!docs/milestones' ':!.handoff' ':!docs/security/CHECKLIST.md'`; `git rev-parse milestone/m5.2-safe-landing` → exit 0 · on the milestone branch, empty status, 7e9634415be37cb221e33a733dde2c3c8f62f8e2
- **CMD-3** `git merge-base main milestone/m5.2-safe-landing`; `git diff --stat c956959 milestone/m5.2-safe-landing` → exit 0 · c95695976dc9c0c60423a91cbf82f68a8d2bf063 (main's M5.1 merge); 18 files, 1340 insertions, 25 deletions; `docs/architecture/hld.md` not among them
- **CMD-4** `git diff --name-only c956959 HEAD` filtered to non-doc paths, and `git diff c956959 HEAD -- .githooks app Makefile MILESTONES.md tests` read in full → exit 0 · 7 paths: .githooks/pre-push, Makefile, app/components/ProblemMessage.vue, app/error.vue, app/pages/index.vue, app/utils/role-home.ts, tests/acceptance/M5.2/landing.test.ts
- **CMD-5** `command -v gitleaks osv-scanner pnpm npm; npm --version` → npm present, gitleaks, osv-scanner and pnpm absent, npm 11.19.1
- **CMD-6** `make check` at 7e96344 → exit 0 · 218 unit passed (14 files), 43 M4 acceptance (5 files), 44 M5 acceptance (5 files), 5 M5.1 acceptance (1 file), 5 M5.2 acceptance (1 file: AT_001 to AT_005), diagram embeds in sync, make check: OK
- **CMD-7** `git diff --name-only c956959 HEAD -- server db nuxt.config.ts package.json package-lock.json` → exit 0 · empty (no server, migration, config, manifest or lockfile change)
- **CMD-8** `git diff c956959 HEAD -- app` added lines matched against `error.(message/stack/statusMessage/data)/stack/console./navigateTo/query/route./href/:to/v-html/https?://` → exit 0 · 4 lines: the error page link `href="/"` with `clearError({ redirect: '/' })`, the two S15 `navigateTo` calls (`/sign-in`, `pages[0].path`), the S15 `NuxtLink :to="p.path"`; no error field, no log call, no external URL, no route or query value used
- **CMD-10** `git grep -nE 'v-html/innerHTML/dangerouslySetInnerHTML' -- app server` → exit 1 · 0 hits
- **CMD-12** `git grep -nIiE "$P" -- . ':!vendor' ':!node_modules' ':!*.lock' ':!package-lock.json' ':!*.min.js' / cut -d: -f1-2` → exit 0 · 5 hits: docs/milestones/M5.1.md:417, :572, :583; docs/milestones/M5.md:637, :828
- **CMD-13** `git ls-files / grep -E '(^/\/)\.env' / grep -vE '\.(example/sample/dist/template)$'` → exit 1 · none
- **CMD-14** `git log --all -E -i -G"$P" --format='%h %ad' --date=short --name-only -- …` → exit 0 · c26710a (docs/milestones/M5.1.md), 691b4e1 (docs/milestones/M5.md), b045719, 8949ae4, cc64669 (public/.htaccess)
- **CMD-15** `git grep -nIE 'https?://' -- app nuxt.config.ts` excluding `.invalid` → exit 0 · 1 hit, `app/middleware/auth.global.ts:10` (a comment naming rejected redirect forms; unchanged)
- **CMD-16** `npm audit --package-lock-only` (and `--json`) → exit 1 · 15 vulnerabilities (9 high, 6 critical); advisories GHSA-858h-whjf-mvg5, GHSA-86w9-cpqp-85rv, GHSA-g4wm-2vf7-vfgr, GHSA-v5rq-49vh-5v5c, GHSA-vfj7-8cjw-p6xm, GHSA-x6jw-m9v5-85vh
- **CMD-17** `npm audit --package-lock-only --omit=dev` → exit 1 · 14 vulnerabilities (8 high, 6 critical)
- **CMD-19** `git grep -nIiE 'openai/anthropic/…/llamaindex' -- . ':!vendor' ':!node_modules' ':!docs' ':!specs' ':!.handoff' ':!*.md'` → exit 0 · 1 hit, `.claude/settings.json:6` (agent plugin setting, not a model call)
