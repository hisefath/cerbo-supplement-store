---
artifact: security-checklist
milestone: M5
branch: milestone/m5-prices-and-stock
base_sha: 74cafcf4dd713e7bb007529d5c6f2cc1423be9d1
head_sha: 23f3451a68af971d836f1bc0d5ee6715317b7061
checked: Sun Oct 11 00:20:27 CDT 2026
checker: check-security (Claude Code, claude-opus-5-5)
standard: OWASP ASVS 5.0 Level 1, chapter-level mapping
gate: G5
status: draft
---

# Security checklist: cerbo-supplement-store M5

## Summary

M5 adds six authenticated endpoints (practice prices, practice dashboard and orders, operations stock list and adjustments), two append-only history tables, stock reservation inside payment, and a lazy hold-expiry and abandoned-payment reconcile. Every new route checks the role and scopes to the viewer's own practice, every new write is JSON-only and idempotency-keyed, and no package changed. This re-run covers the M5-T011 close-out (`Me.practice_name` read by a left join with the session's own user, checkout copy for sold-out and already-moved orders, the practice name in two page titles): it adds no route, no write and no finding. SEC-14 is fixed by AT-044 at ae240c2; SEC-10, SEC-12 and SEC-13 are accepted (D76 to D78). The only critical and high findings are the three Nuxt tooling advisories already accepted (D49 to D51) and absent from the built server, so the G5 security condition is met and no critical or high finding is reachable inside Cerbo's EHR.

- **G5 security condition:** met: secrets 0, unaccepted high/critical 0
- **Rows:** 11 pass · 3 fail · 0 n.a. (of 14)
- **Open findings:** 1 critical · 2 high · 1 medium · 3 low
- **Secret scan:** grep heuristic (unverified): 1 hit: 0 secret, 0 revoked, 1 false positive
- **Dependency audit:** `package-lock.json`: npm 11.19.1 `npm audit --package-lock-only` → 15 advisory entries (6 critical, 9 high), unchanged; 14 in the production tree (`--omit=dev`), all inside Nuxt and kysely-codegen tooling; no manifest change in M5 (CMD-9)
- **Accepted risks:** D51 SEC-1, D49 SEC-2, D50 SEC-3, D52 SEC-5, D76 SEC-10 (replaces D53, whose trigger fired), D77 SEC-12, D78 SEC-13
- **Biggest gap:** N4: no verified (gitleaks) history scan has ever run; the grep heuristic is all the secret evidence there is, on a repo with a public mirror

## Scope and method

- **Milestone:** M5 `milestone/m5-prices-and-stock`; diff `74cafcf`..`23f3451`, 74 files changed (CMD-3); re-run of the check at `5f1e972` (committed `adfd6fa`) for the M5-T011 code
- **Milestone kind:** code (CMD-4 lists non-doc paths under `server/`, `app/`, `db/`, `tests/`, plus `Makefile`)
- **Trust boundaries in play:** TB-1 internet to web app (six new API routes, four new pages); TB-2 between roles (provider-only price and dashboard routes, operations-only stock routes); TB-3 web app to database (two new tables, new grants on `practice_prices` and `products.units_in_stock`) (from `docs/architecture/hld.md` §5). TB-4 and TB-5 unchanged.
- **Change plan security field:** no change plan (greenfield)
- **Inherited findings routed here:** no AUDIT.md
- **Tools on PATH:** gitleaks absent, osv-scanner absent, pnpm absent, npm 11.19.1, composer present (no composer.lock at the head) (CMD-5)
- **Tests cited:** `make check` at 23f3451 → exit 0, 217 unit, 43 M4 and 44 M5 acceptance tests passed (CMD-6)

## Checklist

Status: `pass`, `fail` or `n.a.`; no evidence is `fail`. Evidence: `path:line` or `CMD-<n>` plus its result.

