---
artifact: security-checklist
milestone: M6.1
branch: milestone/m6.1-patient-orders
base_sha: d7c423bea2d7caa58b44545eeb66f3ad96043245
head_sha: 243a1857f460303162651bab649dde13f559dd29
checked: Sun Oct 11 14:26:44 CDT 2026
checker: check-security (Claude Code, claude-opus-5-5)
standard: OWASP ASVS 5.0 Level 1, chapter-level mapping
gate: G5
status: draft
---

# Security checklist: cerbo-supplement-store M6.1

## Summary

M6.1 adds one read-only API route, GET `/api/orders` (EP-42), that lists the signed-in patient's own orders with keyset paging, the S16 "Your orders" page, and a patient entry in `ROLE_PAGES` so the site root sends a patient to S16. No patient can see another patient's orders: the list query is scoped to the caller's own user id, a tampered cursor only moves her position inside her own list, and each row then goes through the order-view check again. The list shows only her order number, status, practice name, total and dates. Listing can end a due hold or close an abandoned payment, but only on her own orders and only when that change is already due, which is the accepted EP-21 behaviour (SEC-13, D78). One new low finding: a hand-crafted cursor dated year 0000 passes the shared cursor check and, if PostgreSQL rejects that year as expected (Q7), gives a 500 instead of a 422 (SEC-18). No data leaks through it. The only critical and high findings are the three Nuxt tooling advisories already accepted (D49 to D51), which are absent from the built server. The G5 security condition is met, and nothing critical or high is reachable inside Cerbo's EHR.

- **G5 security condition:** met: secrets 0, unaccepted high/critical 0
- **Rows:** 9 pass · 5 fail · 0 n.a. (of 14)
- **Open findings:** 1 critical · 2 high · 1 medium · 7 low
- **Secret scan:** grep heuristic (unverified): 16 hits: 0 secret, 0 revoked, 16 false positive
- **Dependency audit:** `package-lock.json`: npm 11.19.1 `npm audit --package-lock-only` → 15 advisory entries (6 critical, 9 high), the same six root advisories as M5 to M6; 14 in the production tree (`--omit=dev`); M6.1 changes no manifest or lockfile (CMD-7)
- **Accepted risks:** D51 SEC-1, D49 SEC-2, D50 SEC-3, D52 then D91 SEC-5, D76 SEC-10, D77 SEC-12, D78 SEC-13, D82 SEC-15, D88 SEC-16, D89 SEC-17
- **Biggest gap:** N4: no verified (gitleaks) history scan has ever run. The grep heuristic is the only secret evidence, and the repo has a public mirror

## Scope and method

- **Milestone:** M6.1 `milestone/m6.1-patient-orders`; diff `d7c423b`..`243a185`, 20 files changed (CMD-3); every non-doc path read in full (CMD-4). Local `main` now equals `origin/main` (`d7c423b`, the M6 merge), so this diff is M6.1 alone
- **Milestone kind:** code (CMD-4 lists 8 non-doc paths: `Makefile`, `app/pages/orders/index.vue`, `app/utils/role-home.ts`, `server/api/orders/index.get.ts`, `server/services/orders.ts`, and three test files)
- **Trust boundaries in play:** TB-1 internet to web app (one new `/api/orders` GET, one new `/orders` page); TB-2 between roles (patient-only list, scoped to the caller); TB-3 web app to database (new read query; existing hold-ending writes reached through a new path). TB-4 and TB-5 unchanged: no outbound call, config, manifest or migration change (CMD-7, CMD-15) (from `docs/architecture/hld.md` §5, unchanged in this diff, CMD-3)
- **Change plan security field:** no change plan (greenfield)
- **Inherited findings routed here:** no AUDIT.md
- **Tools on PATH:** gitleaks absent, osv-scanner absent, pnpm absent, composer present (no composer.lock), npm 11.19.1 (CMD-5)
- **Tests cited:** `make check` at 243a185 (CMD-6) → exit 0. M6.1 acceptance proves her list excludes Ben's order (`tests/acceptance/M6.1/patient-orders.test.ts:44`), 403 for provider and reviewer and 401 for a stranger (:50), and 422 for a made-up cursor (:87). Unit tests prove the query is scoped to her id (`tests/unit/patient-orders.test.ts:67`), the cursor values are bound parameters (:91), and a bad cursor or limit is refused before any query (:94)

## Checklist

Status: `pass`, `fail` or `n.a.`; no evidence is `fail`. Evidence: `path:line` or `CMD-<n>` plus its result.

