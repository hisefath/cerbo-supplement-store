# Deploy runbook — cerbo-supplement-store

| Field | Value |
|---|---|
| Platform | Railway, CLI 5.57.7 (`railway --version`, read 2026-10-10 16:18 CDT) |
| Services | v2 demo: a new web service `web-v2` and a new managed PostgreSQL `postgres-v2` in project `cerbo-supplement-store` (to be created, FS-2). The project's existing `app` service and `Postgres` database run the v1 Laravel build and stay untouched (D22) |
| Environments | production (Railway environment `production`): v2 demo at ⚠ set after FS-5 · v1 at https://supplement-store-slice.up.railway.app (not this release) |
| Method | clean `git archive` upload of the release SHA with `railway up --path-as-root` |
| Current release | none yet — see §8 |
| Last updated | 2026-10-10 16:18 CDT |
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

- **Release:** M4 demo at milestone-branch SHA `13a816aab92d7800abb7d12abc89e455c149c10a` (`milestone/m4-tracer-bullet`). It is **not merged to main**: D55 (Approvals "a, deploy the demo from the branch") chose a demo from the reviewed branch before the M1 to M4 merge chain (D48). PRE-1 and PRE-2 are replaced by PRE-1b for this demo; the real release redeploys from main after G5.
- **Live before this release:** nothing for v2 (first deploy of `web-v2`). The v1 `app` service is live (deployment c1fd5077…, 2026-10-05) and is not touched.
- **How the SHA reaches the platform:** DEP-1 exports the SHA with `git archive` into a clean folder; DEP-2 writes `build-info.json`; DEP-3 uploads that folder with `railway up --path-as-root`.
- **Why this method:** it ships exactly one committed SHA, never uncommitted or git-ignored files, and deploying stays its own human yes.
- **Build and start:** Railway's Node builder runs `npm ci` and `npm run build` (`nuxt build`, `package.json` scripts) and starts `node .output/server/index.mjs` (⚠ confirm the detected start command in the build log at the first deploy, Q-2).
- **How the app knows its version:** DEP-2 writes `build-info.json` {"commit","built_at"} into the upload; `GET /version` reads it — ⚠ the route does not exist yet (GAP-2 in `docs/ops/HEALTH.md` §6).
- **Migrations in this release:** every migration is new: `db/migrations/1760000001000_core-orders.sql`, `1760000002000_payments-ledger.sql`, `1760000003000_idempotency-keys.sql`, `1760000006000_sign-in-attempts.sql`, `1760000011000_pay-attempt-limits.sql`. They run as the database owner role and grant to the app role (acceptance Q-3, Q-4), so FS-4 creates both roles first.

## 2. Preflight (read-only, before every deploy)

| Id | Command | Expect | If not |
|---|---|---|---|
| PRE-1 | `git fetch origin main && git merge-base --is-ancestor "$SHA" origin/main && echo on-main` | `on-main` | Stop: the SHA is not merged. **This demo (D55):** expected to fail; use PRE-1b. |
| PRE-1b | `git merge-base --is-ancestor "$SHA" milestone/m4-tracer-bullet && git log -1 --format=%H milestone/m4-tracer-bullet` | the SHA is the branch tip | Stop: deploy only the reviewed branch tip named in the deploy ask. |
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
| FS-2 | Add the v2 web service and a separate v2 database (keep v1's `app` and `Postgres` untouched: v1 tables share names like users and orders) | `railway add --service web-v2`; `railway add --database postgres`, then rename the new database service to `postgres-v2` in the dashboard | `railway --help` (CLI 5.57.7); ⚠ read `railway add --help` before running | `railway status` lists `web-v2` and `postgres-v2` |
| FS-3 | Link this repo directory to the v2 service | `railway service link web-v2` | `railway service --help` (CLI 5.57.7) | PRE-5 shows service `web-v2` |
| FS-4 | Create the two database roles in `postgres-v2` with passwords you choose: `supplements_owner` (owns the schema, runs migrations) and `supplements_app` (the app's login, granted rights only by the migrations) | `railway connect postgres-v2`, then in psql: create both roles with LOGIN and a password, and make `supplements_owner` the owner of the database's `public` schema | `railway --help` (connect, CLI 5.57.7); acceptance Q-3 | both roles log in |
| FS-5 | Generate the public HTTPS domain for `web-v2` | `railway domain --service web-v2` | `railway domain --help` (CLI 5.57.7) | the domain is known; it becomes `URL` in §3 |
| FS-6 | Set every §6 variable by name on `web-v2` (values typed by you) | dashboard → web-v2 → Variables | Railway dashboard | you confirm each §6 name is set (names only) |
| FS-7 | Run the migrations once against `postgres-v2` as `supplements_owner` | from a clean export of $SHA: `npx node-pg-migrate up -m db/migrations` with `DATABASE_URL` set to the owner's connection string (typed by you, for this one command) | AGENTS.md acceptance Q-4; `node-pg-migrate` 9.0.0 | `pgmigrations` lists the five files |
| FS-8 | Load the demo data (fictional practices, people, products; demo password typed by you) | ⚠ the seed command does not exist yet (GAP-3) | — | you can sign in as the demo provider |

## 3. Deploy commands (human-only — run only after a recorded yes)

```bash
SHA=13a816aab92d7800abb7d12abc89e455c149c10a            # milestone/m4-tracer-bullet tip named in the deploy ask (D55)
ENV=production
SVC=web-v2
URL=⚠ set after FS-5
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

## 9. Open questions

| Id | Question | Recommended answer | Blocks |
|---|---|---|---|
| Q-1 | Deploy the v2 demo to a new `web-v2` service and `postgres-v2` database, leaving v1's `app` running? | yes: v1's database already has users and orders tables, so the v2 migrations would fail there, and v1 stays as history (D22) | FS-2 |
| Q-2 | Does Railway's Node builder pick Node 22.22+ from `engines` and start with `node .output/server/index.mjs`? | confirm in the first build log; if not, a follow-up task adds a `railway.json` (config is implement-task's) | DEP-3 |
| Q-3 | Should the GAP tasks land on `milestone/m4-tracer-bullet` (the demo branch, D55) instead of the next milestone? | yes: the demo deploys that branch, so its health, version and seed code must be on it | GAP-1, GAP-2, GAP-3 |
| Q-4 | Which uptime monitor watches `/healthz`? | a free external monitor every 5 minutes alerting your email (you create the account) | HEALTH.md §4 |
