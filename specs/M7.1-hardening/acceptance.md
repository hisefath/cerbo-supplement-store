---
status: draft
milestone: M7.1
---
# M7.1 Hardening — acceptance

## Scope

In scope: AE-068 (FR-002), AE-069 (FR-039), AE-070 (FR-008), NFR-017 (CQ-11, D91). Threat-model rows T-5, T-13, T-16; mutation finding MUT-1.

## How these tests run

| What | Command |
|---|---|
| Suite | `npx vitest run --dir tests/acceptance/M7.1` (in `make check` as `test-acceptance-m7.1`) |
| Run one test | `npx vitest run --dir tests/acceptance/M7.1 -t M7.1_AT_00N` |

## Traceability

| AT | Covers | Given / When / Then | Level | Test | Status |
|---|---|---|---|---|---|
| AT-001 | AE-068, FR-002 | **Given** Dr. Chen sends Ana vitamin D3 **When** the line carries `unit_price_cents: 1` **Then** 422 validation, no order saved; the honest twin is sent at the practice price | integration | `tests/acceptance/M7.1/hardening.test.ts::M7.1_AT_001` | green: pins T-5 (strict send schema) |
| AT-002 | AE-069, FR-039 | **Given** Ana's paid $60.00 order **When** she reads the receipt and the order **Then** neither mentions cost, payout or fee; Omar's review view does | integration | `…::M7.1_AT_002` | green: pins T-13 |
| AT-003 | NFR-017, D91 | **Given** Ana's sent order **When** start checkout arrives with Origin `https://evil.example`, or Sec-Fetch-Site `cross-site` **Then** 403 forbidden and the order stays sent; the same request from the app's own origin starts checkout | integration | `…::M7.1_AT_003` | red @ 612c5bf (got 200), green after BE-23 |
| AT-004 | AE-070, FR-008 | **Given** Ana's order in checkout and another transaction holding the order row **When** she presses Pay **Then** no attempt is recorded while the lock is held, and she is charged once after | integration | `…::M7.1_AT_004` | green: pins the wait. Does not kill MUT-1: `expireHoldIfDue` (server/services/orders.ts:238) takes the same lock first, so removing only pay()'s `forUpdate` still waits. Killing MUT-1 needs a fault-injection seam between the two transactions (not built; accepted) |

## Red run

`npx vitest run --dir tests/acceptance/M7.1` at 612c5bf, 2026-10-11 18:33 CDT (UTC-0500): exit 1, 1 failed / 3 passed. M7.1_AT_003: "expected 403 application/problem+json /problems/forbidden, got 200". After BE-23: 4 passed.

## Change log

| Date | Change | Ids | Why |
|---|---|---|---|
| 2026-10-11 18:33 CDT (UTC-0500) | First draft | all | CQ-11 "go M7.1" (STANDING) |