| ID | Area | ASVS 5.0 | Status | Evidence | Finding |
|---|---|---|---|---|---|
| CK-01 | Authentication | V6 | pass | EP-42 signs the caller in first (`server/api/orders/index.get.ts:10`, 401 for a stranger at `tests/acceptance/M6.1/patient-orders.test.ts:50`). S16 sends a 401 to sign-in with `next: route.fullPath` (`app/pages/orders/index.vue:37`), which the sign-in page filters through `safeNext` (`app/middleware/auth.global.ts:11`). No sign-in, password or session code changed (CMD-4) | — |
| CK-02 | Session management | V7 | pass | No cookie or timeout change: `server/services/session.ts:196` (Secure, HttpOnly, SameSite=Lax) is not in the diff (CMD-3). The role is re-read from `users` on every request (`server/services/session.ts:180`) | — |
| CK-03 | Access control and IDOR | V8 | pass | Patient only: `assertRole(viewer, ['patient'])` (`server/api/orders/index.get.ts:11`). The list query takes the patient id from the session, never from input (`server/services/orders.ts:433`), and the cursor only adds `(sent_at, id) <` to that scoped query (`server/services/orders.ts:434`), so a tampered cursor can only skip within her own list. Each row is read again through `getOrderForViewer`, which re-checks ownership (`server/services/orders.ts:440`, :311). Tests: Ben's order absent from Ana's list (`tests/acceptance/M6.1/patient-orders.test.ts:44`); the query is scoped to `patient_id = $1` with her id (`tests/unit/patient-orders.test.ts:67`); provider and reviewer get 403 (`tests/acceptance/M6.1/patient-orders.test.ts:50`); green in CMD-6 | — |
| CK-04 | Input validation and injection | V1, V2 | fail | `cursor` must be a single string (`server/services/orders.ts:424`), then BE-22 decodes it: id `^\d{1,18}$`, key a `+00` timestamp re-checked as a real JS instant (`server/utils/paging.ts:33`, :37); `limit` is 1 to 100 (`server/utils/paging.ts:47`). Values reach SQL only as bound parameters (`tests/unit/patient-orders.test.ts:91`; CMD-9). Gap: JavaScript accepts year 0000 but PostgreSQL does not (CMD-20, Q7), so a crafted cursor can still reach the cast. Row stays fail on accepted SEC-10 and SEC-12 | SEC-10, SEC-12, SEC-18 |
| CK-05 | Output encoding and XSS | V1, V3 | pass | No `v-html`, `innerHTML` or `dangerouslySetInnerHTML` in `app/` or `server/` (CMD-10, 0 hits). S16 renders practice name, status and dates through Vue text interpolation (`app/pages/orders/index.vue:101`); the row link is a numeric order id (`app/pages/orders/index.vue:100`); unknown statuses fall back to text, never HTML. CSP unchanged (`nuxt.config.ts:14`, CMD-7) | — |
| CK-06 | CSRF | V3 | fail | EP-42 is a GET with no new write of its own. Through `getOrderForViewer` it can end a due hold or close an abandoned payment on the caller's own `in_checkout` orders (`server/services/orders.ts:312`), which is the time-driven write accepted for EP-21 as SEC-13 (D78). D78's trigger ("a GET handler gains a write that is not time-driven") is not met. A cross-site top-level GET in Ana's browser can only run transitions that are already due, on her orders. Row stays fail on the accepted M5 findings | SEC-5, SEC-13 |
| CK-07 | Secrets and cryptography | V11, V13 | pass | Secret scan: 14 tree hits and 10 history commits, all false positive; no tracked env file (CMD-12, CMD-13, CMD-14). The new cursor is plain base64url of `[key, id]` (`server/utils/paging.ts:24`) and is not used as a credential; the server-side scoping in CK-03 makes signing it unnecessary. No secret or crypto code in the diff (CMD-4) | — |
| CK-08 | Errors and logging (no PII or secrets) | V16 | pass | The diff adds no log call (CMD-8, 0 hits). Bad input is a 422 problem with a fixed message (`server/services/orders.ts:425`, `server/utils/paging.ts:39`); any other error goes through `defineApiHandler`, which logs `errorFacts` only (`server/utils/problem.ts:86`) | — |
| CK-09 | Data protection | V14 | fail | Each row carries only order id, status, practice name, total cents, sent and paid dates (`server/services/orders.ts:441`). No provider name, no lines, no other person. `/api/orders` falls under `/api/**` no-store (`nuxt.config.ts:43`). The S16 page path `/orders` falls under `/orders/**` (`nuxt.config.ts:44`) because Nitro's matcher counts the bare prefix as a match (`node_modules/radix3/dist/index.mjs:216`); the rule is pinned by `tests/unit/hardening.test.ts:88`. Row stays fail on accepted SEC-15 and SEC-16 | SEC-15, SEC-16 |
| CK-10 | TLS verified | V12 | pass | No outbound client, `http://` URL or verification switch added (CMD-15, 0 hits); HSTS unchanged (`nuxt.config.ts:25`, CMD-7) | — |
| CK-11 | Configuration and headers | V13, V3 | pass | `nuxt.config.ts`, `package.json`, the lockfile and `db/` untouched (CMD-7): CSP with `frame-ancestors 'self'` (`nuxt.config.ts:21`), devtools off (`nuxt.config.ts:33`). `ROLE_PAGES` gains one constant same-site path (`app/utils/role-home.ts:9`). The Makefile change only adds the M6.1 suite to `make check` | — |
| CK-12 | Dependencies | V15 | fail | `package-lock.json` committed; no manifest or lockfile change in M6.1 (CMD-7). npm audit still reports the accepted Nuxt and kysely-codegen tooling advisories (CMD-16, exit 1; CMD-17) | SEC-1, SEC-2, SEC-3 |
| CK-13 | Business logic and money integrity | V2 | pass | Each listed total is computed on the server by the same code as the order page (`server/services/orders.ts:440`, :333), in integer cents. AT-005 shows list and order agree after a price change (`tests/acceptance/M6.1/patient-orders.test.ts:90`). Hold-ending writes take the order row lock first (`server/services/orders.ts:247`). The abandoned-payment release locks products in sorted id order (`server/services/stock.ts:72`), so parallel per-row views of different orders cannot deadlock on stock. No price, status or amount is read from the request | — |
| CK-15 | APIs and webhooks | V4 | fail | EP-42 authenticates and checks the role (CK-01, CK-03) and returns only the openapi fields (`server/services/orders.ts:441`). Each list request fans out to one order view per row (`server/services/orders.ts:440`), bounded by `limit` at most 100 (`server/utils/paging.ts:50`) and by her own order count, which only providers can raise. No rate limit covers read routes, which is the accepted SEC-17 gap (D89) | SEC-17 |

