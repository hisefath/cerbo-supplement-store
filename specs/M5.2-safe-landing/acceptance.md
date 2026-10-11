---
milestone: M5.2
slug: safe-landing
artifact: acceptance
status: draft
written_by: define-acceptance (software-factory-kit 0.1)
written_at: 2026-10-11 09:36 CDT (UTC-0500)
base_sha: c956959
inputs: "docs/product/prd.md (CQ-5, G1), docs/architecture/lld.md (Site root and safe landing, G3), docs/design/screens.md S15 + Global conventions (G-ux), docs/design/flows.md F7"
tests: tests/acceptance/M5.2/
gate: G4
---

# M5.2 acceptance: safe landing

## Scope

| Id | Kind | Text (short) | Source |
|---|---|---|---|
| FR-039 | FR | a signed-in person sees only the pages their role allows, and lands on them | prd.md M5.2 row |
| FR-058 | FR | a wrong-role operations page refuses and shows none of its contents | prd.md M5.2 row |
| AE-038 | AE | a person who is not signed in is sent to sign in | prd.md M5.2 row |

Counts: `grep -E '^\| M5\.2 ' docs/product/prd.md | grep -oE '(FR|AE)-[0-9]{3}' | sort -u | wc -l` → 3.
Out of scope this milestone: the patient order list (M5-R03); the M6 pages that will become the SRE's and analyst's work pages.

## How these tests run

