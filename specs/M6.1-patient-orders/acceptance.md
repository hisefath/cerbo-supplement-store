---
milestone: M6.1
slug: patient-orders
artifact: acceptance
status: draft
written_by: define-acceptance (software-factory-kit 0.1)
written_at: 2026-10-11 13:52 CDT (UTC-0500)
base_sha: f66c9e6
inputs: "docs/product/prd.md (CQ-9, G1), docs/architecture/lld.md (EP-42, BE-9, FE-27, G3), docs/design/screens.md S16 (G-ux), docs/design/flows.md F7 2e"
tests: tests/acceptance/M6.1/
gate: G4
---

# M6.1 acceptance: patient orders

## Scope

| Id | Kind | Text (short) | Source |
|---|---|---|---|
| FR-039 | FR | a signed-in patient sees her own orders | prd.md M6.1 row |
| AE-037 | AE | Ana sees only her own orders | prd.md M6.1 row |
| AE-067 | AE | Ana lands on Your orders: two orders newest first, practice, total, status; none of Ben's | prd.md CQ-9 |

Counts: `grep -E '^\| M6\.1 ' docs/product/prd.md | grep -oE '(FR|AE)-[0-9]{3}' | sort -u | wc -l` → 3.
Out of scope this milestone: filtering or searching orders; reminders.

## How these tests run

