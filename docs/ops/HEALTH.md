# Production health — cerbo-supplement-store

| Field | Value |
|---|---|
| Environment | production (Railway service `web-v2`) at ⚠ set after FS-5 in `docs/runbooks/deploy.md` |
| Live release | none yet: M4 demo @ 13a816a is not deployed (see `docs/runbooks/deploy.md` §8) |
| Owner | the project owner (Sefath); alerts by email from the uptime monitor |
| Last updated | 2026-10-10 16:18 CDT |
| Written by | ship-milestone (Claude Code, claude-opus-5-5) |

## 1. Health and version endpoints

| Endpoint | Contract | What it proves | What it does NOT prove | Status |
|---|---|---|---|---|
| `/healthz` | 200 text `ok` after one `select 1` on the app's database with a 2 s timeout; 503 when the database does not answer; `Cache-Control: no-store`; no versions, stack traces or config | the process answers and reaches its database | that the reviewed code runs; that the journey works | GAP-1 (no route: `server/api` and `server/routes` hold no health route) |
| `/version` | 200 JSON `{"commit": "<40 hex>", "built_at": "<ISO-8601 UTC>"}`, `Cache-Control: no-store`, no other fields | which build is running | that it works | GAP-2 (no route) |

## 2. SLO

| Field | Value |
|---|---|
| SLO-1 | ≥ 99% of 5-minute probes of `/healthz` succeed |
| SLI (what we count) | successful probes ÷ all probes, from the probe's history |
| Window | 30 days, rolling |
| Error budget | 7.2 hours |
| When the budget is spent | stop demo feature work; the next milestone starts with reliability work |
| Why this target | this is a demo on one small Railway service with nobody on call; 99% allows one bad evening a month, which a demo audience tolerates, and the in-EHR release sets its own target later |

  WHY: (1 − 0.99) × 30 days × 24 h = 7.2 h; 30 days ÷ 5 min = 8,640 probes, so 86 may fail

## 3. How we would know it is broken

| Id | What users see | Signal | Where to look | Threshold | First action |
|---|---|---|---|---|---|
| SIG-1 | site down | probe fails | the uptime monitor's alert email and dashboard | 2 consecutive failures | deploy in the last hour → RB-3 (take the demo down); else read logs (§5) |
| SIG-2 | old or wrong code live | `/version` ≠ the SHA in `docs/runbooks/deploy.md` §8 | `bash scripts/smoke.sh <url> <sha>` (SM-1) | any mismatch | redeploy the right SHA with deploy.md §3 |
| SIG-3 | errors | HTTP 5xx in Railway's HTTP logs | `railway logs --service web-v2 --environment production --http --filter '@httpStatus:>=500' --lines 100` | more than 1% of requests over 15 min | read the error; take the demo down if it started at a deploy |
| SIG-4 | health green but pages broken (no JavaScript, Pay does nothing) | SM-6 red (CSP hash mismatch) or SM-3…SM-5 red | `bash scripts/smoke.sh <url> <sha>` | any red | check §7 of the runbook (forbidden NUXT_* variables), then fix-bug with the failing SM-n as the repro |
| SIG-5 | everyone refused at sign-in | 429 `rate-limited` for many people at once | `railway logs --service web-v2 --environment production --http --filter '@httpStatus:429' --lines 100` | 429s from different people within 15 min | check `TRUST_PROXY=1` is set (runbook §6) |

## 4. Probe

| Field | Value |
|---|---|
| Probe | ⚠ an external uptime monitor chosen by the owner (Q-4 in the runbook) |
| Checks | `GET <url>/healthz` expects 200 and `ok`, TLS verified |
| Interval and locations | 5 minutes, 1 region |
| Alerts to | the owner's email |
| Set up by | human, after the first green deploy (accounts are human-only) |
| First pass | not yet: nothing deployed |
| Blind spots | one region; checks health, not the journey (the smoke covers the journey after each deploy) |

## 5. Logs

| What | Where | How to read it | Retention | Never contains |
|---|---|---|---|---|
| Application logs | Railway log stream for web-v2 (stdout and stderr) | `railway logs --service web-v2 --environment production --lines 200` | Railway plan default | secrets, tokens, PHI, card data, error objects or database rows (SEC-7) |
| Build logs | Railway build log for each deployment | `railway logs --service web-v2 --environment production --build --lines 200` | Railway plan default | secrets |
| HTTP access logs | Railway HTTP logs | `railway logs --service web-v2 --environment production --http --lines 100` | Railway plan default | query strings with personal data (the app puts none in URLs) |

- **Log level in production:** errors only (`console.error` with error class, code and constraint name; never the error itself)
- **Find one failing request:** filter the HTTP logs by path and status, then match the `urn:uuid:` instance id from the problem response in the application logs

## 6. Readiness gaps (filed as tasks)

### GAP-1 No health route

Blocks: G-live · Why: nothing can tell whether the demo process is up and reaching its database, so neither the deploy wait nor the probe has anything to check.

