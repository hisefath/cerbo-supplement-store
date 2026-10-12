# Deploy runbook — cerbo-supplement-store

| Field | Value |
|---|---|
| Platform | Railway, CLI 5.57.7 (`railway --version`, read 2026-10-10 16:18 CDT) |
| Services | v2 demo: a new web service `web-v2` and a new managed PostgreSQL `postgres-v2` in project `cerbo-supplement-store` (to be created, FS-2). The project's existing `app` service and `Postgres` database run the v1 Laravel build and stay untouched (D22) |
| Environments | production (Railway environment `production`): v2 demo at https://web-v2-production-6640.up.railway.app · v1 at https://supplement-store-slice.up.railway.app (not this release) |
| Method | clean `git archive` upload of the release SHA with `railway up --path-as-root` |
| Current release | M7.1 @ 9178201 — see §8 |
| Last updated | 2026-10-10 16:52 CDT |
| Written by | ship-milestone (Claude Code, claude-opus-5-5) |
| Approvals | deploy and rollback yes-es live in `.handoff/TRACKER.md ## Approvals` (never in this file) |

## Inputs read

| Path | Version (sha or date) | Used for |
|---|---|---|
| `AGENTS.md` | e5f9fae | platform, stack, Deploy row (human-only), Node 22.22+ |
| `MILESTONES.md` | 0929805 | M4 row: in-progress, no merge SHA (D55 demo deploy from the branch) |
| `docs/decisions/DECISION_JOURNAL.md` D48, D55 | 13a816a | demo from `milestone/m4-tracer-bullet` before the M1 to M4 merge chain |
| `docs/architecture/hld.md` §11 | fea2e18 | production on Railway: one app service and one managed PostgreSQL, secrets from Railway environment variables, health page with version |
| `specs/M4-tracer-bullet/acceptance.md ## Demo smoke` | 695b94b | smoke checks SM-3 to SM-5 and the Not-in-the-smoke list |
| `docs/security/CHECKLIST.md`, `.handoff/reviews/M4-pass7.md` R1, R8 | 13a816a | CSP hash smoke check (SM-6), runtime variables that must not be set (§7) |
| `package.json`, `nuxt.config.ts`, `db/migrations/` | 13a816a | build (`nuxi build`), start (`node .output/server/index.mjs`), migrations |
| `railway --help`, `railway up --help`, `railway run --help`, `railway service --help`, `railway deployment --help`, `railway domain --help`, `railway status`, `railway whoami`, `railway deployment list --service app` | CLI 5.57.7, 2026-10-10 16:18 CDT | every Railway command below |

**Not read:** `.env` — never opened; `docs/milestones/M4.md` rollback line — superseded by D55 (no merge commit yet).

## 1. What gets deployed and how

- **Release:** M4 demo at milestone-branch SHA `11308222f1ea5f74dbe4f2595cce23205b14988b` (`milestone/m4-tracer-bullet`). It is **not merged to main**: D55 (Approvals "a, deploy the demo from the branch") chose a demo from the reviewed branch before the M1 to M4 merge chain (D48). PRE-1 and PRE-2 are replaced by PRE-1b for this demo; the real release redeploys from main after G5.
- **Live before this release:** nothing for v2 (first deploy of `web-v2`). The v1 `app` service is live (deployment c1fd5077…, 2026-10-05) and is not touched.
- **How the SHA reaches the platform:** DEP-1 exports the SHA with `git archive` into a clean folder; DEP-2 writes `build-info.json`; DEP-3 uploads that folder with `railway up --path-as-root`.
- **Why this method:** it ships exactly one committed SHA, never uncommitted or git-ignored files, and deploying stays its own human yes.
- **Build and start:** Railway's Railpack builder installs with `npm ci` (its `postinstall` runs `nuxt prepare`), builds with `npm run build` and starts `node .output/server/index.mjs`; build command, start command and the deploy health check `/healthz` (120 s) are set on the web-v2 service (agent, standing yes, `railway api serviceInstanceUpdate`). Node comes from `package.json` engines `>=22.22.0` (⚠ confirm the version in the first build log, Q-2).
- **How the app knows its version:** DEP-2 writes `build-info.json` {"commit","built_at"} into the upload root; `GET /version` (`server/routes/version.get.ts`, M4-T902) reads it from the server's working directory.
- **Migrations in this release:** every migration is new: `db/migrations/1760000001000_core-orders.sql`, `1760000002000_payments-ledger.sql`, `1760000003000_idempotency-keys.sql`, `1760000006000_sign-in-attempts.sql`, `1760000011000_pay-attempt-limits.sql`. They run as the database owner role and grant to the app role (acceptance Q-3, Q-4), so FS-4 creates both roles first.

