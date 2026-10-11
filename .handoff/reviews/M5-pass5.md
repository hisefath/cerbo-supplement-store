# Verifier review: M5 pass 5 (scope: M5-T004 only)

- Date: 2026-10-10 · Diff: `.handoff/reviews/M5-T004.patch` (6 files) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.claude/agents/verifier.md`; `.handoff/reviews/M5-T004.patch`; worktree `m5-t004`: `specs/M5-prices-and-stock/tasks/T004.md`, `specs/M5-prices-and-stock/acceptance.md`, `tests/acceptance/M5/stock-dashboard.test.ts`, `docs/architecture/lld.md` (§1 products and stock_movements, §2 BE-1/4/5/13, §3 FE-16/ST-10, §4 EP-31/EP-32, Problem types, Idempotency, Pagination, SEQ-6), `docs/architecture/contracts/openapi.yaml` (listStock, adjustStock, StockMovement, StockList, StockAdjustmentRequest, parameters), `docs/design/screens.md#S7`. For context: `server/services/{idempotency,pricing,stock}.ts`, `server/utils/problem.ts`, `app/components/ProblemMessage.vue`, `app/pages/ops/orders/index.vue`, `tests/unit/pricing.test.ts`

## Findings

No tests-that-lie findings. I checked `tests/unit/stock-adjustments.test.ts`. It calls the real `checkAdjustment` and the real zod schema with no mocks, stubs or skips. Its expected values (8 + 12 = 20, `unitsInStock: 9`, `productIds: [7]`, `unitsAvailable: [9]`) come from AE-027 and the problem contract, not from the code's output. Its `problem()` helper throws when nothing is raised. The diff makes no edit to `tests/acceptance/**`.

