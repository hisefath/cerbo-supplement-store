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