## LLM risks

n.a.: no model call in code (CMD-19 → only non-code hits: `.claude/settings.json:6`, an agent plugin setting, not a model call); no model container in docs/architecture/hld.md.

## Secret scan

- **Scanner:** grep heuristic (unverified)
- **Scope:** working tree + tracked env files + history commit list
- **Commands:** CMD-12 → 14 tree hits: `.handoff/reviews/M6-diff.patch` (4), `docs/milestones/M5.1.md` (3), `docs/milestones/M5.2.md` (3), `docs/milestones/M5.md` (2), `docs/milestones/M6.md` (2); CMD-13 → exit 1, no tracked env file; CMD-14 → 10 commits: `d4e0da1` (docs/milestones/M6.md), `a794224` (docs/security/CHECKLIST.md), `eaf0a52`, `8f18a05`, `e94fe57`, `c26710a`, `691b4e1`, `b045719`, `8949ae4`, `cc64669`
- **History (heuristic only):** H1, H14 (CMD-14)
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
| H14 | history: `docs/security/CHECKLIST.md:78 @e94fe57` (removed at `a794224`) | secret=… pattern | false positive: the M5.2 checklist's H4 row quoting the count text | — |
| H15 | `docs/milestones/M6.md:472` (added at `d4e0da1`) | secret=… pattern | false positive: the M6 report's Done-when count line (`secrets=` followed by a count) | — |
| H16 | `docs/milestones/M6.md:641` (added at `d4e0da1`) | secret=… pattern | false positive: the same count text in the M6 security line | — |

## Dependency audit

| Lockfile | Tool + version | Command | Exit | Result | Findings |
|---|---|---|---|---|---|
| `package-lock.json` | npm 11.19.1 | CMD-16, CMD-17 | 1 | 15 advisory entries: 6 critical, 9 high, 0 moderate, 0 low; production tree (`--omit=dev`): 6 critical, 8 high. Root advisories unchanged from M5: simple-git (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5), @simple-git/argv-parser (GHSA-v5rq-49vh-5v5c), node-forge (GHSA-86w9-cpqp-85rv), braces (GHSA-vfj7-8cjw-p6xm) | SEC-1, SEC-2, SEC-3 |

- **Packages added or upgraded in this milestone:** none (CMD-7)
- **Manifests without a committed lockfile:** none

## Threat and invariant trace