No security findings. I checked these:
- Both routes call `assertRole(viewer, ['operations_specialist'])` before parsing the body or touching the Idempotency-Key, so a provider gets 403 with nothing changed.
- The request body is a `z.strictObject`, so unknown fields are refused (no mass assignment).
- All SQL is built by Kysely, and the cursor values go in as bound parameters with `::timestamptz` and `::bigint` casts.
- `parseBody` reads only an `application/json` body, and the Idempotency-Key header forces a CORS preflight, which together block cross-site posts (CSRF).
- No secrets, PHI or new logging were added.
- The history join exposes only staff display names (`actor_id` exists only on adjustments).
- No new dependencies.

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | correctness | P3 | med | server/services/stock-adjustments.ts:15 | `change` is limited only to a JavaScript safe integer. A change, or a resulting count, above the PostgreSQL `integer` range (`products.units_in_stock`, `stock_movements.change`) makes the UPDATE or INSERT fail with error 22003. The caller gets 500 `/problems/internal` instead of 422 `/problems/validation`. No data is lost: the transaction rolls back and the key is released. Running the request would confirm it. | `change: z.int().refine((n) => n !== 0, …)`; :58 `.set({ units_in_stock: after })`; lld.md products `units_in_stock` integer | file |
| R2 | correctness | P3 | high | app/pages/ops/stock.vue:118-120 | Every save problem other than stale-stock, insufficient-stock and validation shows "We couldn't save the change. Stock is still N. Try again." That includes `unauthenticated` (signed out after 15 idle minutes), `forbidden` and `idempotency-in-flight`. For in-flight the change may in fact land, so "Stock is still N" can be wrong. For signed-out, retrying cannot work, and S7 Permission denied says the person is sent to the sign-in page. | `} else { errors.value = { form: `We couldn't save the change. Stock is still ${p.units_in_stock}. Try again.` }` | file |
| R3 | spec-fidelity | P3 | high | app/pages/ops/stock.vue:163 | The change form renders after the whole products table. S7 says it opens "in place under its row" (Accessibility; Responsive at 1280 px) and "as a full-screen sheet" at 375 px. Neither is implemented. | `<OpsStockChangeForm v-if="editing" …/>` placed after `</table>`; screens.md S7 Accessibility "the form opens in place under its row"; Responsive 375 px "the form opens as a full-screen sheet" | file |
| R4 | spec-fidelity | P3 | high | app/pages/ops/stock.vue:183 | "Show 25 more" swaps the URL cursor, so the next page replaces the history shown instead of adding to it. The 25 newer lines disappear, and only browser Back brings them back. The S3 page has the same pattern. | `<NuxtLink v-if="list.history_next_cursor" :to="{ query: { history_cursor: … } }">Show 25 more</NuxtLink>`; screens.md S7 Edge data "history pages by 25" / "Show 25 more" | file |
| R5 | spec-fidelity | P3 | high | server/services/stock-adjustments.ts:78 | An unknown `history_cursor` returns 422 `/problems/validation` (through `decodeCursor`). The contract for EP-31 lists only 401 and 403. EP-27 has the same gap. Either the contract or the code should change. | `const after = historyCursor ? decodeCursor(historyCursor) : undefined`; lld.md EP-31 errors "401 …; 403 …"; openapi `/api/ops/stock` get has no 422 | file |
| R6 | correctness | P3 | med | app/pages/ops/stock.vue:46-47 | History times are formatted with `toLocaleString` and no `timeZone`. The server render uses the host's zone and the browser re-renders in the viewer's zone, which can cause a hydration mismatch and a time that shifts after load. Existing pages share the pattern. | `new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })` | file |
| R7 | simplicity | P3 | high | server/services/stock-adjustments.ts:8 | BE-13 imports the cursor helpers from BE-8 PricingService. That dependency is not in the LLD, which says BE-13 depends on BE-4 and BE-20 only. The two pagination helpers belong in a shared util that both services import. | `import { decodeCursor, encodeCursor } from './pricing'`; lld.md BE-13 "Depends on: BE-4, BE-20" | file |

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-030 / AE-027 | server/services/stock-adjustments.ts:48-74 (`adjust`: lock the row, check, update, insert an `adjustment` movement with actor and units after), :77-105 (`listStock`), server/api/ops/stock/[productId]/adjustments.post.ts:10-21, server/api/ops/stock/index.get.ts:8-13 | tests/acceptance/M5/stock-dashboard.test.ts::M5_AT_017, ::M5_AT_020 (replay); tests/unit/stock-adjustments.test.ts:461-463 | covered |
| FR-038 / AE-036 | adjustments.post.ts:12 `assertRole(viewer, ['operations_specialist'])` | stock-dashboard.test.ts::M5_AT_018 (with the allowed twin) | covered |
| stale count, 409 `/problems/stale-stock` with `unitsInStock` (task "Also") | stock-adjustments.ts:41 | ::M5_AT_019; unit :469-473 | covered |
| below zero, 422 `/problems/insufficient-stock` (task "Also", INV-5) | stock-adjustments.ts:43 (plus `ck_products_stock_nonneg`) | ::M5_AT_019; unit :475-479, :465-467 (down to exactly 0) | covered |
| EP-32 Idempotency-Key (BE-5, D41) | adjustments.post.ts:16 `guard(…, 'POST /api/ops/stock/{productId}/adjustments', { product_id: id, ...body }, …)` | ::M5_AT_020 | covered (the missing-key 400 has no test for EP-32) |
| NFR-003 / NFR-014 (who and when) | `actor_display_name`, `created_at` in `adjust` and `listStock` | ::M5_AT_017 | covered |
| S7 / FE-16 / ST-10 (copy, states, large-change confirmation, focus return) | app/pages/ops/stock.vue, app/components/ops-stock/ChangeForm.vue | none: by design, acceptance.md has no browser tool and checks copy in the demo smoke | partial (see R2-R4, R6) |

## Not reviewed

- `docs/product/prd.md`: not opened. FR-030, FR-038, AE-027 and AE-036 are taken from the verbatim quotes in T004.md and acceptance.md.
- `docs/decisions/DECISION_JOURNAL.md`: not read. Decisions were checked only against the D-ids listed in T004.md Must-not-change. Nothing in the diff touches migrations, grants, money or dependencies.
- Runtime behaviour: I have no shell, so I did not run `make check`, typecheck, or the Done-when count of AT-017 to AT-020. R1 and R6 need a run to confirm.
- `server/services/session.ts`, `server/services/access-policy.ts`, `server/utils/db.ts`: not in the diff and only used as-is. `assertRole` and `requireViewer` behaviour was inferred from lld.md BE-3 and BE-4.
- Page-level role guard for EP-9 `/ops/stock`: no middleware is in the diff. The page relies on EP-31's 403, as `app/pages/ops/orders/index.vue` does. The global middleware was not inspected.
- `.handoff/runs/**` and worker reports: not read, by rule. The supervisor's prompt quoted none.
