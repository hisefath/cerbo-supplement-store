---
artifact: security-checklist
milestone: M5.1
branch: milestone/m5.1-visual-refresh
base_sha: 220a971f8ea2847d9e680238a2dda0ae55df0f30
head_sha: e54eca8543601d4d099455453489a3070fbfceb9
checked: Sun Oct 11 08:20:48 CDT 2026 (re-run after M5.1-T005, Q4; first run 08:07:24 CDT at ae9c38e)
checker: check-security (Claude Code, claude-opus-5-5)
standard: OWASP ASVS 5.0 Level 1, chapter-level mapping
gate: G5
status: draft
---

# Security checklist: cerbo-supplement-store M5.1

## Summary

M5.1 is a restyle: one global theme stylesheet, two self-hosted font packages (D81), a site-root page that sends a signed-in person to a fixed role home, a demo-reset table list that now names the M5 history tables, and a harness scope-guard fix; M5.1-T005 then added a control-border colour token, a dimmed backdrop behind the dashboard cancel dialog, and a site root that sends a person whose session cannot be read to sign-in (fail closed). It adds no API route, no server code, no log call and no raw HTML; the fonts are bundled and served from the app's own origin under the unchanged `default-src 'self'` CSP, so NFR-016 holds (proven by M5.1_AT_003). No new finding: the only critical and high findings are the three Nuxt tooling advisories already accepted (D49 to D51) and absent from the built server, so the G5 security condition is met and nothing critical or high is reachable inside Cerbo's EHR.

- **G5 security condition:** met: secrets 0, unaccepted high/critical 0
- **Rows:** 11 pass · 3 fail · 0 n.a. (of 14)
- **Open findings:** 1 critical · 2 high · 1 medium · 3 low
- **Secret scan:** grep heuristic (unverified): 3 hits: 0 secret, 0 revoked, 3 false positive
- **Dependency audit:** `package-lock.json`: npm 11.19.1 `npm audit --package-lock-only` → 15 advisory entries (6 critical, 9 high), the same six root advisories as M5; 14 in the production tree (`--omit=dev`); the two new font packages carry none (CMD-16, CMD-17)
- **Accepted risks:** D51 SEC-1, D49 SEC-2, D50 SEC-3, D52 SEC-5, D76 SEC-10, D77 SEC-12, D78 SEC-13
- **Biggest gap:** N4: no verified (gitleaks) history scan has ever run; the grep heuristic is all the secret evidence there is, on a repo with a public mirror. `make check` is green at this head (CMD-6), closing Q4

## Scope and method