| ID | Area | ASVS 5.0 | Status | Evidence | Finding |
|---|---|---|---|---|---|
| CK-01 | Authentication | V6 | pass | All six new routes call `requireViewer` then `assertRole` (CMD-7), e.g. `server/api/practice/prices/[productId].put.ts:11`, `server/api/ops/stock/[productId]/adjustments.post.ts:11`; `assertRole` refuses a missing viewer (`server/services/access-policy.ts:17`). Session and sign-in code unchanged since M4 (CMD-4) | — |
| CK-02 | Session management | V7 | pass | M5-T011 changes only which columns `server/services/session.ts` reads: a left join to the user's own practice for `practice_name` (`server/services/session.ts:131`, :135), still keyed by the session's own `user_id` (`server/services/session.ts:180`, :181) (CMD-4). M4 controls stand: cookie HttpOnly, Secure, SameSite=Lax (`server/services/session.ts:196`), 15-minute idle and 12-hour absolute (`server/services/session.ts:23`, :24); their tests and the new Me test ran in CMD-6 | — |
| CK-03 | Access control and IDOR | V8 | pass | Price routes provider-only (`server/api/practice/prices/[productId].put.ts:12`) and scoped to the viewer's own practice, never a practice id from the request (`server/services/pricing.ts:90`, :168); dashboard and orders scoped the same way (`server/services/practice-dashboard.ts:110`, :127); stock routes operations-only (`server/api/ops/stock/[productId]/adjustments.post.ts:12`); `Me.practice_name` is the viewer's own practice only, null for platform staff (`server/services/session.ts:135`, AT-043); the hold-expiry write runs only after the ownership check (`server/services/orders.ts:279`, :310, :312). Proven by AT-018 (provider refused stock change), AT-026 and AT-037 (patient refused, other practice hidden), AT-043 (each viewer's own practice name) in CMD-6 | — |
| CK-04 | Input validation and injection | V1, V2 | fail | New bodies are Zod strict objects (`server/services/pricing.ts:14`, `server/services/stock-adjustments.ts:14`) behind JSON-only `parseBody` (`server/utils/problem.ts:51`); path ids allow-listed `^\d{1,18}$`; cursor and month parsed by regex; every new raw SQL template binds its values (CMD-8). But `price_cents` and stock `change` have no upper bound (`server/services/pricing.ts:15`, `server/services/stock-adjustments.ts:15`) and the history cursor accepts any `Date.parse` text (`server/services/pricing.ts:81`), so out-of-range input gives a 500, not a 422; order quantity still unbounded (D53) | SEC-10, SEC-12 |
| CK-05 | Output encoding and XSS | V1, V3 | pass | No `v-html`, `innerHTML` or `dangerouslySetInnerHTML` in `app/` or `server/` (CMD-10, 0 hits); free-text reasons, the T011 sold-out product names and the practice name in titles are rendered as text by Vue's escaping (`app/components/ProblemMessage.vue:50`, `app/pages/practice/prices.vue:120`); CSP unchanged (`nuxt.config.ts:14`) | — |
| CK-06 | CSRF | V3 | fail | Still no anti-CSRF token or Origin check (CMD-11), accepted in D52. New writes need `application/json` (`server/utils/problem.ts:51`) and an `Idempotency-Key` header (`server/services/idempotency.ts:43`), so a cross-site request needs a CORS preflight, and no CORS is configured (CMD-11). New: GET EP-21 now writes (hold expiry and FM-7 reconcile, `server/services/orders.ts:312`) | SEC-5, SEC-13 |
| CK-07 | Secrets and cryptography | V11, V13 | pass | Secret scan: 0 tree hits, 1 history hit triaged false positive, no tracked env file (CMD-12, CMD-13, CMD-14); no new secret, token or crypto code in the diff (CMD-4) | — |
| CK-08 | Errors and logging (no PII or secrets) | V16 | pass | The diff adds two log calls: `server/services/orders.ts:265` logs order id, attempt id and a fixed reason; `server/services/payments.ts` close-attempt logs the attempt id and `errorFacts` only (CMD-15). Generic client errors unchanged (`server/utils/problem.ts:86`) | — |
| CK-09 | Data protection | V14 | pass | Operations stock responses carry product names, counts, reasons, staff names and `Order <id>` only, no patient column (`server/services/stock-adjustments.ts:80`, :91, :92; `server/services/stock.ts:44`); the patient display name reaches only providers of that practice (`server/services/practice-dashboard.ts:198`, :204, FR-045); `/api/**` remains no-store (`nuxt.config.ts:40`) | — |
| CK-10 | TLS verified | V12 | pass | No outbound HTTP client, `http://` URL or verification switch in `server/` or `nuxt.config.ts` (CMD-16, 0 hits); HSTS unchanged (`nuxt.config.ts:25`) | — |
| CK-11 | Configuration and headers | V13, V3 | pass | `nuxt.config.ts` untouched by M5 (CMD-9); headers, devtools-off and no-CORS stand as at M4; the only build change is the M5 acceptance suite joining `make check` (`Makefile:12`) | — |
| CK-12 | Dependencies | V15 | fail | `package-lock.json` committed; npm audit 6 critical and 9 high (CMD-17, exit 1), 14 in the production tree (CMD-18), all Nuxt and kysely-codegen tooling, accepted in D49, D50, D51; no manifest or lockfile change in M5 (CMD-9) | SEC-1, SEC-2, SEC-3 |
| CK-13 | Business logic and money integrity | V2 | pass | Prices set only through a floor check (`server/services/pricing.ts:58`) under a row lock and stale check (`server/services/pricing.ts:170`); integer cents (`db/migrations/1760000012000_price-changes.sql:9`, :10); stock reserved in the payment transaction with products locked in id order (`server/services/stock.ts:32`) and never below zero (`db/migrations/1760000001000_core-orders.sql:45`, `db/migrations/1760000013000_stock-movements.sql:13`); release is idempotent (`server/services/stock.ts:62`); histories insert-only (`db/migrations/1760000012000_price-changes.sql:22`, `db/migrations/1760000013000_stock-movements.sql:26`). Proven by AT-003, AT-004, AT-008, AT-010, AT-015, AT-016, AT-019, AT-020, AT-035, AT-036, AT-038 (CMD-6). AT-044 proves the app user's UPDATE and DELETE on `stock_movements` are refused with 42501 (`tests/acceptance/M5/stock-dashboard.test.ts:337`, CMD-19, CMD-6) | — |
| CK-15 | APIs and webhooks | V4 | pass | Every new route authenticated and role-checked (CK-01); new writes are idempotency-keyed (`server/api/practice/prices/[productId].put.ts:16`, `server/api/ops/stock/[productId]/adjustments.post.ts:16`), proven by AT-010 and AT-020; list endpoints page at 25 and the orders list caps `limit` at 100 (`server/services/practice-dashboard.ts:99`). No inbound webhook exists (stub gateway) | — |

## LLM risks

n.a.: no model call in code (CMD-20 → only non-code hits: `.claude/settings.json:6`, an agent plugin setting, not a model call); no model container in docs/architecture/hld.md.

## Secret scan

- **Scanner:** grep heuristic (unverified)
- **Scope:** working tree + tracked env files + history commit list
- **Commands:** CMD-12 → exit 1, 0 tree hits; CMD-13 → exit 1, no tracked env file; CMD-14 → 3 commits (`cc64669` added, `8949ae4` and `b045719` removed) touching `public/.htaccess`, unchanged since the M4 run
- **History (heuristic only):** H1 (CMD-14)
- **Open secrets:** 0

Locations only. Never a value.

| Hit | Location | Rule or kind | Triage | Finding |
|---|---|---|---|---|
| H1 | history: `public/.htaccess:14 @cc64669` (removed at `8949ae4` and at `b045719`) | token=… pattern | false positive: an Apache rewrite rule copying the X-XSRF-Token request header into an environment variable; no credential value | — |

## Dependency audit

| Lockfile | Tool + version | Command | Exit | Result | Findings |
|---|---|---|---|---|---|
| `package-lock.json` | npm 11.19.1 | CMD-17, CMD-18 | 1 | 15 advisory entries: 6 critical, 9 high, 0 moderate, 0 low; production tree (`--omit=dev`): 6 critical, 8 high. Root advisories unchanged: simple-git (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5), @simple-git/argv-parser (GHSA-v5rq-49vh-5v5c), node-forge (GHSA-86w9-cpqp-85rv), braces (GHSA-vfj7-8cjw-p6xm) | SEC-1, SEC-2, SEC-3 |

- **Packages added or upgraded in this milestone:** none (CMD-9)
- **Manifests without a committed lockfile:** none

## Threat and invariant trace

| HLD id | What the design says (mitigation or invariant, short) | Checked in | Result |
|---|---|---|---|
| TH-1 | server sessions; secure, HTTP-only, same-site cookie; 15-minute idle; sign-in rate limit | CK-01, CK-02 | pass (unchanged in M5) |
| TH-2 | server ignores browser prices | CK-13 | pass: payment and checkout still read server prices; the new price route takes a price only from a provider, floor-checked |
| TH-3 | rate limits on sign-in and pay; idempotent payment | CK-15 | pass (unchanged; pay now also reserves stock inside the same guard) |
| TH-4 | every API call checked against the person's orders or practice; unknown and forbidden look the same | CK-03 | pass |
| TH-5 | operations read de-identified views | CK-09 | pass: stock list and history hold no patient column |
| TH-6 | only the SRE changes roles, never their own | CK-03 | n.a.: no role-change endpoint in M5 (M6) |
| TH-7 | append-only histories of price, stock, role | CK-13 | pass for price and stock (insert-only grants, AT-044 for stock history); role history is M6 |
| TH-8 | app user cannot change append-only records; database checks the split | CK-13 | pass |
| TH-9 | database password only in the host's secret store; private network | CK-07 | pass in code (unchanged); host side not checked (N3) |
| TH-10 | verify a real provider's signature (later); stub in-process now | CK-15 | n.a.: stub gateway in-process, no inbound call |
| TH-11 | notices carry only practice name and sign-in link | CK-09 | pass (messaging unchanged in M5) |
| TH-12 | deploys human-only; host account two-factor | CK-11 | n.a.: host account settings are outside the code (N3) |
| INV-1 | split adds up to the cent | CK-13 | pass (unchanged) |
| INV-2 | paid at most once | CK-13 | pass (unchanged) |
| INV-3 | whole cents only | CK-13 | pass: new price columns are integer cents |
| INV-4 | paid money records, ledger, price, stock and access histories never changed or deleted | CK-13 | pass: SEC-14 fixed by AT-044 |
| INV-5 | stock never below zero | CK-13 | pass |
| INV-6 | payout never below $0.00 | CK-13 | pass: price change floor-checked (AT-003, AT-012) |
| INV-7 | people see only their own or their practice's orders; operations never see patient identity | CK-03 | pass |
| INV-8 | checkout pays the prices fixed at checkout start | CK-13 | pass: pay refuses an ended hold (`server/services/payments.ts` checkout-expired), AT-035, AT-039 |
| INV-9 | report totals equal the ledger | CK-13 | n.a.: financial report is M6 |
| INV-10 | only the SRE changes roles, never their own | CK-03 | n.a.: role changes are M6 |

## Diff coverage

| Path | Rows touched | Note |
|---|---|---|
| `server/` | CK-01, CK-02, CK-03, CK-04, CK-06, CK-08, CK-09, CK-13, CK-15 | six new routes; pricing, stock, stock-adjustments, practice-dashboard services; pay reserves and releases stock; lazy hold expiry and FM-7 reconcile; T011 session reads the viewer's practice name |
| `app/` | CK-05, CK-06 | price, stock and dashboard pages and dialogs; T011 checkout copy and practice-name titles; no raw HTML |
| `db/` | CK-13 | `price_changes` and `stock_movements` (insert-only), update grants on `practice_prices` and `products.units_in_stock` |
| `tests/` | CK-02, CK-03, CK-13 | M5 acceptance and unit tests, including AT-043, AT-044 and the Me.practice_name unit test |
| `Makefile` | none | adds the M5 acceptance suite to `make check` |
| `MILESTONES.md` | none | milestone table |
| `docs/` | none | documentation, including the previous M4 checklist |
| `specs/` | none | specifications only |
| `.handoff/` | none | supervisor state |

## Findings

| ID | Source | Severity | Finding | Evidence | Reachable | Recommend | Disposition | State |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | dependency | critical | simple-git up to 4.0.1 and @simple-git/argv-parser below 2.0.1 allow git command execution past the unsafe-operation guard (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c); pulled in by @nuxt/devtools | CMD-17 | no: devtools off (`nuxt.config.ts:33`) and absent from `.output/server` (Log 2026-10-10 15:47 CDT build check; lockfile unchanged since, CMD-9) | accept | accepted (D51) | open |
| SEC-2 | dependency | high | node-forge accepts forged RSA PKCS#1 v1.5 signatures (GHSA-86w9-cpqp-85rv); pulled in by listhen (the Nuxt dev server) through nitropack and @nuxt/cli | CMD-17 | no: dev server only, absent from `.output/server` (same build check) | accept | accepted (D49) | open |
| SEC-3 | dependency | high | braces allows stack-exhaustion denial of service on crafted glob patterns (GHSA-vfj7-8cjw-p6xm); pulled in by micromatch, fast-glob and globby under nuxt build tooling and kysely-codegen | CMD-17 | no: build-time only, absent from `.output/server` (same build check) | accept | accepted (D50) | open |
| SEC-4 | CK-05, CK-10, CK-11 | medium | The app sends no security headers: no Content-Security-Policy with frame-ancestors, no X-Content-Type-Options, no Referrer-Policy, no HSTS | `nuxt.config.ts:13` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-11, CMD-6) |
| SEC-5 | CK-06 | medium | No anti-CSRF token or Origin check; protection rests on SameSite=Lax and JSON-only bodies, which weakens if the app is embedded in the EHR iframe with SameSite=None | `server/services/session.ts:196` | no: SameSite=Lax today; even embedded, every write needs JSON plus a custom Idempotency-Key header, which forces a CORS preflight that no CORS config allows | accept | accepted (D52) | open |
| SEC-6 | CK-02 | medium | No absolute session lifetime: a session kept active never expires | `server/services/session.ts:157` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-7 | CK-08 | medium | Unexpected errors are logged as whole error objects; a PostgreSQL constraint error includes the failing row with order amounts, against NFR-010 | `server/utils/problem.ts:85` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-15, CMD-6) |
| SEC-8 | CK-09 | medium | Order, session and operations responses carry no Cache-Control: no-store, so a shared clinic browser or proxy may keep order details | `nuxt.config.ts:40` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-11, CMD-6) |
| SEC-9 | CK-15 | medium | The pay endpoint has no per-person or per-address rate limit, which TH-3 names; idempotency stops double charges but not floods | `server/services/payments.ts:58` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-10 | CK-04 | low | Order line quantity has no upper bound in validation; since FR-025 the send refuses more than is in stock (`server/services/orders.ts:60`, AT-014), so only a stock count large enough to overflow the integer total still reaches the 500 | `server/api/orders/index.post.ts:13` | yes: only with an extreme stock count | accept | accepted (D76) | open |
| SEC-11 | CK-09 | low | sign_in_attempts keeps typed emails (including mistyped ones of other people) and client addresses with no retention rule; rows are pruned only when someone signs in | `server/tasks/prune-attempts.ts:14` | yes | fix | fix (M4-T011) | fixed @705bb3b (CMD-6) |
| SEC-12 | CK-04 | low | Out-of-range input on the new routes returns a 500 instead of a 422: a price_cents or a stock change past the 32-bit integer column range, or a history cursor whose date JavaScript parses but PostgreSQL rejects | `server/services/pricing.ts:15` | yes: signed-in provider or operations staff only; no data exposed, error facts logged without values | accept | accepted (D77) | open |
| SEC-13 | CK-06 | low | GET EP-21 now writes: viewing an in_checkout order ends a due hold or closes an abandoned payment; a cross-site top-level GET can trigger it, but only a transition that is already due, for an order the viewer may see | `server/services/orders.ts:312` | yes: no attacker benefit, the write is time-driven and idempotent | accept | accepted (D78) | open |
| SEC-14 | CK-13 | low | No test proves stock_movements refuses UPDATE and DELETE, which INV-4 names; the grant enforces it (insert-only) but a later migration could widen it unnoticed | `db/migrations/1760000013000_stock-movements.sql:26` | no: the grant is in place today | fix | fix (AT-044, Approvals 2026-10-10 23:59 CDT) | fixed @ae240c2 (CMD-19) |

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
| N5 | Whether advisory code (simple-git, node-forge, braces) is in the built server | closed at M4 by the supervisor's build check (Log 2026-10-10 15:47 CDT); not re-run here, lockfile unchanged in M5 (CMD-9) | a later dependency change could pull one in; D49 to D51 name that trigger | re-check on any lockfile change |
| N6 | Database connection TLS to the managed PostgreSQL | depends on the host's private network | traffic between app and database could be readable on the host network | ship-milestone |
| N7 | The in-EHR embed itself: launch-token verification and framing by Cerbo's origin | the app is not embedded yet: `frame-ancestors 'self'` blocks framing (`nuxt.config.ts:14`) and no launch handler exists (D55 names this as a pre-embed fix) | when embedded, the cookie moves to SameSite=None and the launch identity becomes a trust boundary this checklist has never seen | the milestone that embeds the app (CK-16 then applies) |