## 2. Preflight (read-only, before every deploy)

| Id | Command | Expect | If not |
|---|---|---|---|
| PRE-1 | `git fetch origin main && git merge-base --is-ancestor "$SHA" origin/main && echo on-main` | `on-main` | Stop: the SHA is not merged. **This demo (D55):** expected to fail; use PRE-1b. |
| PRE-1b | `git merge-base --is-ancestor "$SHA" milestone/m4-tracer-bullet && git diff --quiet "$SHA" milestone/m4-tracer-bullet -- . ':!docs' ':!.handoff' && echo deployable` | `deployable`: the SHA is on the branch and only docs or tracker changed after it | Stop: deploy only the reviewed code named in the deploy ask. |
| PRE-2 | `grep -E '^\| M4 ' MILESTONES.md` | after the merge chain: a merge SHA and a main-check SHA | **This demo:** shows `in-progress`, expected under D55. |
| PRE-3 | `railway --version` | `railway 5.57.7` | Re-read `--help` for every command below before using a different version. |
| PRE-4 | `railway whoami` | logged in as the owner's account | The human logs in; never let a deploy command start a login or sign-up. |
| PRE-5 | `railway status` | project `cerbo-supplement-store`, environment `production`, service `web-v2` linked | Stop: a deploy command run on the wrong link would replace the v1 `app` service. **First deploy:** do FS-1 to FS-6 first. |
| PRE-6 | `railway deployment list --service web-v2 --environment production` | the live `web-v2` deployment (rollback target) | **First deploy:** an empty list is expected; rollback target = none. |
| PRE-7 | `bash scripts/smoke.sh "$URL" "$SHA"` (baseline) | SM-1 fails with the old SHA; every other check passes | **First deploy:** skip (nothing answers yet). |
| PRE-8 | `git diff --name-only "$LIVE_SHA" "$SHA" -- db/migrations` | the list in §1 | **First deploy:** every migration is new (§1). |

### First-time setup (human-only, once, before the first deploy)