```markdown
---
id: M4-T901   milestone: M4   skill: implement-task   covers: [ops]   after: []
harness: claude   mode: workspace-write   hitl: false   parallel: true   budget: 1 run, 20 min
---
Owns: server/routes/healthz.get.ts, tests/unit/healthz.test.ts
## Ask
GET /healthz returns 200 with body "ok" after one "select 1" on the app's database (server/utils/db.ts useDb) with a
2-second timeout, and 503 with body "unavailable" when the query fails or times out. No authentication; Cache-Control:
no-store; never returns versions, error messages, stack traces or configuration; logs a failure only with
errorFacts (server/utils/problem.ts).
Contract home: this Ask until design-lld adds the path to docs/architecture/contracts/openapi.yaml (it owns that
file); the worker never edits docs/**.
## Done-when
`make check` exits 0, including unit tests for the 200 "ok" path and the 503 path (database error injected), and
`grep -q no-store server/routes/healthz.get.ts`.
## Must not change
every path outside Owns; existing routes' behaviour; the security headers in nuxt.config.ts.
## Consumes / Produces
Consumes: server/utils/db.ts useDb. Produces: the contract scripts/smoke.sh SM-2 and the uptime probe check.
## Context manifest
give: docs/ops/HEALTH.md#1-health-and-version-endpoints, server/utils/db.ts, server/utils/problem.ts ; never give: other runs/, worker self-reports
## Return
write $HANDOFF_DIR/runs/M4-T901/result.md
```

### GAP-2 No version route

Blocks: G-live · Why: without /version nobody can prove which code the demo runs, so a deploy could never be verified.

```markdown
---
id: M4-T902   milestone: M4   skill: implement-task   covers: [ops]   after: []
harness: claude   mode: workspace-write   hitl: false   parallel: true   budget: 1 run, 20 min
---
Owns: server/routes/version.get.ts, tests/unit/version.test.ts
## Ask
GET /version returns 200 JSON {"commit": "<40 hex>", "built_at": "<ISO-8601 UTC>"} read from build-info.json at the
application root (written by docs/runbooks/deploy.md DEP-2 into the upload before the build; read it at server start
or on first request with node:fs, never by running git); no authentication; Cache-Control: no-store; no other fields.
When build-info.json is missing (local dev), answer 503 with body "unknown build". The file must reach the running
server: confirm with a local nuxi build plus node .output/server/index.mjs that the route finds it, and say in
result.md where the server reads it from.
Contract home: this Ask until design-lld adds the path to docs/architecture/contracts/openapi.yaml (it owns that
file); the worker never edits docs/**.
## Done-when
`make check` exits 0, including unit tests for the JSON shape, the no-store header and the missing-file 503.
## Must not change
every path outside Owns; existing routes' behaviour; the security headers in nuxt.config.ts.
## Consumes / Produces
Consumes: the build-info.json that deploy.md DEP-2 writes. Produces: the contract scripts/smoke.sh SM-1 checks.
## Context manifest
give: docs/ops/HEALTH.md#1-health-and-version-endpoints, docs/runbooks/deploy.md#1-what-gets-deployed-and-how ; never give: other runs/, worker self-reports
## Return
write $HANDOFF_DIR/runs/M4-T902/result.md
```

### GAP-3 No demo data loader

Blocks: nothing (follow-up) · Why: the deploy can be proven without it, but nobody can sign in to the demo until fictional accounts and products exist (runbook FS-8).

```markdown
---
id: M4-T903   milestone: M4   skill: implement-task   covers: [ops]   after: []
harness: claude   mode: workspace-write   hitl: false   parallel: true   budget: 1 run, 30 min
---
Owns: db/seed/demo.ts, tests/unit/seed-demo.test.ts
## Ask
A demo data loader runnable as `node db/seed/demo.ts` (Node 22.22+ type stripping; no new dependency) against
DATABASE_URL (the owner role), loading the fictional world from the PRD examples: practices Willow Creek Wellness and
Maple Grove Clinic; providers Dr. Maya Chen and Dr. Sam Lee; patients Ana Ruiz, Ben Ortiz, Carla Diaz; operations
Omar Ortega (operations_specialist), Sam Reyes (sre), Dana Ito (data_analyst), Fran Fields (finance_lead); products
Vitamin D3 2000 IU (cost 900, stock 10), Magnesium Glycinate (1200, 5), Omega-3 Fish Oil (1500, 3); emails at
@example.test. Every password is hashed with scrypt in the stored format scrypt$N$r$p$salt$hash (acceptance Q-1)
from DEMO_PASSWORD read from the environment, with N from SCRYPT_COST or 16384; the password never appears in code,
logs or output. Re-running it resets the demo: one transaction that empties the M4 tables and loads the world again.
It refuses to run unless DEMO_RESET=yes is set.
## Done-when
`make check` exits 0, including a unit test that the loader refuses without DEMO_RESET=yes and without DEMO_PASSWORD.
## Must not change
every path outside Owns; tests/acceptance/**; the migrations.
## Consumes / Produces
Consumes: the M4 schema (db/migrations). Produces: runbook FS-8.
## Context manifest
give: docs/runbooks/deploy.md#2-preflight-read-only-before-every-deploy, server/services/session.ts (hash format), db/migrations/*.sql ; never give: other runs/, worker self-reports
## Return
write $HANDOFF_DIR/runs/M4-T903/result.md
```

## 7. Open questions

| Id | Question | Recommended answer | Blocks |
|---|---|---|---|
| Q-1 | GAP tasks on the M4 branch (`M4-T901` to `T903`) instead of the next milestone? | yes, per D55: the demo deploys `milestone/m4-tracer-bullet` (same as runbook Q-3) | GAP-1, GAP-2, GAP-3 |
| Q-2 | Probe choice | a free external uptime monitor, 5-minute checks, email alerts (runbook Q-4) | §4 |
