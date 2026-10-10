# Verifier review: M4 pass 1

- Date: 2026-10-10 · Diff: `.handoff/reviews/M4-diff.patch` (24 files; this pass covers M4-T001 only) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.handoff/reviews/M4-diff.patch`, `specs/M4-tracer-bullet/tasks/T001.md` (plus the `covers:`, `Owns:` and Out-of-scope lines of T002–T009), `specs/M4-tracer-bullet/acceptance.md` (the AT rows, Q-1, Q-3 and Q-4), `tests/acceptance/M4/send-order.test.ts`, `tests/acceptance/support/{app,db,http,people}.ts`, `docs/architecture/lld.md` (§1 Tables, §2 BE-1 to BE-13, §3 FE components/state/data fetching, §4 endpoints/problems/idempotency, SEQ-1, §9 seams), `docs/architecture/contracts/openapi.yaml` (securitySchemes, Me, SignInRequest, Catalog, CatalogItem, SendOrderRequest, Order, OrderLine, Notice), `docs/design/screens.md#S9`, `Makefile` and `package.json` in the worktree, `AGENTS.md`

## Findings

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | tests-that-lie | P2 | high | tests/unit/money.test.ts:1 | The BE-6 Money unit suite runs in no gate. `make check` only runs lint, typecheck and the diagram-embed check. T001's Done-when runs only `tests/acceptance/M4`. So these tests could go red, or Money could break, while every gate stays green. The rounding rule, the floor and `unitCostFromLowestAllowedPrice` (which the order builder relies on) are covered only here. | Makefile `test:` → `bash scripts/embed-diagrams.sh --check …`; Done-when: `npx vitest run tests/acceptance/M4 -t … && make check` | fix (add `npx vitest run tests/unit` to `make check`; T009 owns the Makefile) |
| R2 | security | P2 | med | server/services/session.ts:33 | The dummy hash used for unknown emails has a hard-coded cost of N=1024. Real stored hashes carry the production cost (SEAM-6 `SCRYPT_COST`). In production, an unknown email answers faster than a known email with a wrong password, so timing reveals which emails have accounts. The code comment claims the opposite. The two match only in tests, where the cost is 1024. | ``const DUMMY_HASH = `scrypt$1024$8$1$…` ``; line 73 `verifyPassword(password, user?.password_hash ?? DUMMY_HASH)` | fix (build the dummy hash from the configured cost) |
| R3 | spec-fidelity | P3 | high | — | Nothing tests the UI half of FR-002 / AE-001 ("she sees lines … her payout of $29.55"). AT-001 checks only the API response. The live panel totals in FE-4 come from a cost worked backwards from the floor price, and no test exercises that. | supplements.vue:31-42 `cost += unitCostFromLowestAllowedPrice(item.lowest_allowed_price_cents) * l.quantity`; acceptance.md AT-001 level = integration (API) | file |
| R4 | spec-fidelity | P3 | high | server/services/money.ts:66 | `unitCostFromLowestAllowedPrice` is a public Money method that the LLD BE-6 table does not list. The client needs it because the Catalog schema carries no cost. The maths holds: the payout rises by 0 or 1 cent per cent of price, so the payout at the floor is exactly $0.00. The method still needs an LLD catch-up. | `export function unitCostFromLowestAllowedPrice(lowestAllowedCents: number): number` | keep (log it as an LLD catch-up) |
| R5 | spec-fidelity | P3 | high | server/services/messaging.ts:19 | LLD §9 SEAM-2 asks for one token module that BE-3 and BE-12 both import, so tests can replace it. Instead, each service calls `randomBytes` directly. No M4 test needs the seam yet. | messaging.ts:19 `randomBytes(32).toString('base64url')`; session.ts:75 the same call | file |
| R6 | correctness | P3 | med | db/migrations/1760000001000_core-orders.sql:15 | lld.md §1 says `users.email` is "stored lower-case", but nothing enforces it: no CHECK and no lowercasing on write. Sign-in and uniqueness still work because both use `lower(email)`. | `email text not null,` | file |
| R7 | simplicity | P3 | high | server/services/access-policy.ts:45 | `assertCanChangeRole` and `StaffRef` implement FR-055/FR-056. No M4 task claims those requirements and nothing calls this code. It was built ahead of need. | `export function assertCanChangeRole(actor: Viewer, target: StaffRef): void {` | fix (remove; add it with the task that covers FR-055) |
| R8 | simplicity | P3 | high | server/services/orders.ts:41 | The empty-order check can never run, because the route schema already refuses empty `lines` (`.min(1)`, index.post.ts:12). The empty-order refusal belongs to M4-T004. | `if (quantities.size === 0) throw new ProblemError('validation', …)` | file (T004 decides which of the two checks stays) |