## Questions

| ID | Question | Why it matters | Recommended answer | Blocks |
|---|---|---|---|---|
| Q1 | ⚠ Does `nuxt build` output (`.output/server`) contain simple-git, node-forge or braces? | decided whether SEC-1 to SEC-3 ship to production | answered 2026-10-10 15:47 CDT (tracker Log, VERIFY SEC-1): none of them is in `.output/server`; lockfile unchanged in M5 | nothing |
| Q2 | ⚠ Every seeded demo person, including the SRE, shares one demo password; should M6 (role changes, EP-34 to EP-37) give the SRE account its own password? | today the SRE account can change nothing; in M6 it would let anyone with the demo password change roles | yes: one password per role-changing account before M6 ships, or keep the SRE account out of the public demo | nothing |
| Q3 | ⚠ D53's revisit trigger ("M5 adds stock limits (FR-025)") has happened; re-accept SEC-10? | an accepted risk whose trigger fired becomes a decision again | answered 2026-10-10 23:59 CDT (Approvals G5 SEC-10): re-accepted as D76 | nothing |

## Commands run

- **CMD-1** `date` → exit 0 · Sun Oct 11 00:20:27 CDT 2026
- **CMD-2** `git rev-parse milestone/m5-prices-and-stock`; `git branch --show-current`; `git status --porcelain -- . ':!docs/milestones' ':!.handoff' ':!docs/security/CHECKLIST.md'` → exit 0 · 23f3451a68af971d836f1bc0d5ee6715317b7061, on the milestone branch, empty status
- **CMD-3** `git merge-base main milestone/m5-prices-and-stock`; `git diff --name-only 74cafcf milestone/m5-prices-and-stock` counted → exit 0 · 74cafcf4dd713e7bb007529d5c6f2cc1423be9d1; 74
- **CMD-4** `git diff --name-only 74cafcf milestone/m5-prices-and-stock` filtered to non-doc paths, and `git diff 74cafcf milestone/m5-prices-and-stock -- server db Makefile` read in full, plus `git diff 5f1e972 milestone/m5-prices-and-stock -- server app tests` (the M5-T011 delta) → exit 0 · Makefile, 8 under app/, 2 migrations, 14 under server/ (the 14th is `server/services/session.ts`: a practice-name left join only; no cookie, crypto or secret change), 11 under tests/
- **CMD-5** `command -v gitleaks osv-scanner npm pnpm composer; npm --version` → npm and composer present, gitleaks, osv-scanner and pnpm absent, npm 11.19.1
- **CMD-6** `make check` → exit 0 · 217 unit passed (14 files), 43 M4 acceptance passed (5 files), 44 M5 acceptance passed (5 files, includes AT-043 and AT-044), make check: OK
- **CMD-7** for each changed file under `server/api`, `grep -cE 'requireViewer/assertRole'` → exit 0 · all six new routes 4 matches each (import and call of both)
- **CMD-8** `git diff 74cafcf milestone/m5-prices-and-stock -- server` read for `sql` templates → exit 0 · every interpolation is a bound value (`${after.at}::timestamptz`, `${after.id}::bigint`, `${c.sentAt}`, `${c.id}`) or a constant expression; no exec, eval or deserialisation added
- **CMD-9** `git diff --stat 74cafcf milestone/m5-prices-and-stock -- package.json package-lock.json nuxt.config.ts` → exit 0 · empty (no change)
- **CMD-10** `git grep -nE 'v-html/innerHTML/dangerouslySetInnerHTML' -- app server` → exit 1 · 0 hits
- **CMD-11** `git grep -nE 'cors/origin' -- server nuxt.config.ts` → exit 0 · only `nuxt.config.ts:12` (a comment) and :24 (Referrer-Policy); no CORS, no CSRF token, no Origin check
- **CMD-12** `git grep -nIiE "$P" -- . ':!vendor' ':!node_modules' ':!*.lock' ':!package-lock.json' ':!*.min.js' / cut -d: -f1-2` → exit 1 · 0 hits
- **CMD-13** `git ls-files / grep -E '(^/\/)\.env' / grep -vE '\.(example/sample/dist/template)$'` → exit 1 · none
- **CMD-14** `git log --all -E -i -G"$P" --format='%h %ad' --date=short --name-only -- …` → exit 0 · b045719, 8949ae4, cc64669, all public/.htaccess (false positive, triaged at M4)
- **CMD-15** `git diff 74cafcf milestone/m5-prices-and-stock -- server app / grep -E '^\+.*console\.(error/log/warn)'` → exit 0 · 2 lines: the FM-7 reconcile warning (ids and a fixed reason) and close-attempt (`errorFacts`); the M5-T011 delta adds none
- **CMD-16** `git grep -nE 'rejectUnauthorized/NODE_TLS/http:\/\//fetch(/$fetch(' -- server nuxt.config.ts` → exit 1 · 0 hits
- **CMD-17** `npm audit --package-lock-only` (and `--json`) → exit 1 · 15 vulnerabilities (9 high, 6 critical); advisories GHSA-858h-whjf-mvg5, GHSA-86w9-cpqp-85rv, GHSA-g4wm-2vf7-vfgr, GHSA-v5rq-49vh-5v5c, GHSA-vfj7-8cjw-p6xm, GHSA-x6jw-m9v5-85vh
- **CMD-18** `npm audit --package-lock-only --omit=dev` → exit 1 · 14 vulnerabilities (8 high, 6 critical)
- **CMD-19** `grep -n 'stock_movements' tests/acceptance/M5/*.ts / grep -iE '42501/update/delete'`; `grep -rn '42501' tests` → exit 0 · 42501 checks at `tests/acceptance/M5/stock-dashboard.test.ts:337` (stock history, AT-044, added at ae240c2), `tests/acceptance/M5/prices.test.ts:97` (price history) and `tests/acceptance/M4/audit-order.test.ts:135` to :141
- **CMD-20** `git grep -nIiE 'openai/anthropic/…/llamaindex' -- . ':!vendor' ':!node_modules' ':!docs' ':!specs' ':!.handoff' ':!*.md'` → exit 0 · 1 hit, `.claude/settings.json:6` (agent plugin setting, not a model call)