- **Milestone:** M5.1 `milestone/m5.1-visual-refresh`; diff `220a971`..`e54eca8`, 48 files changed (CMD-3); the code paths were read at `ebf9930`, `ae9c38e` adds only docs, specs, `.handoff/` and one acceptance test file (CMD-20), and the T005 commits `a6ebc86` and `e54eca8` change five `app/` files, `.handoff/TRACKER.md` and this checklist, all read in full (CMD-22)
- **Milestone kind:** code (CMD-4 lists 29 non-doc paths under `app/`, `db/`, `scripts/`, `tests/`, plus `Makefile`, `nuxt.config.ts`, `package.json`, `package-lock.json`)
- **Trust boundaries in play:** TB-1 internet to web app (a new site-root page behind the existing page guard; new static CSS and font files served from the app's own origin) (from `docs/architecture/hld.md` §5). TB-2 to TB-5 unchanged: no server, migration or outbound change (CMD-7)
- **Change plan security field:** no change plan (greenfield)
- **Inherited findings routed here:** no AUDIT.md
- **Tools on PATH:** gitleaks absent, osv-scanner absent, pnpm absent, npm 11.19.1, composer present (no composer.lock) (CMD-5)
- **Tests cited:** `make check` at e54eca8 → exit 0, 218 unit, 43 M4, 44 M5 and 5 M5.1 acceptance tests passed (CMD-6); the earlier red run at ae9c38e (M5.1_AT_001 only, CMD-21) is now green

## Checklist

Status: `pass`, `fail` or `n.a.`; no evidence is `fail`. Evidence: `path:line` or `CMD-<n>` plus its result.

| ID | Area | ASVS 5.0 | Status | Evidence | Finding |
|---|---|---|---|---|---|
| CK-01 | Authentication | V6 | pass | The new site root `/` is not in the page guard's public list (`app/middleware/auth.global.ts:6`), so a stranger gets 303 to sign-in before `app/pages/index.vue:4` runs, and if the session read fails anyway the page now goes to `/sign-in` (`app/pages/index.vue:4`, `.catch(() => null)`; :5), fail closed; proven by M5.1_AT_005 (stranger lands on sign-in) in CMD-6. No server, session or sign-in logic change (CMD-7); `app/pages/sign-in.vue:56` only moves the role-home table to `app/utils/role-home.ts:4` | — |
| CK-02 | Session management | V7 | pass | `server/` untouched (CMD-7); M4 and M5 cookie and timeout controls stand (`server/services/session.ts:196`, :23, :24), their tests green in CMD-6 | — |
| CK-03 | Access control and IDOR | V8 | pass | No API route or query change (CMD-7). The site root reads only the caller's own `/api/session` role (`app/pages/index.vue:4`) and redirects to a fixed path from `app/utils/role-home.ts:4`, else `/sign-in`, including when the session read fails (`app/pages/index.vue:5`, T005): no input-chosen target, so no open redirect. Every page still relies on its own API call's role check; M4 and M5 access tests green in CMD-6 | — |
| CK-04 | Input validation and injection | V1, V2 | fail | M5.1 adds no input handling (CMD-7, CMD-8). The demo reset's TRUNCATE interpolates only the constant `RESET_TABLES` list (`db/seed/demo.ts:38`, :72), no user value. Row stays fail on the accepted M5 findings | SEC-10, SEC-12 |
| CK-05 | Output encoding and XSS | V1, V3 | pass | No `v-html`, `innerHTML` or `dangerouslySetInnerHTML` in `app/` or `server/` (CMD-10, 0 hits); the restyle only wraps existing `{{ }}` text in new elements and adds a `:class` built from the server's order-status enum (`app/pages/practice/dashboard.vue:179`, CMD-8); T005 only wraps the cancel dialog in a styled backdrop element, same `{{ }}` text (`app/pages/practice/dashboard.vue:212`, CMD-22); CSP unchanged (`nuxt.config.ts:14`) | — |
| CK-06 | CSRF | V3 | fail | No write path added (CMD-7, CMD-8); the site root is a GET that reads the session and redirects, no state change (`app/pages/index.vue:4`, :5). Row stays fail on the accepted M5 findings | SEC-5, SEC-13 |
| CK-07 | Secrets and cryptography | V11, V13 | pass | Secret scan: 2 tree hits and 4 history commits, all false positive; no tracked env file (CMD-12, CMD-13, CMD-14). No secret, token or crypto code in the diff; the seed still takes the demo password only from the environment (`db/seed/demo.ts:63`) | — |
| CK-08 | Errors and logging (no PII or secrets) | V16 | pass | The diff adds no log call (CMD-8: no `console.` in added lines); generic client errors unchanged (`server/utils/problem.ts:86`) | — |
| CK-09 | Data protection | V14 | pass | Fonts are bundled from npm, not fetched from a font CDN, so no EHR page view reaches a third party (NFR-016): `app/assets/css/theme.css:4`, :5 import package CSS whose font URLs are relative `./files/` only (CMD-11, 0 absolute URLs); M5.1_AT_003 proves every style and font request on the prices page is same-origin (`tests/acceptance/M5.1/visual-language.test.ts:91`, CMD-6). No data model or response change (CMD-7); no-store rules unchanged (`nuxt.config.ts:43`) | — |
| CK-10 | TLS verified | V12 | pass | No outbound client, `http://` URL or verification switch added (CMD-15: one hit, an unchanged comment at `app/middleware/auth.global.ts:10`); HSTS unchanged (`nuxt.config.ts:25`) | — |
| CK-11 | Configuration and headers | V13, V3 | pass | `nuxt.config.ts` gains only the global stylesheet (`nuxt.config.ts:36`); CSP keeps `default-src 'self'` (fonts fall back to it) and `style-src 'self'` with no `unsafe-inline` (`nuxt.config.ts:15`, :17), `inlineStyles: false` kept (`nuxt.config.ts:38`), devtools off (`nuxt.config.ts:33`). The font packages are runtime `dependencies` holding only CSS and font files, no install scripts (CMD-18) | — |
| CK-12 | Dependencies | V15 | fail | `package-lock.json` committed. Added: @fontsource-variable/geist 5.3.0 and @fontsource/eb-garamond 5.3.0, OFL-1.1, pinned exact with integrity hashes, no dependencies of their own, no install scripts (CMD-9, CMD-18), decided in D81 (`docs/decisions/DECISION_JOURNAL.md:930`); no advisory on either. npm audit still reports the accepted Nuxt and kysely-codegen tooling advisories (CMD-16, exit 1; CMD-17) | SEC-1, SEC-2, SEC-3 |
| CK-13 | Business logic and money integrity | V2 | pass | No server, migration or money code change (CMD-7). The demo reset now also empties `price_changes` and `stock_movements` (`db/seed/demo.ts:40`): owner role only, refused without `DEMO_RESET=yes` (`db/seed/demo.ts:62`), human-run, and production setup runs with `--skip-seed` (`docs/runbooks/deploy.md:153`); the unit test ties the list to the migrations (`tests/unit/seed-demo.test.ts:88`, CMD-6). App-role insert-only grants unchanged, AT-044 green (CMD-6) | — |
| CK-15 | APIs and webhooks | V4 | pass | No API route, webhook or rate-limit change in M5.1 (CMD-7); M5 controls stand (`server/services/practice-dashboard.ts:99`), tests green in CMD-6 | — |

## LLM risks

n.a.: no model call in code (CMD-19 → only non-code hits: `.claude/settings.json:6`, an agent plugin setting, not a model call); no model container in docs/architecture/hld.md.

## Secret scan

- **Scanner:** grep heuristic (unverified)
- **Scope:** working tree + tracked env files + history commit list
- **Commands:** CMD-12 → 2 tree hits, both `docs/milestones/M5.md`; CMD-13 → exit 1, no tracked env file; CMD-14 → 4 commits: `691b4e1` (docs/milestones/M5.md, the same two lines), `cc64669`, `8949ae4`, `b045719` (public/.htaccess, triaged at M4)
- **History (heuristic only):** H1 (CMD-14)
- **Open secrets:** 0

Locations only. Never a value.

| Hit | Location | Rule or kind | Triage | Finding |
|---|---|---|---|---|
| H1 | history: `public/.htaccess:14 @cc64669` (removed at `8949ae4` and at `b045719`) | token=… pattern | false positive: an Apache rewrite rule copying the X-XSRF-Token request header into an environment variable; no credential value | — |
| H2 | `docs/milestones/M5.md:637` (added at `691b4e1`) | secret=… pattern | false positive: the M5 report's G5 count line (`secrets=` followed by a count and the next counter name); no credential value | — |
| H3 | `docs/milestones/M5.md:828` (added at `691b4e1`) | secret=… pattern | false positive: the same G5 count text in the M5 report's security summary; no credential value | — |

## Dependency audit

| Lockfile | Tool + version | Command | Exit | Result | Findings |
|---|---|---|---|---|---|
| `package-lock.json` | npm 11.19.1 | CMD-16, CMD-17 | 1 | 15 advisory entries: 6 critical, 9 high, 0 moderate, 0 low; production tree (`--omit=dev`): 6 critical, 8 high. Root advisories unchanged from M5: simple-git (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5), @simple-git/argv-parser (GHSA-v5rq-49vh-5v5c), node-forge (GHSA-86w9-cpqp-85rv), braces (GHSA-vfj7-8cjw-p6xm); none on the font packages | SEC-1, SEC-2, SEC-3 |

- **Packages added or upgraded in this milestone:** @fontsource-variable/geist 5.3.0: D81; @fontsource/eb-garamond 5.3.0: D81 (CMD-9)
- **Manifests without a committed lockfile:** none

## Threat and invariant trace

| HLD id | What the design says (mitigation or invariant, short) | Checked in | Result |
|---|---|---|---|
| TH-1 | server sessions; secure, HTTP-only, same-site cookie; 15-minute idle; sign-in rate limit | CK-01, CK-02 | pass (unchanged in M5.1; the new site root sits behind the page guard) |
| TH-2 | server ignores browser prices | CK-13 | pass (no server change) |
| TH-3 | rate limits on sign-in and pay; idempotent payment | CK-15 | pass (unchanged) |
| TH-4 | every API call checked against the person's orders or practice; unknown and forbidden look the same | CK-03 | pass (no API change) |
| TH-5 | operations read de-identified views | CK-09 | pass (no response change) |
| TH-6 | only the SRE changes roles, never their own | CK-03 | n.a.: no role-change endpoint yet (M6) |
| TH-7 | append-only histories of price, stock, role | CK-13 | pass for the app role (grants unchanged, AT-044); the human-run demo reset empties them by design (Q5) |
| TH-8 | app user cannot change append-only records; database checks the split | CK-13 | pass (unchanged) |
| TH-9 | database password only in the host's secret store; private network | CK-07 | pass in code (unchanged); host side not checked (N3) |
| TH-10 | verify a real provider's signature (later); stub in-process now | CK-15 | n.a.: stub gateway in-process, no inbound call |
| TH-11 | notices carry only practice name and sign-in link | CK-09 | pass (notice page restyled only) |
| TH-12 | deploys human-only; host account two-factor | CK-11 | n.a.: host account settings are outside the code (N3) |
| INV-1 | split adds up to the cent | CK-13 | pass (unchanged) |
| INV-2 | paid at most once | CK-13 | pass (unchanged) |
| INV-3 | whole cents only | CK-13 | pass (unchanged) |
| INV-4 | paid money records, ledger, price, stock and access histories never changed or deleted | CK-13 | pass for the app role; the demo reset (owner role, `DEMO_RESET=yes`) empties every table, as it did the ledger since M4 (Q5) |
| INV-5 | stock never below zero | CK-13 | pass (unchanged) |
| INV-6 | payout never below $0.00 | CK-13 | pass (unchanged) |
| INV-7 | people see only their own or their practice's orders; operations never see patient identity | CK-03 | pass (no API change) |
| INV-8 | checkout pays the prices fixed at checkout start | CK-13 | pass (unchanged) |
| INV-9 | report totals equal the ledger | CK-13 | n.a.: financial report is M6 |
| INV-10 | only the SRE changes roles, never their own | CK-03 | n.a.: role changes are M6 |

## Diff coverage

| Path | Rows touched | Note |
|---|---|---|
| `app/assets/` | CK-09, CK-11 | `theme.css`: custom properties and shared classes; imports the two self-hosted font packages (same origin); T005 adds one colour token |
| `app/pages/index.vue` | CK-01, CK-03, CK-06 | new site root: guarded page, reads the caller's role, redirects to a fixed role home; T005: a failed session read goes to sign-in |
| `app/utils/` | CK-03 | `role-home.ts`: the fixed role-to-path table, moved out of sign-in |
| `app/pages/` | CK-05 | restyle of existing pages (bands, cards, button classes, T005 input borders and dialog backdrop); sign-in uses the shared table; no new data shown, no raw HTML |
| `app/components/` | CK-05 | restyle of existing components (T005: ChangeForm input border token); no new data shown, no raw HTML |
| `nuxt.config.ts` | CK-11 | adds the global stylesheet; headers and CSP unchanged |
| `package.json` | CK-12 | two font packages (D81) |
| `package-lock.json` | CK-12 | the two font packages, pinned with integrity hashes |
| `db/` | CK-04, CK-13 | demo reset names every table, including the M5 histories; constant list |
| `tests/` | CK-01, CK-09, CK-13 | M5.1 acceptance (contrast, no colour outside the theme, same-origin assets, bands, site root) and the reset-list unit test |
| `scripts/` | none | `scope-guard.sh`: harness check now matches an exact Owns path literally before the glob; not shipped |
| `Makefile` | none | adds the M5.1 acceptance suite to `make check` |
| `MILESTONES.md` | none | milestone table |
| `docs/` | none | documentation, including the previous M5 checklist |
| `specs/` | none | specifications and bug notes |
| `.handoff/` | none | supervisor state and the milestone diff patch |

## Findings

| ID | Source | Severity | Finding | Evidence | Reachable | Recommend | Disposition | State |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | dependency | critical | simple-git up to 4.0.1 and @simple-git/argv-parser below 2.0.1 allow git command execution past the unsafe-operation guard (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c); pulled in by @nuxt/devtools | CMD-16 | no: devtools off (`nuxt.config.ts:33`) and absent from `.output/server` (Log 2026-10-10 15:47 CDT build check; not re-run at M5.1; the lockfile change adds two font packages with no dependencies of their own, CMD-9) | accept | accepted (D51) | open |
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
| N5 | Whether advisory code (simple-git, node-forge, braces) is in the built server | closed at M4 by the supervisor's build check (Log 2026-10-10 15:47 CDT); not re-run here. The M5.1 lockfile change adds only two font packages with no dependencies of their own (CMD-9), so the advisory packages' paths are unchanged | a later dependency change could pull one in; D49 to D51 name that trigger | re-check on any lockfile change that adds a dependency tree |
| N6 | Database connection TLS to the managed PostgreSQL | depends on the host's private network | traffic between app and database could be readable on the host network | ship-milestone |
| N7 | The in-EHR embed itself: launch-token verification and framing by Cerbo's origin | the app is not embedded yet: `frame-ancestors 'self'` blocks framing (`nuxt.config.ts:21`) and no launch handler exists (D55 names this as a pre-embed fix) | when embedded, the cookie moves to SameSite=None and the launch identity becomes a trust boundary this checklist has never seen | the milestone that embeds the app (CK-16 then applies) |
| N8 | The built bundle's font and stylesheet URLs in production (`.output/public/_nuxt/`) | check-security runs no build or serve; M5.1_AT_003 checks the running test app's requests instead (CMD-6) | a production-only asset setting (a `cdnURL` or `NUXT_APP_CDN_URL`) could move assets to another origin and break NFR-016; none is set (`nuxt.config.ts:9` holds `cdnURL:""`) | ship-milestone (G-live) |

## Questions

| ID | Question | Why it matters | Recommended answer | Blocks |
|---|---|---|---|---|
| Q1 | ⚠ Does `nuxt build` output (`.output/server`) contain simple-git, node-forge or braces? | decided whether SEC-1 to SEC-3 ship to production | answered 2026-10-10 15:47 CDT (tracker Log, VERIFY SEC-1): none of them is in `.output/server`; M5.1 adds no dependency tree | nothing |
| Q2 | ⚠ Every seeded demo person, including the SRE, shares one demo password; should M6 (role changes, EP-34 to EP-37) give the SRE account its own password? | today the SRE account can change nothing; in M6 it would let anyone with the demo password change roles | yes: one password per role-changing account before M6 ships, or keep the SRE account out of the public demo | nothing |
| Q3 | ⚠ D53's revisit trigger ("M5 adds stock limits (FR-025)") has happened; re-accept SEC-10? | an accepted risk whose trigger fired becomes a decision again | answered 2026-10-10 23:59 CDT (Approvals G5 SEC-10): re-accepted as D76 | nothing |
| Q4 | ⚠ The milestone branch moved during this run: `ae9c38e` (08:12:44 CDT, pass-1 dispositions, tighter M5.1 tests, control-border token in the LLD, task T005 queued) landed after the code was checked at `ebf9930`. This checklist now binds to `ae9c38e`; T005 will change `app/` (theme.css and control borders) again. Re-run check-security after T005? | `make check` is red at `ae9c38e` (M5.1_AT_001, CMD-21) and T005 moves `head_sha`, so this checklist goes stale at the next commit | answered 2026-10-11 08:20 CDT by this re-run at `e54eca8` (Approvals G5 security part 08:18 CDT asked for it): T005 adds no finding, `make check` green (CMD-6) | nothing |
| Q5 | ⚠ The demo reset empties the append-only price and stock histories (and, since M4, the ledger), which INV-4 otherwise forbids. Should it refuse to run once the database holds real, non-demo data? | today it is human-run with the owner role, needs `DEMO_RESET=yes`, and production setup skips it (`docs/runbooks/deploy.md:153`); with real patients it would erase money and stock records | no action while the deployment is a demo; before real patients, make the reset refuse on a production marker or remove it from the production image | nothing |

## Commands run

- **CMD-1** `date` → exit 0 · Sun Oct 11 08:20:48 CDT 2026 (re-run; first run 08:07:24 CDT)
- **CMD-2** `git branch --show-current`; `git status --porcelain -- . ':!docs/milestones' ':!.handoff' ':!docs/security/CHECKLIST.md'`; `git rev-parse milestone/m5.1-visual-refresh` → exit 0 · on the milestone branch, empty status, e54eca8543601d4d099455453489a3070fbfceb9 (first run: ebf9930)
- **CMD-3** `git merge-base main milestone/m5.1-visual-refresh`; `git diff --stat` and `--name-only 220a971 milestone/m5.1-visual-refresh` counted → exit 0 · 220a971f8ea2847d9e680238a2dda0ae55df0f30; 48 files at e54eca8
- **CMD-4** `git diff --name-only 220a971 milestone/m5.1-visual-refresh` filtered to non-doc paths, and the code diff read in full → exit 0 · 29 paths: Makefile, 21 under app/, db/seed/demo.ts, nuxt.config.ts, package.json, package-lock.json, scripts/scope-guard.sh, 2 under tests/
- **CMD-5** `command -v gitleaks osv-scanner npm pnpm composer; npm --version` → npm and composer present, gitleaks, osv-scanner and pnpm absent, npm 11.19.1
- **CMD-6** `make check` at e54eca8 → exit 0 · 218 unit passed (14 files), 43 M4 acceptance (5 files), 44 M5 acceptance (5 files), 5 M5.1 acceptance (1 file: AT_001 to AT_005), decision views current, make check: OK
- **CMD-7** `git diff --name-only 220a971 milestone/m5.1-visual-refresh -- server` → exit 0 · empty (no server change; no migration under db/migrations)
- **CMD-8** `git diff 220a971 milestone/m5.1-visual-refresh -- app server db nuxt.config.ts scripts Makefile` added lines matched against `v-html/innerHTML/https?:/fonts/googleapis/gstatic/cdn/<script/<link/useHead/console./$fetch/useFetch/useRequestFetch/navigateTo/eval/exec` → exit 0 · 4 lines: `app/pages/index.vue` script tag, session fetch and redirect, and the sign-in redirect using ROLE_HOME; no log call, no external URL
- **CMD-9** `git diff 220a971 milestone/m5.1-visual-refresh -- nuxt.config.ts package.json package-lock.json` → exit 0 · two dependencies added (@fontsource-variable/geist 5.3.0, @fontsource/eb-garamond 5.3.0, OFL-1.1, registry.npmjs.org tarballs with sha512 integrity, no dependencies listed); one `css:` line in nuxt.config.ts
- **CMD-10** `git grep -nE 'v-html/innerHTML/dangerouslySetInnerHTML' -- app server` → exit 1 · 0 hits (re-run at e54eca8: same result)
- **CMD-11** `grep -oE 'url\([^)]*\)'` and `grep -cE 'https?://'` on `app/assets/css/theme.css`, `node_modules/@fontsource-variable/geist/index.css`, `node_modules/@fontsource/eb-garamond/500.css` → exit 0 · theme.css has only the two package `@import`s; the package CSS has only `url(./files/…woff2/woff)`; 0 absolute URLs
- **CMD-12** `git grep -nIiE "$P" -- . ':!vendor' ':!node_modules' ':!*.lock' ':!package-lock.json' ':!*.min.js' / cut -d: -f1-2` → exit 0 · 2 hits: docs/milestones/M5.md:637, :828 (re-run at e54eca8: same result)
- **CMD-13** `git ls-files / grep -E '(^/\/)\.env' / grep -vE '\.(example/sample/dist/template)$'` → exit 1 · none (re-run at e54eca8: same result)
- **CMD-14** `git log --all -E -i -G"$P" --format='%h %ad' --date=short --name-only -- …` → exit 0 · 691b4e1 (docs/milestones/M5.md), b045719, 8949ae4, cc64669 (public/.htaccess) (re-run at e54eca8: same result)
- **CMD-15** `git grep -nIE 'https?://' -- app nuxt.config.ts` excluding `.invalid` → exit 0 · 1 hit, `app/middleware/auth.global.ts:10` (a comment naming rejected redirect forms; unchanged) (re-run at e54eca8: same result)
- **CMD-16** `npm audit --package-lock-only` (and `--json`) → exit 1 · 15 vulnerabilities (9 high, 6 critical); advisories GHSA-858h-whjf-mvg5, GHSA-86w9-cpqp-85rv, GHSA-g4wm-2vf7-vfgr, GHSA-v5rq-49vh-5v5c, GHSA-vfj7-8cjw-p6xm, GHSA-x6jw-m9v5-85vh; no @fontsource entry (re-run at e54eca8: same result)
- **CMD-17** `npm audit --package-lock-only --omit=dev` → exit 1 · 14 vulnerabilities (8 high, 6 critical) (re-run at e54eca8: same result)
- **CMD-18** `grep -E '"(scripts/install/postinstall/preinstall)"'` and `grep '"version"/"license"'` on both font packages' package.json, `ls` of each package → exit 0 · no scripts; 5.3.0 and OFL-1.1 each; contents are CSS, font files, metadata and licence
- **CMD-19** `git grep -nIiE 'openai/anthropic/…/llamaindex' -- . ':!vendor' ':!node_modules' ':!docs' ':!specs' ':!.handoff' ':!*.md'` → exit 0 · 1 hit, `.claude/settings.json:6` (agent plugin setting, not a model call) (re-run at e54eca8: same result)
- **CMD-20** `git status --porcelain`; `git log ebf9930..milestone/m5.1-visual-refresh`; `git diff --stat ebf9930 ae9c38e`; `git diff ebf9930 ae9c38e -- tests` read → exit 0 · one new commit ae9c38e696aab0e0f020ef53d21da97bc363329b: .handoff/TRACKER.md, .handoff/reviews/M5.1-pass1.md, MILESTONES.md, docs/architecture/lld.md, docs/design/screens.md, specs/M5.1-visual-refresh/acceptance.md, specs/M5.1-visual-refresh/tasks/T005.md, tests/acceptance/M5.1/visual-language.test.ts (more contrast pairs, hsl() and 4/8-digit hex in the colour scan, a stricter band regex); no app, server, db or manifest change
- **CMD-21** `make check` at ae9c38e → exit 2 · 218 unit, 43 M4, 44 M5 passed; M5.1 1 failed and 4 passed (M5.1_AT_001 failed; AT_002 to AT_005 passed)
- **CMD-22** `git log ae9c38e..milestone/m5.1-visual-refresh`; `git diff --stat ae9c38e e54eca8`; `git diff ae9c38e e54eca8 -- . ':!.handoff' ':!specs' ':!docs'` read in full; `git diff ae9c38e e54eca8 -- package.json package-lock.json nuxt.config.ts` → exit 0 · 2 commits (a6ebc86, e54eca8); app changes: theme.css +1 token, ChangeForm.vue and ops/orders/index.vue input border token, index.vue `.catch(() => null)` on the session read with fallback to /sign-in, dashboard.vue cancel dialog wrapped in a `.backdrop` div plus its CSS; 0 lines in manifests or nuxt.config.ts; no server, db, v-html or log change