| Item | Value | Source |
|---|---|---|
| Framework | Vitest 5 with @nuxt/test-utils | tests/acceptance/support/app.ts |
| Run all | `npx vitest run tests/acceptance/M5.2` | AGENTS.md acceptance command |
| Run one test (for a task's Done-when) | `npx vitest run tests/acceptance/M5.2 -t 'M5.2_AT_001 '` (exits 0 when no test matches: Q-1) | Red run |
| Test database (safe to reset?) | yes: `supplements_test` on the throwaway container | tests/acceptance/support/db.ts:10-19 |
| Suites | make check does not run M5.2 until M5.2-T001 adds it (Q-2) | Makefile |

## Traceability

| AT | Covers | Requirement (EARS, verbatim) | Given / When / Then (concrete values) | Technique | Level | Test (path::name) | Status |
|---|---|---|---|---|---|---|---|
| AT-001 | FR-039 | FR-039: When a person signs in with their own account, the system shall show only the pages their role allows: a patient their own orders, a provider their practice, platform staff the platform pages. | **Given** Sam (site reliability), Dana (data analyst) and Ana (patient), whose roles have no work page yet **When** each opens the site root **Then** 200 with "Welcome, <name>" and the S15 copy for their role | partition | integration | `tests/acceptance/M5.2/landing.test.ts::M5.2_AT_001` | red @ c956959 |
| AT-002 | FR-039 | FR-039 (as above), flows.md F7 step 2 | **Given** Dr. Chen, Omar and Fran **When** each opens the site root **Then** a redirect to /practice/dashboard, /ops/orders, /ops/orders, and that page answers 200 | example | integration | `tests/acceptance/M5.2/landing.test.ts::M5.2_AT_002` | green: pins the role homes that exist |
| AT-003 | AE-038, FR-039 | screens.md Global conventions "Page not found (M5.2)" | **Given** Dr. Chen signed in **When** she opens /no-such-page **Then** 404 with "We couldn't find that page" and a "Go to your home" link to /; a stranger gets 303 to sign-in | error-guessing | integration | `tests/acceptance/M5.2/landing.test.ts::M5.2_AT_003` | red @ c956959 |
| AT-004 | FR-058, FR-039 | screens.md S8 Permission denied "Your account can't open that page. Here is your own work." and Global conventions "Wrong role (M5.2)" | **Given** Ana and Dr. Chen **When** each opens /practice/dashboard **Then** Dr. Chen's page has no home link; Ana's shows the provider-only message and a "Go to your home" link | decision-table | integration | `tests/acceptance/M5.2/landing.test.ts::M5.2_AT_004` | red @ c956959 |
| AT-005 | FR-039 | FR-039 (as above); screens.md S15 Empty "no role" (M5.2 review R2) | **Given** Nora, whose account has no role **When** she opens the site root **Then** 200, "Welcome, Nora None" and "Your account has no role yet. Contact platform support to get access." | partition | integration | `tests/acceptance/M5.2/landing.test.ts::M5.2_AT_005` | red (review R2) |
| AT-006 | FR-041, FR-039 | FR-041: When a signed-in person has been inactive for 15 minutes, the system shall sign them out and show the sign-in page. With screens.md Global conventions "Sign out" | **Given** Dr. Chen signed in **When** she opens her dashboard, presses Sign out (EP-16) and opens the sign-in page it sends her to **Then** the frame had a "Sign out" button, her session is gone (401), and the sign-in page says "You signed out."; a stranger's sign-in page has no Sign out button | example | integration | `tests/acceptance/M5.2/sign-out.test.ts::M5.2_AT_006` | red (fix/sign-out-button) |

## Edge cases

### Equivalence partitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-001 | FR-039 | roles with a work page (provider, operations specialist, finance lead) and roles without (patient, site reliability, data analyst) | first: straight to the page; second: S15 (flows.md F7 2, 2c) | AT-001, AT-002 |

### Boundary values

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-002 | FR-039 | n/a | n/a | not tested: no numeric input on these pages |

### State transitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-003 | FR-039 | signed out, then signed in, opening the root | sign-in first, then the role's home (F7) | AT-002, AT-003 |

### Decision tables

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-004 | FR-058 | right role vs wrong role on the same page | right: the page; wrong: message plus "Go to your home" (S8) | AT-004 |

### Error guessing

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-005 | FR-039 | a mistyped or old address | 404 "We couldn't find that page" with a way home (Global conventions) | AT-003 |

### Concurrency, idempotency, double-submit

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-006 | FR-039 | n/a | n/a | not tested: no write on these pages |

### Authorization and abuse

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-007 | FR-058 | the home link or root redirect pointing off-site | only fixed paths (lld.md Site root) | AT-002 |

### Money, rounding, time zones

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-008 | FR-039 | n/a | n/a | not tested: no money on these pages |

### Empty, huge and unicode data

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-009 | FR-039 | a 60-character name on S15 | wraps inside the band (S15 Edge data) | not tested: needs a browser |

## Edge-case coverage matrix

Every in-scope FR against every group: EDGE ids, or `n/a: <why>`. No blank cell.

| FR | partition | boundary | state | decision-table | error-guess | concurrency | authz | money-time | data-shape |
|---|---|---|---|---|---|---|---|---|---|
| FR-039 | EDGE-001 | EDGE-002 | EDGE-003 | n/a: one rule | EDGE-005 | EDGE-006 | EDGE-007 | EDGE-008 | EDGE-009 |
| FR-058 | n/a: covered by EDGE-001 | n/a: no input | n/a: no state | EDGE-004 | n/a: covered by EDGE-005 | n/a: no write | EDGE-004 | n/a: no money | n/a: no input |

## Silent-success guards

Ways a test could pass while the feature is wrong (`references/silent-success.md`), and how these tests stop it.

| SS | How a test could pass while the feature is wrong | Tests at risk | Guard used in those tests |
|---|---|---|---|
| SS-01 | a 200 page that is empty | AT-001 | the exact S15 title and copy per role |
| SS-02 | a home link present on every page, refusal or not | AT-004 | the allowed twin (Dr. Chen) must not show it |
| SS-03 | the 404 page asked for as JSON gives a JSON error | AT-003 | fetched as a browser does (accept text/html) |

## NFR and SC checks

| Id | Threshold (verbatim) | How measured | When |
|---|---|---|---|
| n/a | none: no NFR in M5.2 scope | n/a: covered by M4 to M5.1 checks in make check | n/a |

## Demo smoke

| Step | What the person does | What they see | Re-checks |
|---|---|---|---|
| 1 | Sam signs in | "Welcome, Sam Reyes" and what will appear here | AT-001 |
| 2 | Ana signs in from the root | her home: orders open from the practice's message | AT-001 |
| 3 | Dr. Chen signs in | her dashboard | AT-002 |
| 4 | Dr. Chen opens /no-such-page | "We couldn't find that page", Go to your home | AT-003 |
| 5 | Ana opens the practice dashboard (unhappy) | the provider-only message and Go to your home | AT-004 |

## Red run

- Command: `npx vitest run tests/acceptance/M5.2 --reporter=verbose`
- Run at: 2026-10-11 09:36 CDT (UTC-0500) on c956959 (plus the uncommitted M5.2 test file) · exit code: 1
- Output file: `/var/folders/hy/jdyfzw1d74j_zxvpgy4bysm80000gp/T/M5.2-acceptance-red.txt`
- Runner summary: Tests 3 failed / 1 passed (4); AT-002 is a green pin (Q-1 pattern from M5): with ROLE_HOME pointing at a missing page it would fail.
- Single-test proof: `-t 'M5.2_AT_001 '` runs one test; `-t 'M5.2_AT_999 '` exits 0 (Q-1)

| AT | Test | Why it fails (assertion, or missing: <name from an approved artifact>) | First failing line |
|---|---|---|---|
| AT-001 | `M5.2_AT_001 a role with no work page yet …` | assertion: redirected to a missing page | sam.reyes@example.test: expected 302 to be 200 |
| AT-003 | `M5.2_AT_003 an address with no page …` | missing: FE-26 ErrorPage | expected … to match /We couldn(&#39;/')t find that page/ |
| AT-004 | `M5.2_AT_004 a wrong-role page …` | assertion: no home link after the wrong-role message (FE-23) | expected … to match the Go to your home link |

## Spec gaps and questions

| Q | Question | Recommended (and why) | Answer (verbatim) | Blocks | Status |
|---|---|---|---|---|---|
| Q-1 | Single-test filter exits 0 on no match | count passing ids in Done-when (M5 Q-5) | STANDING approval 2026-10-10 23:09 CDT | Done-when | answered |
| Q-2 | When does make check run M5.2? | M5.2-T001 adds test-acceptance-m5.2 | STANDING approval 2026-10-10 23:09 CDT | every AT | answered |

## Change log

| Date | Change | Ids | Why (approved artifact, or the human's exact words) |
|---|---|---|---|
| 2026-10-11 09:36 CDT (UTC-0500) | First draft | all | prd.md CQ-5: "also everytime i log in, i get 404s. i dont reroute safely to a homepage, or have any info like i dont have access or get a link to a page i should be reaching, etc. lets fix that" |
| 2026-10-11 09:51 CDT | Review pass 1: AT-002 checks the landing page is not a refusal (R1); AT-004 adds Fran on stock adjustments (R3, FR-058); AT-005 the no-role account (R2) | AT-002, AT-004, AT-005 | M5.2-pass1 R1, R2, R3; STANDING approval 2026-10-10 23:09 CDT |
| 2026-10-11 11:07 CDT | Re-run (M6 acceptance Q-11): AT-001 keeps Ana only; Sam and Dana leave it because M6 gives them work pages (/ops/system, /ops/health), which M6 AT-030 checks; the no-role case stays in AT-005 | AT-001 | M6 acceptance Q-11 recommendation; STANDING approval 2026-10-10 23:09 CDT |
| 2026-10-11 14:16 CDT | Re-run (M6.1-pass1 R1): AT-001 also refuses a landing on sign-in or on a refusal page | AT-001 | M6.1-pass1 R1; STANDING approval 2026-10-10 23:09 CDT |
| 2026-10-11 16:28 CDT | Fix track: AT-006 sign out (screens.md Global conventions) | AT-006 | "theres no logout button, please make one" |
