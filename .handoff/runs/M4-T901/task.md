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
