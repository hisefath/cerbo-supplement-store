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