| Id | Setup action | Command or dashboard path | Source | Done when |
|---|---|---|---|---|
| FS-1 | Project | n/a: `cerbo-supplement-store` already exists and this directory is linked to it | `railway status` (CLI 5.57.7) | PRE-5 names the project |
| FS-2 | Add the v2 web service and a separate v2 database (keep v1's `app` and `Postgres` untouched: v1 tables share names like users and orders) | `railway add --service web-v2`; `railway add --database postgres`, then rename the new database service to `postgres-v2` in the dashboard | `railway --help` (CLI 5.57.7); ⚠ read `railway add --help` before running | done 2026-10-10: `web-v2` (agent, standing yes) and `postgres-v2` (agent, after the v1 rename mix-up; PostgreSQL 18, D56) |
| FS-3 | Link this repo directory to the v2 service | `railway service link web-v2` | `railway service --help` (CLI 5.57.7) | done: this directory is linked to `web-v2` |
| FS-4 | Create the two database roles in `postgres-v2` with passwords you choose: `supplements_owner` (owns the schema, runs migrations) and `supplements_app` (the app's login, granted rights only by the migrations) | `railway connect postgres-v2`, then in psql: create both roles with LOGIN and a password, and make `supplements_owner` the owner of the database's `public` schema | `railway --help` (connect, CLI 5.57.7); acceptance Q-3 | done: both roles exist and log in; `supplements_owner` owns `public` (names-only check) |
| FS-5 | Generate the public HTTPS domain for `web-v2` | `railway domain --service web-v2` | `railway domain --help` (CLI 5.57.7) | done: https://web-v2-production-6640.up.railway.app (agent, standing yes) |
| FS-6 | Set every §6 variable by name on `web-v2` (values typed by you) | dashboard → web-v2 → Variables | Railway dashboard | done: `TRUST_PROXY=1` (agent); `DATABASE_URL` by `scripts/railway-setup.sh` (human run) |
| FS-7 | Run the migrations once against `postgres-v2` as `supplements_owner` | `bash scripts/railway-setup.sh` (human run; passwords in git-ignored `.env.railway`) | AGENTS.md acceptance Q-4; `node-pg-migrate` 9.0.0 | done by `scripts/railway-setup.sh` (human run): 5 migrations recorded, 14 tables |
| FS-8 | Load the demo data (fictional practices, people, products) | `bash scripts/railway-setup.sh` (human run; `node db/seed/demo.ts`, M4-T903) | `db/seed/demo.ts` | done by `scripts/railway-setup.sh` (human run): 2 practices, 9 users, 3 products; re-run the script to reset the demo |

## 3. Deploy commands (human-only — run only after a recorded yes)

```bash
SHA=11308222f1ea5f74dbe4f2595cce23205b14988b            # milestone/m4-tracer-bullet tip named in the deploy ask (D55)
ENV=production
SVC=web-v2
URL=https://web-v2-production-6640.up.railway.app
LIVE_SHA=none       # first deploy of web-v2
EXPORT="$(mktemp -d)/release-$SHA" && mkdir -p "$EXPORT"                                   # DEP-1
git archive "$SHA" | tar -x -C "$EXPORT"                                                     # DEP-1
printf '{"commit":"%s","built_at":"%s"}\n' "$SHA" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$EXPORT/build-info.json"   # DEP-2
railway up "$EXPORT" --path-as-root --service "$SVC" --environment "$ENV" --detach --message "deploy $SHA"     # DEP-3
```

| Id | Command (short) | What it does | Expected output | Source |
|---|---|---|---|---|
| DEP-1 | `git archive "$SHA" \| tar -x -C "$EXPORT"` | exports exactly the committed files of the SHA into a clean folder | no output | git |
| DEP-2 | `printf … > "$EXPORT/build-info.json"` | writes the release identity the `/version` route reports (GAP-2) | no output | ship-milestone reference |
| DEP-3 | `railway up "$EXPORT" --path-as-root --service web-v2 --environment production --detach --message "deploy $SHA"` | uploads the folder and starts a build of it on `web-v2` only | a build logs URL | `railway up --help` (CLI 5.57.7: --path-as-root, -s, -e, -d, -m) · ⚠ unverified until it has run once |

Never add `-y`, `--yes` or `--new` to `railway up`, and never deploy without `--service web-v2`: the linked default could be the v1 `app` service.

## 4. Verify

- **Wait:** `railway deployment list --service web-v2 --environment production` until the new deployment reports SUCCESS; at most 10 minutes. FAILED or CRASHED → §5.
- **Version:** `curl -q --fail --silent --show-error --proto '=https' "$URL/version"` → `"commit"` equals `$SHA`.
- **Smoke:** `bash scripts/smoke.sh "$URL" "$SHA"` → last line starts `SMOKE GREEN`. Paste the full output into §8.

| Id | Request | Expect | Proves | Covers |
|---|---|---|---|---|
| SM-1 | `GET /version` | 200, `commit` = `$SHA`, `built_at` present | the reviewed code is what runs | release identity |
| SM-2 | `GET /healthz` | 200, body contains `ok` | the process is up and reaches its database (GAP-1) | SLO-1 |
| SM-3 | `GET /sign-in` | 200, contains `Sign in` | the sign-in page renders | demo 1 · AT-032, AT-035 |
| SM-4 | `GET /orders/1001` | 303 (to `/sign-in?next=…`) | a page needing sign-in sends a stranger to sign in | demo 8 · AE-038, AT-033 |
| SM-5 | `GET /api/session` | 401 | the API refuses a stranger | demo 8 · AT-033 |
| SM-6 | `GET /sign-in` (headers and body) | every inline script's SHA-256 is listed in the CSP `script-src` | the browser will run the page's JavaScript, so Pay works (review pass 7 R1) | demo 5, 6 · SEC-4 |
| SM-7 | `GET /sign-in` (headers) | `Strict-Transport-Security` and `X-Content-Type-Options: nosniff` present | the security headers reach the browser | SEC-4 |

**Not in the smoke** (the smoke never logs in or changes data):

| Demo step | Why not in the smoke | Covered by |
|---|---|---|
| 1 — sign in as Dr. Chen | needs a password | AT-032, AT-035 (green in `make check`) and the demo |
| 2, 3 — open the catalog and send an order | needs sign-in; writes an order | AT-001, AT-015 |
| 4 — open the notice | needs a notice token from a sent order | AT-017, AT-036 |
| 5, 6 — patient signs in and pays twice | needs sign-in; writes a payment | AT-004, AT-005, AT-006 |
| 7 — reviewer breakdown | needs sign-in | AT-014, AT-023 |
| 9 — SRE refused | needs sign-in | AT-025 |

## 5. Rollback (human-only — run only after a recorded yes)

| Id | Path | Command | Executor | Time to restore | Safe when |
|---|---|---|---|---|---|
| RB-1 | Fastest: put the previous build back | n/a: nothing was live before on `web-v2` | — | — | — |
| RB-2 | Rebuild the previous good SHA | n/a: nothing was live before on `web-v2` | — | — | — |
| RB-3 | Durable: take the demo down | dashboard → web-v2 → Deployments → the deployment → Remove | human (UI) | ~1 min | always (v1 `app` and its database are separate and untouched) |

- **Roll back when:** any SM-n red after deploy.
- **Data and migrations:** the five migrations create new tables in the new `postgres-v2` only; removing the deployment leaves them, and a later deploy reuses them. v1's database is never touched.
- **After a rollback:** confirm nothing answers at `$URL` and record it in §8.

## 6. Configuration and secrets (names only)

| Name | Needed by | Set where | Rotated how | Source of truth |
|---|---|---|---|---|
| `DATABASE_URL` | app: connects as `supplements_app` to `postgres-v2` | Railway variables, web-v2, production (your connection string for the `supplements_app` role) | change the role password in psql, then update the variable | `server/utils/db.ts:10`, `.env.example:2` |
| `TRUST_PROXY` | sign-in and pay rate limits: read the client address from Railway's proxy header | Railway variables, web-v2: value `1` | n/a (not a secret) | `server/services/session.ts:82`; M4 review pass 5 R2 |
| `SCRYPT_COST` | password hashing cost for unknown-email timing parity; leave unset for 16384 or set the cost the demo passwords were hashed with | Railway variables, web-v2 | n/a | `server/services/session.ts` (dummyHash) |
| `PAYMENT_STUB_MODE` | test payment stand-in; leave unset or `succeed` for the demo | Railway variables, web-v2 | n/a | lld.md §9 SEAM-3 |
| `NODE_VERSION` or engines | Node 22.22 or newer for the build | `package.json` engines (`>=22.22.0`); ⚠ confirm Railway honours it in the first build log (Q-2) | n/a | AGENTS.md |

## 7. Gotchas

- Never set `NUXT_APP_BASE_URL`, `NUXT_APP_CDN_URL`, `NUXT_APP_BUILD_ASSETS_DIR` or any `NUXT_PUBLIC_*` variable on web-v2, and never add a public runtime config key: the CSP allows Nuxt's one inline script by its exact hash, and any of these changes that script, so browsers block all JavaScript (review pass 7 R1, R8). SM-6 catches it.
- `TRUST_PROXY=1` is required behind Railway: without it every visitor shares one address and the sign-in and pay limits (10 per 15 minutes) lock the whole demo.
- The CLI link is per directory, and this directory is also linked to the v1 project: always pass `--service web-v2`.
- Never run `railway variable list`, `railway variable --kv` or `railway variable list --json`: they print raw secret values.
- `make check` and the pre-push hook need the local test database (`make db-test-up`); production never uses it.

## 8. Release log

| Date (`date`) | Env | Milestone | SHA | Approval (row time) | /version commit | Smoke (last line) | Outcome |
|---|---|---|---|---|---|---|---|
| 2026-10-10 16:18 CDT | production (web-v2) | M4 demo | 13a816a | not deployed | n/a: no /version route (GAP-2) | not run | not deployed: blocking GAP-1, GAP-2 |
| 2026-10-10 16:52 CDT | production (web-v2) | M4 demo | 1130822 | pending deploy ask | — | — | GAP-1 to GAP-3 done (M4-T901 to T903); setup FS-2 to FS-8 done |
| 2026-10-10 16:56 CDT | production (web-v2) | M4 demo | 1130822 | 2026-10-10 16:54 CDT | 11308222f1ea5f74dbe4f2595cce23205b14988b | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 11308222f1ea5f74dbe4f2595cce23205b14988b (TLS verified) | live (deployment 59c086de SUCCESS) |
| 2026-10-10 19:55 CDT | production (web-v2) | M4 from main | 158fb11 | 2026-10-10 19:53 CDT | 158fb11f36a3d86d8374a2bb97c4d29a9437038b | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 158fb11f36a3d86d8374a2bb97c4d29a9437038b (TLS verified) | live (deployment 21e295fd SUCCESS); rollback target 1130822 |
| 2026-10-11 06:59 CDT | production (web-v2) | M5 from main | 220a971 | 2026-10-11 ("yes, deploy 220a971 to production") | 220a971f8ea2847d9e680238a2dda0ae55df0f30 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 220a971f8ea2847d9e680238a2dda0ae55df0f30 (TLS verified) | live; deployment 373e2d7d; migrations 1760000012000, 1760000013000 applied first by `scripts/railway-setup.sh --skip-seed` (human run); rollback target 21e295fd (158fb11) |
| 2026-10-11 09:18 CDT | production (web-v2) | M5.1 from main | c956959 | 2026-10-11 ("yes, deploy c956959 to production") | c95695976dc9c0c60423a91cbf82f68a8d2bf063 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at c95695976dc9c0c60423a91cbf82f68a8d2bf063 (TLS verified) | live; deployment b3c00832; no migrations; self-hosted fonts served 200 font/woff2 from /_nuxt/; rollback target 373e2d7d (220a971) |
| 2026-10-11 10:31 CDT | production (web-v2) | M5.2 from main | c9b890d | 2026-10-11 ("tell me when M5.2 is ready to deploy, also deploy it") | c9b890d2762ac9d45468811e88218830162d8090 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at c9b890d2762ac9d45468811e88218830162d8090 (TLS verified) | live; deployment 5224c9ca; no migrations; signed-out / and unknown pages 303 to sign-in; rollback target b3c00832 (c956959) |
| 2026-10-11 13:34 CDT | production (web-v2) | M6 from main | 18da349 | 2026-10-11 ("tell me when M6 is ready to deploy, also deploy it") | 18da3496c9669d200c8a31e3a6d68422fb6e13e4 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 18da3496c9669d200c8a31e3a6d68422fb6e13e4 (TLS verified) | live; deployment d3719e5b; migration 1760000014000 applied earlier by the human-run railway-setup.sh --skip-seed; M6 pages 303 and finance API 401 when signed out; rollback target 5224c9ca (c9b890d) |
| 2026-10-11 14:51 CDT | production (web-v2) | M6.1 from main | 1377d9d | 2026-10-11 ("tell me when M6.1 is ready to deploy, also deploy it") | 1377d9d471e92cec749203a8f413b74a1119c058 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 1377d9d471e92cec749203a8f413b74a1119c058 (TLS verified) | live; deployment ef903acd; no migrations; /orders 303 and /api/orders 401 signed out; rollback target d3719e5b (18da349) |
| 2026-10-11 17:20 CDT | production (web-v2) | fixes !17 + !18 from main | 502d111 | 2026-10-11 ("yes, deploy it when merged") | 502d1113f1ee9d761fff19ea92b529dbea8b8ea6 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 502d1113f1ee9d761fff19ea92b529dbea8b8ea6 (TLS verified) | live; deployment eb79135e; no migrations; rollback target ef903acd (1377d9d) |
| 2026-10-11 18:23 CDT | production (web-v2) | M7 from main | 612c5bf | 2026-10-11 ("tell me when M7 is merged, also deploy it") | 612c5bfc079fcc55f345af5265aca1d1fca11a94 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 612c5bfc079fcc55f345af5265aca1d1fca11a94 (TLS verified) | live; deployment 6773f61f; 1 migration (LINV-1) run by the human first; rollback target eb79135e (502d111) |
| 2026-10-11 19:34 CDT | production (web-v2) | M7.1 from main | 9178201 | 2026-10-11 ("tell me when M7.1 is merged, also deploy it") | 917820133a686af4d551ed5c0ee1e9e037db4fb0 | SMOKE GREEN: 7 passed, 0 failed against https://web-v2-production-6640.up.railway.app at 917820133a686af4d551ed5c0ee1e9e037db4fb0 (TLS verified) | live; deployment 2fca750e; no migrations; live write check own-origin 401, cross-site 403; rollback target 6773f61f (612c5bf) |

## 9. Open questions

| Id | Question | Recommended answer | Blocks |
|---|---|---|---|
| Q-1 | ~~New web-v2 and postgres-v2, v1 untouched?~~ answered: yes (setup done) | — | nothing |
| Q-2 | Does Railway's Node builder pick Node 22.22+ from `engines` and start with `node .output/server/index.mjs`? | confirm in the first build log; if not, a follow-up task adds a `railway.json` (config is implement-task's) | DEP-3 |
| Q-3 | ~~Should the GAP tasks land on the M4 branch?~~ answered: yes (Approvals "Approve, run the three GAP tasks") | — | nothing |
| Q-4 | Which uptime monitor watches `/healthz`? | a free external monitor every 5 minutes alerting your email (you create the account) | HEALTH.md §4 |