No tests-that-lie findings in `tests/acceptance/**` (checked: the diff does not touch it; T001's six ATs assert exact cents, line tuples and persisted rows, run a "twin" positive case before each refusal, and AT-017 asserts the exact key set). No unit test mocks the system under test, and none is skipped or has an assertion that cannot fail (checked in money.test.ts).
No further security findings (checked: authentication and the role check run before the body is parsed on EP-18 and EP-19; the cross-practice refusal returns 404 in both services; Zod `strictObject` blocks mass assignment; Kysely parameterises every query; the cookie is HttpOnly, Secure and SameSite=Lax, named `session` per openapi; tokens are 32 random bytes and stored as a SHA-256 hash; the notice returns only `practice_name` and `sign_in_path`; grants give `supplements_app` no DELETE on orders or order_lines; the diff contains no secrets or PHI and adds no dependency). The EP-15 rate limit is missing, but T006 owns it (T006.md "Out of this task" line), so it is not a T001 finding.

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-001 | server/services/catalog.ts:36-57, server/api/patients/[patientId]/catalog.get.ts:8-13 | send-order.test.ts M4_AT_001:20-25 | covered |
| FR-002 | server/services/orders.ts:33-112 (API totals); supplements.vue:31-42 + OrderPanel.vue (UI) | M4_AT_001, M4_AT_020, M4_AT_037 | partial (API covered, UI untested: R3) |
| FR-017 | money.ts:46-49, catalog.ts:51 and :71 | M4_AT_015; tests/unit/money.test.ts (not gated: R1) | covered |
| FR-043 | orders.ts:94 (notice inside the send transaction), messaging.ts:14-25, app/pages/notices/[token].vue | M4_AT_017 | covered |
| FR-044 | messaging.ts:27-35 (fixed two-field response), migration notices table (no item or amount columns) | M4_AT_017 (exact key set + content regex) | covered |
| FR-009 | access-policy.ts:34-42 used by catalog.ts:37 and orders.ts:35 | M4_AT_022 | covered |
| AE-001 | orders.ts:72-112, money.ts:19-27 | M4_AT_001 (API); money.test.ts:16, :29 | partial (the "she sees" UI part is untested: R3) |
| AE-015 | catalog.ts:51, money.ts:48 | M4_AT_015 | covered |
| AE-041 | messaging.ts:27-35 | M4_AT_017 | covered |
| AT-020 (FR-011, FR-012 triangulation) | money.ts:19-27, orders.ts:74-76 | M4_AT_020 | covered |
| AT-037 (LINV-4) | orders.ts:38-40, migration `uq_order_lines_order_product` | M4_AT_037 | covered |

## Not reviewed

- Whether T001's ATs actually pass, and `make check` — needs running (Read/Grep/Glob only by role).
- `Owns:` glob matching for the nested paths `app/pages/patients/[patientId]/supplements.vue` and `server/api/patients/[patientId]/catalog.get.ts` against `app/pages/patients/*` and `server/api/patients/*`. This depends on how `scripts/scope-guard.sh` treats `*`; the supervisor's scope-guard run settles it.
- `app/layouts/default.vue` — listed in `Owns:` but not in the diff (nothing to review).
- Behaviour assigned to T002–T009 (idempotency storage, the floor and empty-order refusals, the patient order page, sign-in page and idle sign-out, the rate limit, cancel), as instructed.
- `server/services/session.ts:64` has a code comment pointing to `result.md` Questions. I did not read that file, because it is a worker self-report.
- How the pages look and the exact microcopy in the browser — needs running; I compared only against screens.md S9.
- `docs/product/prd.md` and `docs/decisions/DECISION_JOURNAL.md` — not opened. The FR/AE text and the D-ids I needed are quoted in T001.md, which I relied on instead.