| HLD id | What the design says (mitigation or invariant, short) | Checked in | Result |
|---|---|---|---|
| TH-1 | server sessions; secure, HTTP-only, same-site cookie; 15-minute idle; sign-in rate limit | CK-01, CK-02 | pass (unchanged; EP-42 calls `requireViewer`) |
| TH-2 | server ignores browser prices | CK-13 | pass (list totals computed on the server, no price input) |
| TH-3 | rate limits on sign-in and pay; idempotent payment | CK-15 | pass for sign-in and pay (unchanged); read routes unlimited: SEC-17 (accepted D89) |
| TH-4 | every API call checked against the person's orders or practice; unknown and forbidden look the same | CK-03 | pass (list scoped to her id; each row re-checked by `assertCanViewOrder`; cursor cannot widen scope) |
| TH-5 | operations read de-identified views | CK-09 | pass (EP-42 refuses every operations role, AT-002); SEC-16 unchanged (accepted D88) |
| TH-6 | only the SRE changes roles, never their own | CK-03 | pass (unchanged) |
| TH-7 | append-only histories of price, stock, role | CK-13 | pass (unchanged; listing writes no history) |
| TH-8 | app user cannot change append-only records; database checks the split | CK-13 | pass (no grant change, CMD-7) |
| TH-9 | database password only in the host's secret store; private network | CK-07 | pass in code (unchanged); host side not checked (N3) |
| TH-10 | verify a real provider's signature (later); stub in-process now | CK-15 | n.a.: stub gateway in-process, no inbound call |
| TH-11 | notices carry only practice name and sign-in link | CK-09 | pass (notice code unchanged) |
| TH-12 | deploys human-only; host account two-factor | CK-11 | n.a.: host account settings are outside the code (N3) |
| INV-1 | split adds up to the cent | CK-13 | pass (unchanged) |
| INV-2 | paid at most once | CK-13 | pass (listing never pays; the reconcile it can run needs the attempt still processing, `server/services/orders.ts:261`) |
| INV-3 | whole cents only | CK-13 | pass (`total_cents` integer) |
| INV-4 | paid money records, ledger, price, stock and access histories never changed or deleted | CK-13 | pass (no grant change); Q5 unchanged |
| INV-5 | stock never below zero | CK-13 | pass (listing only releases stock for an abandoned payment, in sorted lock order) |
| INV-6 | payout never below $0.00 | CK-13 | pass (unchanged) |
| INV-7 | people see only their own or their practice's orders; operations never see patient identity | CK-03, CK-09 | pass for EP-42 (AT-001 excludes Ben's order); SEC-16 unchanged (accepted D88) |
| INV-8 | checkout pays the prices fixed at checkout start | CK-13 | pass (a live hold's prices are what the list shows, same code as EP-21) |
| INV-9 | report totals equal the ledger | CK-13 | pass (unchanged) |
| INV-10 | only the SRE changes roles, never their own | CK-03 | pass (unchanged) |

## Diff coverage

| Path | Rows touched | Note |
|---|---|---|
| `server/api/orders/index.get.ts` | CK-01, CK-03, CK-04 | EP-42: sign-in, patient-only role check, raw cursor and limit handed to BE-9 |
| `server/services/orders.ts` | CK-03, CK-04, CK-06, CK-09, CK-13, CK-15 | `listOrdersForPatient`: query scoped to her id, keyset cursor via BE-22, one `getOrderForViewer` per row (can end a due hold, SEC-13) |
| `app/pages/orders/index.vue` | CK-01, CK-05, CK-09 | S16: text interpolation only, numeric order links, 401 to sign-in with `safeNext`-checked `next` |
| `app/utils/role-home.ts` | CK-03, CK-11 | patient now lands on `/orders`; constant path |
| `Makefile` | none | adds the M6.1 acceptance suite to `make check` |
| `tests/acceptance/M5.2/landing.test.ts` | CK-01 | M5.2 AT-001 now accepts a redirect to S16, but not to sign-in or a refusal (pass 1 R1, `243a185`) |
| `tests/acceptance/M6.1/` | CK-03, CK-04, CK-13 | M6.1 acceptance: her orders only, 403/401, 422 cursor, totals match EP-21 |
| `tests/unit/patient-orders.test.ts` | CK-03, CK-04 | scoped query, bound cursor parameters, validation before any query |
| `MILESTONES.md` | none | milestone table |
| `docs/` | none | PRD, LLD, openapi, flows and screens for EP-42 and S16 |
| `specs/` | none | M6.1 acceptance and task specs; M5.2 acceptance note for AT-001 |
| `.handoff/` | none | supervisor state, the diff patch and the verifier pass 1 review |

## Findings

| ID | Source | Severity | Finding | Evidence | Reachable | Recommend | Disposition | State |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | dependency | critical | simple-git up to 4.0.1 and @simple-git/argv-parser below 2.0.1 allow git command execution past the unsafe-operation guard (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c); pulled in by @nuxt/devtools | CMD-16 | no: devtools off (`nuxt.config.ts:33`) and absent from `.output/server` (Log 2026-10-10 15:47 CDT build check; M6.1 changes no lockfile, CMD-7) | accept | accepted (D51) | open |
| SEC-2 | dependency | high | node-forge accepts forged RSA PKCS#1 v1.5 signatures (GHSA-86w9-cpqp-85rv); pulled in by listhen (the Nuxt dev server) through nitropack and @nuxt/cli | CMD-16 | no: dev server only, absent from `.output/server` (same build check) | accept | accepted (D49) | open |
| SEC-3 | dependency | high | braces allows stack-exhaustion denial of service on crafted glob patterns (GHSA-vfj7-8cjw-p6xm); pulled in by micromatch, fast-glob and globby under nuxt build tooling and kysely-codegen | CMD-16 | no: build-time only, absent from `.output/server` (same build check) | accept | accepted (D50) | open |
| SEC-4 | CK-05, CK-10, CK-11 | medium | The app sends no security headers: no Content-Security-Policy with frame-ancestors, no X-Content-Type-Options, no Referrer-Policy, no HSTS | `nuxt.config.ts:13` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-5 | CK-06 | medium | No anti-CSRF token or Origin check; protection rests on SameSite=Lax and JSON-only bodies, which weakens if the app is embedded in the EHR iframe with SameSite=None | `server/services/session.ts:196` | no: SameSite=Lax today; even embedded, every write needs JSON plus a custom Idempotency-Key header, which forces a CORS preflight that no CORS config allows | accept | accepted (D52) | open · **M7.1 update:** the "every write needs JSON plus a key" residual was wrong for EP-22 start checkout (no body, no key); BE-23 OriginGuard now refuses any /api write whose Origin is another host or whose Sec-Fetch-Site is cross-site (D91, NFR-017, M7.1_AT_003) |
| SEC-6 | CK-02 | medium | No absolute session lifetime: a session kept active never expires | `server/services/session.ts:157` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-7 | CK-08 | medium | Unexpected errors are logged as whole error objects; a PostgreSQL constraint error includes the failing row with order amounts, against NFR-010 | `server/utils/problem.ts:85` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-8 | CK-09 | medium | Order, session and operations responses carry no Cache-Control: no-store, so a shared clinic browser or proxy may keep order details | `nuxt.config.ts:40` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-9 | CK-15 | medium | The pay endpoint has no per-person or per-address rate limit, which TH-3 names; idempotency stops double charges but not floods | `server/services/payments.ts:58` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-10 | CK-04 | low | Order line quantity has no upper bound in validation; since FR-025 the send refuses more than is in stock (`server/services/orders.ts:60`, AT-014), so only a stock count large enough to overflow the integer total still reaches the 500; D83 now caps stock at 1,000,000, which keeps the total far below the overflow | `server/api/orders/index.post.ts:13` | yes: only with an extreme stock count, now impossible under D83 | accept | accepted (D76) | open |
| SEC-11 | CK-09 | low | sign_in_attempts keeps typed emails (including mistyped ones of other people) and client addresses with no retention rule; rows are pruned only when someone signs in | `server/tasks/prune-attempts.ts:14` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-12 | CK-04 | low | Out-of-range input returns a 500 instead of a 422. M6-T006 (D83, `d5fdfbc`) closed the price and stock parts; what is left is a price-history cursor whose date JavaScript parses but PostgreSQL rejects | `server/services/pricing.ts:88` | yes: signed-in provider only, hand-crafted cursor; no data exposed, error facts logged without values | accept | accepted (D77) | open |
| SEC-13 | CK-06 | low | GET EP-21 now writes: viewing an in_checkout order ends a due hold or closes an abandoned payment; a cross-site top-level GET can trigger it, but only a transition that is already due, for an order the viewer may see. Since M6.1, GET EP-42 reaches the same write once per listed order of the caller | `server/services/orders.ts:312` | yes: no attacker benefit, the write is time-driven and idempotent | accept | accepted (D78) | open |
| SEC-14 | CK-13 | low | No test proves stock_movements refuses UPDATE and DELETE, which INV-4 names; the grant enforces it (insert-only) but a later migration could widen it unnoticed | `db/migrations/1760000013000_stock-movements.sql:26` | no: the grant is in place today | fix | fix (AT-044, Approvals 2026-10-10 23:59 CDT) | fixed @ae240c2 (CMD-6) |
| SEC-15 | CK-09 | low | The S15 home at `/` shows the signed-in person's display name and role name but `/` has no `Cache-Control: no-store` rule, so a shared clinic browser's back button or cache may show it to the next person after sign-out | `nuxt.config.ts:42` | yes: only on a shared browser, only the previous person's own name and role, no order data; HTTPS rules out shared proxies; since M6.1 a patient is redirected to S16 instead, so S15 serves only role `none` | accept | accepted (D82) | open |
| SEC-16 | CK-09 | low | EP-37 logs a refused row for any signed-in caller, so a patient or provider who hand-crafts a role-change PUT (no page offers it) puts their own display name and up to 200 characters of their own text into the append-only access log the finance lead reads on S13, against INV-7's letter; nothing limits how many such rows a caller adds, the app cannot remove them, and the 403-versus-404 answer tells the caller which user ids are staff | `server/services/staff-access.ts:86` | yes: signed-in patient or provider only, by a deliberate crafted request; it exposes only the attacker's own name and words, no order or health data | accept | accepted (D88) | open |
| SEC-17 | CK-15 | low | The request-metrics plugin adds one database upsert per counted request, including signed-out page loads such as `/sign-in`, all landing on the same hourly row per route group; under a request flood these unawaited writes compete with real requests for database connections, and no rate limit covers the new read routes | `server/plugins/request-metrics.ts:19` | yes: anyone on the internet, but harm is slower answers only; no data exposed, failed writes never fail a request (`server/services/request-metrics.ts:72`) | accept | accepted (D89) | open |
| SEC-18 | CK-04 | low | The shared BE-22 cursor check accepts a key dated year 0000, because JavaScript treats it as a real instant (CMD-20). PostgreSQL has no year 0, so a hand-crafted EP-42 cursor (and the same on EP-38) reaches the `::timestamptz` cast and returns a 500 instead of a 422 (Q7). The same class as SEC-12, now on a patient-facing route | `server/utils/paging.ts:37` | yes: signed-in patient (or finance lead on EP-38) with a hand-crafted cursor; 500 only, no data exposed, error facts logged without values (`server/utils/problem.ts:86`) | accept | pending G5 | open |

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
| D88 | SEC-16 | low | accept — STANDING row 2026-10-10 23:09 CDT: "i approve all next recommendations until project completion" | patients or providers are identified by Cerbo's EHR launch, a real patient name appears in the access log, or flooding is seen. | none |
| D89 | SEC-17 | low | accept — STANDING row 2026-10-10 23:09 CDT: "i approve all next recommendations until project completion" | traffic approaches the database pool limit or a request flood is seen. | none |

## Not checked

| ID | What | Why not | Risk of the gap | Who closes it |
|---|---|---|---|---|
| N1 | Live TLS certificate, HTTPS redirect and response headers on the deployed app | check-security sends no requests to deployments | the host could differ from config | ship-milestone (G-live) |
| N2 | The sign-in and pay limits' client address behind Railway's proxy (`TRUST_PROXY=1`, last X-Forwarded-For entry, `server/services/session.ts:84`) | needs live traffic | if the proxy's last entry is not the client, every visitor shares one bucket or a client can spoof its bucket | ship-milestone (G-live) |
| N3 | Host account settings: secret store, private database network, two-factor sign-in (TH-9, TH-12) | outside the repo | a leaked host account is the key to everything | the human |
| N4 | A verified secret scan of full history with gitleaks | gitleaks not on PATH; installing is not allowed here | the grep heuristic can miss credential formats it does not know, on a repo with a public mirror | the human or CI: `gitleaks git --redact --no-banner -v .` |
| N5 | Whether advisory code (simple-git, node-forge, braces) is in the built server | closed at M4 by the supervisor's build check (Log 2026-10-10 15:47 CDT); not re-run here. M6.1 changes no manifest or lockfile (CMD-7) | a later dependency change could pull one in; D49 to D51 name that trigger | re-check on any lockfile change that adds a dependency tree |
| N6 | Database connection TLS to the managed PostgreSQL | depends on the host's private network | traffic between app and database could be readable on the host network | ship-milestone |
| N7 | The in-EHR embed itself: launch-token verification and framing by Cerbo's origin | the app is not embedded yet: `frame-ancestors 'self'` blocks framing (`nuxt.config.ts:21`) and no launch handler exists (docs/architecture/embedding-plan.md §3 and §5 name it as a pre-embed fix; the earlier "D55" cite was wrong: D55 is the M4 demo deploy) | when embedded, the cookie moves to SameSite=None and the launch identity becomes a trust boundary this checklist has never seen; which patient's list EP-42 shows will then rest on Cerbo's identity, not demo passwords | the milestone that embeds the app (CK-16 then applies) |
| N8 | The built bundle's font and stylesheet URLs in production (`.output/public/_nuxt/`) | check-security runs no build or serve | a production-only asset setting could move assets to another origin; none is set (`nuxt.config.ts:9` holds `cdnURL:""`) | ship-milestone (G-live) |
| N9 | The production build's error responses for a page request that fails with a 500 | needs a production build and a forced server error | if a production payload carried an error message, a signed-in person could read a server detail in page source; no secret or PHI path is known | ship-milestone (G-live) |
| N10 | That the migration ran as the owner role and the live app role holds exactly the M6 grants (CMD-18 at M6 read the SQL, not the live database) | check-security never connects to a deployment's database | a hand-run grant on the host could widen what the app may change | ship-milestone (G-live): `\dp access_log` and `\dp users` on the deployed database |
| N11 | The live `Cache-Control: no-store` on `/orders` (the S16 page) | needs a running server; the evidence is the matcher source and the rule test (CK-09) | if a Nitro upgrade changed bare-prefix matching, S16 could be cached on a shared browser | ship-milestone (G-live): `curl -sI` on `/orders` signed in |

## Questions

| ID | Question | Why it matters | Recommended answer | Blocks |
|---|---|---|---|---|
| Q1 | ⚠ Does `nuxt build` output (`.output/server`) contain simple-git, node-forge or braces? | decided whether SEC-1 to SEC-3 ship to production | answered 2026-10-10 15:47 CDT (tracker Log, VERIFY SEC-1): none of them is in `.output/server`; M6.1 adds no dependency | nothing |
| Q2 | ⚠ Every seeded demo person, including the SRE, shares one demo password (`db/seed/demo.ts:63`); now that M6 lets the SRE account change roles, should it get its own password? | anyone holding the demo password can sign in as the SRE and change roles on the public demo; since the same password already opens the finance lead and every other account, role change adds no new reach | not before G5: it is not an escalation while every demo account shares the password; give role-changing accounts their own password (or keep them out of the public demo) if the demo password is ever handed to someone who should not hold every role, and rely on Cerbo's identity once embedded (N7) | nothing |
| Q3 | ⚠ D53's revisit trigger ("M5 adds stock limits (FR-025)") has happened; re-accept SEC-10? | an accepted risk whose trigger fired becomes a decision again | answered 2026-10-10 23:59 CDT (Approvals G5 SEC-10): re-accepted as D76 | nothing |
| Q4 | ⚠ The M5.1 branch moved during that run; re-run after M5.1-T005? | the M5.1 checklist went stale at the next commit | answered 2026-10-11 08:20 CDT by the M5.1 re-run at `e54eca8`; M5.1 merged (`c956959`) | nothing |
| Q5 | ⚠ The demo reset empties the append-only price, stock and ledger histories and, since M6, the access log (`db/seed/demo.ts:40`), which INV-4 otherwise forbids. Should it refuse to run once the database holds real, non-demo data? | today it is human-run with the owner role, needs `DEMO_RESET=yes` (`db/seed/demo.ts:62`), and production setup skips it (`docs/runbooks/deploy.md:153`); with real patients it would erase money, stock and role records | no action while the deployment is a demo; before real patients, make the reset refuse on a production marker or remove it from the production image | nothing |
| Q6 | ⚠ Local `main` is at `c956959` while `origin/main` has the M5.2 merge `c9b890d`; should the supervisor fast-forward local `main` before the next run? | `base_sha` follows local `main` | answered by the M6 merge: local `main` and `origin/main` are both `d7c423b` (CMD-3), so this diff is M6.1 alone | nothing |
| Q7 | ⚠ Does PostgreSQL 16 reject `'0000-01-01 00:00:00+00'::timestamptz` (year 0) as out of range, as its documented calendar (no year zero) says? check-security ran no database query to confirm it | SEC-18 is a 500 only if it does; if PostgreSQL accepts it, SEC-18 is withdrawn at the next run | the supervisor runs `select '0000-01-01 00:00:00+00'::timestamptz` on the local test database; separately, D77's trigger ("the routes open to patients") names SEC-12's price-history route, which stays provider-only, so D77 itself is not re-opened, and SEC-18 is decided on its own | nothing (SEC-18 is low) |

## Commands run

- **CMD-1** `date` → exit 0 · Sun Oct 11 14:13:04 CDT 2026 (re-checked at the moved head at 14:26:44 CDT)
- **CMD-2** `git branch --show-current`; `git status --porcelain -- . ':!docs/milestones' ':!.handoff' ':!docs/security/CHECKLIST.md'`; `git rev-parse milestone/m6.1-patient-orders` → exit 0 · on the milestone branch, empty status, 243a1857f460303162651bab649dde13f559dd29 (the branch moved from 86a9054 during this run; `git diff 86a9054 243a185` adds only two assertions to `tests/acceptance/M5.2/landing.test.ts` plus .handoff and specs docs, and every row was re-checked against it)
- **CMD-3** `git rev-parse HEAD milestone/m6.1-patient-orders main origin/main`; `git merge-base main milestone/m6.1-patient-orders`; `git diff --stat d7c423b milestone/m6.1-patient-orders` → exit 0 · main and origin/main d7c423bea2d7caa58b44545eeb66f3ad96043245 (= merge-base); 20 files, 1969 insertions, 22 deletions; `docs/architecture/hld.md` not among them
- **CMD-4** `git diff --name-only d7c423b HEAD` filtered to non-doc paths, then `git diff d7c423b HEAD -- server app Makefile tests` read in full → exit 0 · 8 paths
- **CMD-5** `command -v gitleaks osv-scanner pnpm composer npm; npm --version` → composer and npm present, gitleaks, osv-scanner and pnpm absent, npm 11.19.1
- **CMD-6** `make check` at 243a185 → exit 0 · 342 unit passed (22 files), 43 M4 acceptance (5 files), 44 M5 acceptance (5 files), 5 M5.1 (1 file), 5 M5.2 (1 file), 44 M6 acceptance (6 files), 5 M6.1 acceptance (1 file), make check: OK
- **CMD-7** `git diff --name-only d7c423b HEAD -- nuxt.config.ts package.json package-lock.json db` → exit 0 · empty (no config, manifest, lockfile or migration change)
- **CMD-8** `git diff d7c423b HEAD -- server app` added lines matching `console.` → exit 1 · 0 hits
- **CMD-9** same added lines matching `sql.raw`, `sql.lit`, `exec(`, `child_process`, `eval(` → exit 1 · 0 hits; the one new `sql` tagged template (`server/services/orders.ts:434`) binds `after.key` and `after.id` as parameters, proved at `tests/unit/patient-orders.test.ts:91`
- **CMD-10** `git grep -nE 'v-html/innerHTML/dangerouslySetInnerHTML' -- app server` → exit 1 · 0 hits
- **CMD-12** `git grep -nIiE "$P" -- . ':!vendor' ':!node_modules' ':!*.lock' ':!package-lock.json' ':!*.min.js' / cut -d: -f1-2` → exit 0 · 14 hits: .handoff/reviews/M6-diff.patch:3897, :4023, :4034, :4266; docs/milestones/M5.1.md:417, :572, :583; docs/milestones/M5.2.md:333, :459, :470; docs/milestones/M5.md:637, :828; docs/milestones/M6.md:472, :641
- **CMD-13** `git ls-files / grep -E '(^/\/)\.env' / grep -vE '\.(example/sample/dist/template)$'` → exit 1 · none
- **CMD-14** `git log --all -E -i -G"$P" --format='%h %ad' --date=short --name-only -- …` → exit 0 · d4e0da1 (docs/milestones/M6.md), a794224 (docs/security/CHECKLIST.md), eaf0a52 (.handoff/reviews/M6-diff.patch), 8f18a05, e94fe57, c26710a, 691b4e1, b045719, 8949ae4, cc64669 (public/.htaccess)
- **CMD-15** `git diff d7c423b HEAD -- server app` added lines matching `https?://`, `rejectUnauthorized`, `NODE_TLS`, `fetch(`, `localStorage` → exit 1 · 0 hits
- **CMD-16** `npm audit --package-lock-only` (and `--json`) → exit 1 · 15 vulnerabilities (9 high, 6 critical); advisories GHSA-858h-whjf-mvg5, GHSA-86w9-cpqp-85rv, GHSA-g4wm-2vf7-vfgr, GHSA-v5rq-49vh-5v5c, GHSA-vfj7-8cjw-p6xm, GHSA-x6jw-m9v5-85vh
- **CMD-17** `npm audit --package-lock-only --omit=dev` → exit 1 · 14 vulnerabilities (8 high, 6 critical)
- **CMD-19** `git grep -nIiE 'openai/anthropic/…/llamaindex' -- . ':!vendor' ':!node_modules' ':!docs' ':!specs' ':!.handoff' ':!*.md'` → exit 0 · 1 hit, `.claude/settings.json:6` (agent plugin setting, not a model call)
- **CMD-20** `node -e` running `server/utils/paging.ts`'s `sameInstant` logic on the key `0000-01-01 00:00:00+00` → exit 0 · `-62167219200000 true` (JavaScript accepts year 0, so `decodeCursor` passes it to SQL)