| Item | Value | Source |
|---|---|---|
| Framework | Vitest 5 with @nuxt/test-utils | tests/acceptance/support/app.ts |
| Run all | `npx vitest run --dir tests/acceptance/M6.1` | AGENTS.md acceptance command; --dir so copies under .claude/worktrees are not picked up |
| Run one test (for a task's Done-when) | `npx vitest run --dir tests/acceptance/M6.1 -t 'M6.1_AT_001 '` (exits 0 when no test matches: Q-1) | Red run |
| Test database (safe to reset?) | yes: `supplements_test` on the throwaway container | tests/acceptance/support/db.ts:10-19 |
| Suites | make check runs M6.1 only after M6.1-T001 adds it (Q-2) | Makefile |

## Traceability

| AT | Covers | Requirement (EARS, verbatim) | Given / When / Then (concrete values) | Technique | Level | Test (path::name) | Status |
|---|---|---|---|---|---|---|---|
| AT-001 | AE-067, AE-037, FR-039 | FR-039: When a person signs in with their own account, the system shall show only the pages their role allows: a patient their own orders, a provider their practice, platform staff the platform pages. | **Given** Ana's paid $30.00 order, Ben's order, then Ana's sent $60.00 order **When** Ana signs in **Then** the root sends her to /orders (title in the band) and the list is [$60.00 sent, $30.00 paid], Willow Creek Wellness, none of Ben's | example | integration | `tests/acceptance/M6.1/patient-orders.test.ts::M6.1_AT_001` | red @ f66c9e6 |
| AT-002 | FR-039 | FR-039 (as above), lld.md EP-42 auth | **Given** Ana, Dr. Chen, Omar and a stranger **When** each asks for the orders list **Then** 200, 403, 403, 401 | decision-table | integration | `tests/acceptance/M6.1/patient-orders.test.ts::M6.1_AT_002` | red @ f66c9e6 |
| AT-003 | FR-039 | screens.md S16 Empty | **Given** Carla with no orders **When** she opens Your orders **Then** an empty list and "No orders yet. Your practice will send you a message when they order supplements for you." | partition | integration | `tests/acceptance/M6.1/patient-orders.test.ts::M6.1_AT_003` | red @ f66c9e6 |
| AT-004 | FR-039 | lld.md EP-42 paging (BE-22, 25 per page) | **Given** 26 orders for Ana **When** she pages **Then** 25 then 1, newest first, no repeats; a made-up cursor is 422 | boundary | integration | `tests/acceptance/M6.1/patient-orders.test.ts::M6.1_AT_004` | red @ f66c9e6 |
| AT-005 | AE-067 | lld.md EP-42 "total_cents as EP-21 shows it" | **Given** Ana's $60.00 order and Magnesium raised to $26.00 **When** she reads the list and the order **Then** both say $62.00 | error-guessing | integration | `tests/acceptance/M6.1/patient-orders.test.ts::M6.1_AT_005` | red @ f66c9e6 |

## Edge cases

### Equivalence partitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-001 | FR-039 | a patient with orders, and one with none | the list; the S16 empty message | AT-001, AT-003 |

### Boundary values

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-002 | FR-039 | 25 and 26 orders | one page, then a second page of 1 | AT-004 |

### State transitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-003 | FR-039 | sent, paid, and a price change after send | each row's status and the EP-21 total | AT-001, AT-005 |

### Decision tables

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-004 | FR-039 | patient, provider, staff, stranger | 200, 403, 403, 401 (EP-42) | AT-002 |

### Error guessing

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-005 | FR-039 | a made-up cursor | 422 validation (BE-22) | AT-004 |

### Concurrency, idempotency, double-submit

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-006 | FR-039 | n/a | n/a | not tested: read-only list |

### Authorization and abuse

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-007 | FR-039 | another patient's orders in Ana's list | never (AE-037, AE-067) | AT-001 |

### Money, rounding, time zones

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-008 | FR-039 | the list total after a price change | equals the order page (EP-21) | AT-005 |

### Empty, huge and unicode data

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-009 | FR-039 | a 60-character practice name | wraps (S16 Edge data) | not tested: needs a browser |

## Edge-case coverage matrix

Every in-scope FR against every group: EDGE ids, or `n/a: <why>`. No blank cell.

| FR | partition | boundary | state | decision-table | error-guess | concurrency | authz | money-time | data-shape |
|---|---|---|---|---|---|---|---|---|---|
| FR-039 | EDGE-001 | EDGE-002 | EDGE-003 | EDGE-004 | EDGE-005 | EDGE-006 | EDGE-007 | EDGE-008 | EDGE-009 |

## Silent-success guards

Ways a test could pass while the feature is wrong (`references/silent-success.md`), and how these tests stop it.

| SS | How a test could pass while the feature is wrong | Tests at risk | Guard used in those tests |
|---|---|---|---|
| SS-01 | an endpoint returning every order passes "Ana sees her orders" | AT-001 | Ben's order exists and must be absent |
| SS-02 | a 403 for everyone passes the refusals | AT-002 | Ana's 200 is the live twin |
| SS-03 | a total from sent prices passes when nothing changed | AT-005 | a price change after send must show in the list |

## NFR and SC checks

| Id | Threshold (verbatim) | How measured | When |
|---|---|---|---|
| n/a | none: no NFR in M6.1 scope | n/a: earlier suites in make check | n/a |

## Demo smoke

| Step | What the person does | What they see | Re-checks |
|---|---|---|---|
| 1 | Ana signs in | Your orders, newest first | AT-001 |
| 2 | Ana opens an order | the order page | AT-001 |
| 3 | Carla signs in | the empty message | AT-003 |
| 4 | Dr. Chen opens /orders (unhappy) | the wrong-role message and Go to your home | AT-002 |
| 5 | Ana with many orders presses Show 25 more | the next orders below | AT-004 |

## Red run

- Command: `npx vitest run --dir tests/acceptance/M6.1 --reporter=verbose`
- Run at: 2026-10-11 13:52 CDT (UTC-0500) on f66c9e6 (plus the uncommitted test file) · exit code: 1
- Output file: `/var/folders/hy/jdyfzw1d74j_zxvpgy4bysm80000gp/T/M6.1-acceptance-red.txt`
- Runner summary: Tests 5 failed (5)
- Single-test proof: `-t 'M6.1_AT_001 '` runs one test; `-t 'M6.1_AT_999 '` exits 0 (Q-1)

| AT | Test | Why it fails (assertion, or missing: <name from an approved artifact>) | First failing line |
|---|---|---|---|
| AT-001 | `M6.1_AT_001 Ana signs in to Your orders …` | assertion: the root shows S15 instead of sending her to /orders | expected [ 302, 303, 307 ] to include 200 |
| AT-002 | `M6.1_AT_002 only a patient has an orders list …` | missing: EP-42 GET /api/orders | expected 404 to be 200 |
| AT-003 | `M6.1_AT_003 Carla, with no orders …` | missing: EP-42 | expected 404 to be 200 |
| AT-004 | `M6.1_AT_004 26 orders come 25 then 1 …` | missing: EP-42 | expected 404 to be 200 |
| AT-005 | `M6.1_AT_005 each listed total …` | missing: EP-42 (no list body) | list.body.data.find is not a function |

## Spec gaps and questions

| Q | Question | Recommended (and why) | Answer (verbatim) | Blocks | Status |
|---|---|---|---|---|---|
| Q-1 | Single-test filter exits 0 on no match | count passing ids in Done-when (M5 Q-5) | STANDING approval 2026-10-10 23:09 CDT | Done-when | answered |
| Q-2 | When does make check run M6.1? | M6.1-T001 adds test-acceptance-m6.1 | STANDING approval 2026-10-10 23:09 CDT | every AT | answered |

## Change log

| Date | Change | Ids | Why (approved artifact, or the human's exact words) |
|---|---|---|---|
| 2026-10-11 13:52 CDT (UTC-0500) | First draft; M5.2 AT-001 accepts S15 or the S16 redirect, never a 404 | all; M5.2 AT-001 | prd.md CQ-9: "go ahead with M5-R03, the patient order list"; STANDING approval 2026-10-10 23:09 CDT |
