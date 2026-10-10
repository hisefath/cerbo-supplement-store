---
milestone: M4
slug: tracer-bullet
artifact: acceptance
status: draft
written_by: define-acceptance (software-factory-kit 0.1)
written_at: 2026-10-10 11:56 CDT (UTC-0500)
base_sha: b72127a
inputs: "docs/product/prd.md@998ed94 (G1), docs/architecture/lld.md@5a984b8 (G3, D38 revised to Nuxt 4 per G3 Revise 2026-10-10 11:30), docs/architecture/hld.md@fea2e18 (G2), docs/design/screens.md@bff1dd4 (G-ux)"
tests: tests/acceptance/M4/
gate: G4
---

# M4 acceptance: each person signs in; a provider sends an order, the patient pays once, and the split is recorded and shown to the cent

## Scope

In-scope ids for M4, from the `## Milestone cut` row of `docs/product/prd.md` (Scope and Proves columns) and
what those FRs reach. Every count comes from the command listed under the table for that kind.

| Kind | Ids | Count |
|---|---|---|
| FR | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-017, FR-031, FR-035, FR-036, FR-039, FR-040, FR-041, FR-042, FR-043, FR-044, FR-050, FR-066, FR-067, FR-068 | 29 |
| AE | AE-001, AE-002, AE-003, AE-004, AE-005, AE-006, AE-007, AE-008, AE-009, AE-010, AE-011, AE-012, AE-013, AE-014, AE-015, AE-028, AE-031, AE-032, AE-037, AE-038, AE-039, AE-040, AE-041, AE-047, AE-063, AE-064, AE-065 | 27 |
| EC (PRD edge cases) | EC-1, EC-2, EC-3, EC-8, EC-9, EC-10, EC-11, EC-12, EC-13, EC-14 | 10 |
| NFR | NFR-001, NFR-004, NFR-006, NFR-007, NFR-008, NFR-009, NFR-010, NFR-011, NFR-012, NFR-014 | 10 |
| SC (Proves column) | none: the M4 Proves column lists AEs only | 0 |
| INV (hld.md §7) and LINV (lld.md §7) | INV-1, INV-2, INV-3, INV-4, INV-6, INV-7, LINV-2, LINV-3, LINV-4, LINV-5, LINV-6 | 11 |
| Screens and states | S1 Supplement order, S2 Your supplement order, S3 Paid orders, S4 Paid order breakdown, S8 Sign in, S9 Order notice | 6 |
| State machines and sequences | SM-1 Order lifecycle, SM-2 Payment attempt, SM-3 Idempotency key; SEQ-1 send, SEQ-2 pay, SEQ-3 audit, SEQ-7 sign in | 7 |

Counted with (one command per kind; pipes are fine here, never inside the table):

```sh
FR: grep -E '^\| M4 ' docs/product/prd.md | grep -oE 'FR-[0-9]{3}' | sort -u | wc -l
AE: grep -E '^\| M4 ' docs/product/prd.md | cut -d'|' -f5 | grep -oE 'AE-[0-9]{3}( to AE-[0-9]{3})?'   # ranges expanded by hand: 27
EC: grep -E '^- \*\*EC-' docs/product/prd.md | grep -E 'FR-0(0[1-9]|1[0-5]|17|31|35|36|39|4[0-4]|50|6[6-8])' | wc -l
NFR: chosen by subject (the order journey, sign-in, privacy, audit) from grep -E '^- \*\*NFR-' docs/product/prd.md
INV: grep -E '^\| INV-' docs/architecture/hld.md, kept where Basis cites an M4 FR; LINV: grep -E '^\| \*\*LINV-' docs/architecture/lld.md, kept where the rule acts in an M4 journey
```

Out of scope this milestone: FR-016, FR-018 to FR-030, FR-032 to FR-034, FR-037, FR-038, FR-045 to FR-049, FR-051 to FR-065, FR-069 (M5, M6, Later); INV-5, INV-8 to INV-10, LINV-1 (M5, M6).

## How these tests run

| Item | Value | Source |
|---|---|---|
| Framework | Vitest 5.0.1 with @nuxt/test-utils 4.3.2 (boots the real Nuxt 4 app per file) | package.json; AGENTS.md:9-11 |
| Run all M4 acceptance tests | `npx vitest run tests/acceptance/M4` | AGENTS.md:11 (`make test-acceptance`) |
| Run one test (for a task's Done-when) | `npx vitest run tests/acceptance/M4 -t M4_AT_007` plus a check that it ran (⚠ Q-5: Vitest exits 0 when -t matches nothing) | proven in Red run |
| Test database (safe to reset?) | `supplements_test` on 127.0.0.1:54329 (docker-compose.yml, tmpfs); yes: tests/acceptance/support/db.ts refuses any database whose name lacks "test" | docker-compose.yml:6-14; tests/acceptance/support/db.ts:16 |
| Database between tests | schema dropped and rebuilt from db/migrations per file (Q-4); every table emptied with identity restart before each test; files serialised by an advisory lock | tests/acceptance/support/db.ts, app.ts |
| Fakes at external boundaries | SEAM-3 payment stand-in via PAYMENT_STUB_MODE (succeed, decline, no_answer); SEAM-6 SCRYPT_COST; SEAM-5 sign-in through EP-15 with seeded accounts (Q-1) | lld.md §9 |
| Never faked (lld.md §9) | PostgreSQL 16 in every constraint, trigger, grant and race test; BE-6 Money; the component under test | lld.md §9 |
| Browser tool (e2e) | none → screen copy and layout are checked in the demo smoke, ⚠ Q-6 | package.json (no Playwright) |
| Contract validator | none → responses are checked field by field against openapi.yaml names; no schema validation run, ⚠ Q-6 | package.json |
| `make check` runs `tests/acceptance/` | no: `check` runs lint, types and the docs test only | Makefile:10-11, ⚠ Q-7 (→ G4) |

- **QA-owned.** Only `define-acceptance` edits `tests/acceptance/**`. `slice-tasks` never lists it in an `Owns:`.
  An implementer who believes a test is wrong writes that under `## Questions` in its `result.md` and stops.
- **Suites (recommendation, → Q-7 at G4, until WORKFLOW.md settles it).** While M4 is built these tests
  measure progress, so `make check` should not run them (every task would stay red); each task's Done-when runs
  only its own AT ids. When M4 merges they should join the regression suite `make check` runs. Today `make check`
  does not reach `tests/acceptance/` (Makefile:10-11). The change that adds them: a `test-acceptance-m4` prerequisite on `check` in the Makefile, made by the last M4 task (in its Owns via slice-tasks).
- **Test data.** Synthetic only: the PRD's fictional people (Dr. Maya Chen, Dr. Sam Lee, Ana Ruiz, Ben Ortiz, Carla Diaz, Omar Ortega, Sam Reyes, Dana Ito, Fran Fields), practices Willow Creek Wellness and Maple Grove Clinic, emails at @example.test, one shared test password.

## Traceability

| AT | Covers | Requirement (EARS, verbatim) | Given / When / Then (concrete values) | Technique | Level | Test (path::name) | Status |
|---|---|---|---|---|---|---|---|
| AT-001 | AE-001, FR-001, FR-002, FR-031 | FR-002: When a provider adds a product and a quantity to an order, the system shall show the line price, the order total and the provider's payout after the platform fee. | **Given** Willow Creek prices Vitamin D3 at $18.00 (10 in stock) and Magnesium Glycinate at $24.00 (5 in stock) **When** Dr. Chen adds 2 Vitamin D3 and 1 Magnesium Glycinate and sends **Then** the order is sent with lines $36.00 and $24.00, total $60.00, fee $0.45, payout $29.55, and one orders row in sent with sent_at | example | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_001` | red @ b72127a |
| AT-020 | FR-012, FR-011 | FR-012: The system shall compute the provider payout as the amount paid minus the item cost minus the platform fee. | **Given** Omega-3 at $30.00 (cost $15.00) **When** Dr. Chen sends 3 Omega-3 for Ben **Then** total $90.00, fee $0.68 (67.5 cents half-up), payout $44.32 | money-time | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_020` | red @ b72127a |
| AT-002 | AE-002, FR-003, EC-1 | FR-003: If a provider tries to send an order with no items or with a quantity below 1, then the system shall refuse to send it and name the missing or invalid line. | **Given** one order of 1 Vitamin D3 sends (twin) **When** Dr. Chen sends no lines, then a line of quantity 0 **Then** both get 422 /problems/validation and the orders count is unchanged | partition | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_002` | red @ b72127a |
| AT-003 | AE-003, FR-004, EC-2, INV-6 | FR-004: If an order's provider payout after the platform fee would be below $0.00, then the system shall refuse to send it and name the items priced below their floor. | **Given** 1 Magnesium Glycinate at the default $24.00 sends (twin), then its practice price is set to $12.00 = cost **When** Dr. Chen sends 1 Magnesium Glycinate **Then** 422 /problems/below-price-floor naming that product and no new order | boundary | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_003` | red @ b72127a |
| AT-004 | AE-004, FR-005 | FR-005: When a provider sends an order, the system shall show it to that patient with every item, quantity, price and the total due. | **Given** Dr. Chen sent Ana 2 Vitamin D3 and 1 Magnesium Glycinate **When** Ana opens the order **Then** she sees both items with quantities 2 and 1 at $18.00 and $24.00, total $60.00, practice Willow Creek Wellness, marked a test payment | example | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_004` | red @ b72127a |
| AT-015 | AE-015, FR-017 | FR-017: The system shall start every product at a default patient price of its cost plus a 50% margin until the practice changes it. | **Given** Willow Creek never priced Omega-3 (cost $15.00) and priced Vitamin D3 at $19.50 **When** Dr. Chen opens Ana's catalog **Then** Omega-3 shows $30.00 and Vitamin D3 $19.50 | decision-table | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_015` | red @ b72127a |
| AT-017 | AE-040, AE-041, FR-043, FR-044, EC-14, LINV-5 | FR-044: The system shall leave item names, quantities, amounts and health details out of every notice to a patient. | **Given** Dr. Chen sends Ana 2 Vitamin D3 **When** the notice is read by its token **Then** exactly one notice exists for Ana, it holds only practice_name Willow Creek Wellness and a sign_in_path, and no item name, amount or patient name | data-shape | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_017` | red @ b72127a |
| AT-021 | FR-008, FR-002 | FR-008: If a patient submits payment for an order that is already paid or already being paid, then the system shall show the existing payment result without charging again. | **Given** a Send with key K returned order 1001 **When** the same Send with K repeats, then K with 3 bottles, then a Send with no key **Then** the repeat returns order 1001 (one order in total), the changed body gets 422 /problems/idempotency-mismatch, the keyless one 400 /problems/idempotency-key-missing | concurrency | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_021` | red @ b72127a |
| AT-022 | FR-009, FR-001, LINV-3 | FR-009: If a person opens an order that belongs to neither them nor their practice, then the system shall show that no such order exists and reveal none of its contents. | **Given** Dr. Lee (Maple Grove) sends his own patient Carla an order (twin) **When** he opens Ana's catalog and sends an order for Ana (Willow Creek) **Then** both get 404 /problems/not-found and Ana has 0 orders | authz | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_022` | red @ b72127a |
| AT-018 | AE-063, FR-066 | FR-066: When a provider cancels a sent or payment-failed order, the system shall mark it cancelled and show its patient "This order was cancelled by your practice." | **Given** Ben's $30.00 order is sent and unpaid **When** Dr. Chen cancels it **Then** 200 with status cancelled, cancelled_at recorded, and Ben's view shows status cancelled | state | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_018` | red @ b72127a |
| AT-019 | AE-064, FR-067 | FR-067: If a provider tries to cancel an order whose checkout has started or that is paid, then the system shall refuse and leave the order unchanged. | **Given** cancelling Ben's sent order works (twin) and Ana has started checkout on her order **When** Dr. Chen cancels Ana's order **Then** 409 /problems/invalid-transition and Ana's order stays in_checkout | state | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_019` | red @ b72127a |
| AT-037 | LINV-4, FR-002 | FR-002: When a provider adds a product and a quantity to an order, the system shall show the line price, the order total and the provider's payout after the platform fee. | **Given** Dr. Chen lists Vitamin D3 twice (1 and 1) and Magnesium Glycinate once **When** she sends **Then** total $60.00 and two order_lines rows, Vitamin D3 with quantity 2 | data-shape | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_037` | red @ b72127a |
| AT-005 | AE-005, FR-006, FR-007, NFR-006 | FR-006: When a patient confirms payment for an order in checkout, the system shall mark the order paid and show the patient a receipt with the amount paid. | **Given** Ana's $60.00 order is in checkout **When** she confirms the test payment **Then** 201 receipt with $60.00 paid, paid_at and is_test_payment true, and the order is paid | example | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_005` | red @ b72127a |
| AT-006 | AE-006, FR-008, EC-3, INV-2 | FR-008: If a patient submits payment for an order that is already paid or already being paid, then the system shall show the existing payment result without charging again. | **Given** Ana paid with key K **When** she presses Pay again with K, then with a new key **Then** the same receipt comes back, then 409 /problems/invalid-transition; one succeeded attempt and four ledger lines | concurrency | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_006` | red @ b72127a |
| AT-013 | FR-008 | FR-008: If a patient submits payment for an order that is already paid or already being paid, then the system shall show the existing payment result without charging again. | **Given** Ana's order is in checkout **When** she pays without an Idempotency-Key **Then** 400 /problems/idempotency-key-missing, and paying with a key then succeeds (201) | error-guess | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_013` | red @ b72127a |
| AT-012 | FR-006 | FR-006: When a patient confirms payment for an order in checkout, the system shall mark the order paid and show the patient a receipt with the amount paid. | **Given** Ana's order is sent but checkout has not started **When** she pays **Then** 409 /problems/invalid-transition; after checkout the same payment succeeds (201) | state | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_012` | red @ b72127a |
| AT-007 | AE-007, FR-009, EC-9, INV-7, NFR-004 | FR-009: If a person opens an order that belongs to neither them nor their practice, then the system shall show that no such order exists and reveal none of its contents. | **Given** Ana can open her order (twin) **When** Ben opens a link to it **Then** 404 /problems/not-found with no item or amount in the body | authz | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_007` | red @ b72127a |
| AT-008 | AE-008, FR-009, LINV-3 | FR-009: If a person opens an order that belongs to neither them nor their practice, then the system shall show that no such order exists and reveal none of its contents. | **Given** Dr. Chen can open Ana's order (twin) **When** Dr. Lee of Maple Grove opens it **Then** 404 /problems/not-found | authz | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_008` | red @ b72127a |
| AT-038 | INV-2, LINV-6 | FR-008: If a patient submits payment for an order that is already paid or already being paid, then the system shall show the existing payment result without charging again. | **Given** Ana's order is in checkout **When** two payments with different keys arrive at the same moment **Then** one gets 201 and one 409, with one succeeded attempt and one patient_payment ledger line | concurrency | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_038` | red @ b72127a |
| AT-009 | AE-009, FR-010, FR-011, FR-012, LINV-2, INV-3 | FR-010: When an order is marked paid, the system shall record its split as item cost, provider payout and platform fee, each in whole cents. | **Given** Ana pays $60.00 for items costing $30.00 **When** the order is paid **Then** orders holds 6000, 3000, 45, 2955 cents and ledger_entries hold patient_payment 6000, item_cost 3000, provider_payout 2955, platform_fee 45 | example | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_009` | red @ b72127a |
| AT-010 | AE-010, FR-011 | FR-011: The system shall compute the platform fee once per order as 0.75% of the amount the patient paid, rounded half-up to the nearest cent. | **Given** Omega-3 priced $33.34 (cost $15.00) **When** Ana pays for 1 **Then** fee 25 cents (0.25005 rounded once) and payout $18.09 | example | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_010` | red @ b72127a |
| AT-011 | AE-011, FR-011, FR-012, EC-8 | FR-011: The system shall compute the platform fee once per order as 0.75% of the amount the patient paid, rounded half-up to the nearest cent. | **Given** Magnesium Glycinate costs $10.00 and is priced $14.00 **When** Ana pays for 1 **Then** fee 11 cents (10.5 half-up) and payout $3.89 | example | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_011` | red @ b72127a |
| AT-028 | AE-028, FR-031 | FR-031: The system shall record on every order its practice, provider, time sent and time paid. | **Given** Dr. Chen sends Ana an order **When** it is sent and later paid **Then** sent_at, practice and provider are recorded at send, paid_at is empty until payment and then not earlier than sent_at | money-time | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_028` | red @ b72127a |
| AT-031 | AE-031, FR-035, EC-10 | FR-035: If the payment step fails or does not answer, then the system shall leave the order unpaid and tell the patient that no money was taken. | **Given** the payment stand-in does not answer (PAYMENT_STUB_MODE=no_answer, SEAM-3) and Ana's $60.00 order is in checkout **When** she pays **Then** 502 /problems/payment-failed, order payment_failed with no paid amount, 0 ledger lines, one failed attempt | error-guess | integration | `tests/acceptance/M4/pay-failure.test.ts::M4_AT_031` | red @ b72127a |
| AT-040 | FR-035 | FR-035: If the payment step fails or does not answer, then the system shall leave the order unpaid and tell the patient that no money was taken. | **Given** the stand-in declines (PAYMENT_STUB_MODE=decline) and Ben's $30.00 order is in checkout **When** he pays **Then** 502 /problems/payment-failed, order payment_failed, one failed attempt with reason declined, 0 ledger lines | error-guess | integration | `tests/acceptance/M4/pay-failure.test.ts::M4_AT_040` | red @ b72127a |
| AT-014 | AE-013, FR-014, FR-036 | FR-014: When a platform reviewer opens a paid order, the system shall show each line's quantity, unit price and unit cost beside the order's amount paid, item cost, provider payout, platform fee, provider, practice and time paid. | **Given** Ana paid $60.00 for 2 Vitamin D3 and 1 Magnesium Glycinate **When** Omar opens Order 1001 **Then** $60.00 = $30.00 + $29.55 + $0.45, adds_up true, lines with unit cost $9.00 and $12.00, and the paid list holds only that order | example | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_014` | red @ b72127a |
| AT-023 | AE-047, FR-050, NFR-012 | FR-050: The system shall show platform staff an order number in place of any patient name or contact detail. | **Given** Ana's paid order **When** Omar opens its breakdown and the paid list **Then** both answer 200 and neither contains Ana Ruiz or her email | authz | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_023` | red @ b72127a |
| AT-024 | AE-032, FR-036, EC-11 | FR-036: The system shall record each paid line's unit cost as it stood when the order was paid. | **Given** Ana's order paid with Vitamin D3 at cost $9.00 **When** the product cost becomes $10.00 **Then** the breakdown still shows unit cost $9.00 and item cost $30.00 | money-time | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_024` | red @ b72127a |
| AT-025 | FR-050, INV-7 | FR-050: The system shall show platform staff an order number in place of any patient name or contact detail. | **Given** Omar can open Order 1001 (twin) **When** Sam (SRE), Dana (data analyst) and Ana open it **Then** each gets 403 /problems/forbidden with no amounts | authz | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_025` | red @ b72127a |
| AT-026 | AE-014, FR-015, EC-12, INV-4 | FR-015: If anyone tries to change or delete a paid order's recorded amounts, then the system shall refuse and keep the original amounts unchanged. | **Given** updating an unpaid order works (twin) **When** the paid order's fee is set to $0.00 **Then** the database refuses (tg_orders_paid_frozen) and the fee still reads 45 cents | state | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_026` | red @ b72127a |
| AT-027 | FR-015, INV-4, NFR-014 | FR-015: If anyone tries to change or delete a paid order's recorded amounts, then the system shall refuse and keep the original amounts unchanged. | **Given** connected as supplements_app (Q-3) the four ledger lines can be read (twin) **When** it updates or deletes a ledger line, deletes the order or deletes its lines **Then** each is refused with permission error 42501 | authz | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_027` | red @ b72127a |
| AT-029 | AE-012, FR-013, INV-1 | FR-013: If an order's item cost, provider payout and platform fee do not add up to the amount paid to the cent, then the system shall refuse to mark the order paid and list it for review. | **Given** a balanced paid order 6000 = 3000 + 2955 + 45 saves (twin) **When** another order is saved paid with item cost 2999 (one cent short) **Then** it is refused by ck_orders_split_balances and stays sent (Q-2) | decision-table | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_029` | red @ b72127a |
| AT-030 | LINV-2 | FR-012: The system shall compute the provider payout as the amount paid minus the item cost minus the platform fee. | **Given** a paid order with balanced ledger lines **When** its platform_fee line is replaced by 44 cents in one transaction **Then** the commit is refused (ct_ledger_entries_balance) and the fee line still reads 45 | money-time | integration | `tests/acceptance/M4/audit-order.test.ts::M4_AT_030` | red @ b72127a |
| AT-032 | AE-037, FR-039 | FR-039: When a person signs in with their own account, the system shall show only the pages their role allows: a patient their own orders, a provider their practice, platform staff the platform pages. | **Given** Omar can list paid orders (twin) **When** Ana signs in and asks for the same list **Then** her session shows role patient at Willow Creek and the list answers 403 /problems/forbidden | authz | integration | `tests/acceptance/M4/sign-in.test.ts::M4_AT_032` | red @ b72127a |
| AT-035 | FR-039, NFR-007 | FR-039: When a person signs in with their own account, the system shall show only the pages their role allows: a patient their own orders, a provider their practice, platform staff the platform pages. | **Given** Ana signs in with her password (twin, 200) **When** she uses a wrong password, and an unknown email is tried **Then** both get 401 /problems/sign-in-failed with the same title and no session cookie | partition | integration | `tests/acceptance/M4/sign-in.test.ts::M4_AT_035` | red @ b72127a |
| AT-033 | AE-038, FR-040 | FR-040: If someone who is not signed in opens an order, price, stock or dashboard page, then the system shall show the sign-in page and none of that page's contents. | **Given** Ana can open her order (twin) **When** nobody is signed in and asks for it, and for its page **Then** 401 /problems/unauthenticated with no contents, and the page answers 303 to /sign-in?next= | authz | integration | `tests/acceptance/M4/sign-in.test.ts::M4_AT_033` | red @ b72127a |
| AT-034 | AE-039, FR-041, NFR-008, EC-13 | FR-041: When a signed-in person has been inactive for 15 minutes, the system shall sign them out and show the sign-in page. | **Given** Dr. Chen's session was last seen 14 minutes ago (twin, still signed in) **When** it was last seen 16 minutes ago **Then** 401 /problems/unauthenticated and the session is ended | boundary | integration | `tests/acceptance/M4/sign-in.test.ts::M4_AT_034` | red @ b72127a |
| AT-036 | AE-040, FR-042, EC-13 | FR-042: When a patient signs in after opening an order notice, the system shall open the order the notice was about. | **Given** Dr. Chen sent Ana Order 1001 **When** Ana opens the notice **Then** its sign_in_path is /sign-in?next=… pointing at /orders/1001 and that page answers 200 html | example | integration | `tests/acceptance/M4/sign-in.test.ts::M4_AT_036` | red @ b72127a |
| AT-039 | AE-065, FR-068 | FR-068: If anyone tries to change the items or quantities of a sent order, then the system shall refuse and keep the order as sent. | **Given** Dr. Chen sent Ana 2 Vitamin D3 and can open the order (twin, 200) **When** she sends PATCH and PUT to the order with quantity 3 **Then** each answers 404 or 405 and the order still holds quantity 2 | state | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_039` | red @ b72127a |
| AT-041 | FR-004, FR-011, FR-012, INV-6 | FR-004: If an order's provider payout after the platform fee would be below $0.00, then the system shall refuse to send it and name the items priced below their floor. | **Given** Magnesium Glycinate costs $12.00 **When** it is priced $12.09 and sent, then priced $12.08 and sent **Then** the first is sent with fee $0.09 and payout $0.00, the second gets 422 /problems/below-price-floor naming it, one order in total | boundary | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_041` | red @ b72127a |
| AT-042 | FR-066 | FR-066: When a provider cancels a sent or payment-failed order, the system shall mark it cancelled and show its patient "This order was cancelled by your practice." | **Given** the stand-in does not answer and Ana's $18.00 order ended payment_failed **When** Dr. Chen cancels it **Then** 200 cancelled, no amount paid | state | integration | `tests/acceptance/M4/pay-failure.test.ts::M4_AT_042` | red @ b72127a |
| AT-043 | FR-006, FR-009, INV-7 | FR-006: When a patient confirms payment for an order in checkout, the system shall mark the order paid and show the patient a receipt with the amount paid. | **Given** Ana's order is sent and Ana can start checkout and pay (twin) **When** Ben starts checkout on it and pays it **Then** both get 404 /problems/not-found, no payment attempt exists, and Ana's own payment then succeeds (201) | authz | integration | `tests/acceptance/M4/pay-order.test.ts::M4_AT_043` | red @ b72127a |
| AT-044 | FR-066, FR-009, LINV-3 | FR-066: When a provider cancels a sent or payment-failed order, the system shall mark it cancelled and show its patient "This order was cancelled by your practice." | **Given** Dr. Lee can cancel his own patient Carla's order (twin) **When** he cancels Ana's sent order from Willow Creek **Then** 404 /problems/not-found and Ana's order stays sent | authz | integration | `tests/acceptance/M4/send-order.test.ts::M4_AT_044` | red @ b72127a |

## Edge cases

### Equivalence partitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-001 | FR-003 | lines: [] (no items) | 422 /problems/validation, no order (FR-003, EC-1, AE-002) | AT-002 |
| EDGE-002 | FR-003 | one line with quantity 0 | 422 /problems/validation, no order (FR-003, EC-1) | AT-002 |
| EDGE-003 | FR-003 | one line with quantity -1 | 422 /problems/validation (FR-003; same rule as quantity 0) | not tested: same input class as quantity 0 (EDGE-002), one validation rule in lld.md §4 |
| EDGE-004 | FR-039 | right password; wrong password for Ana; unknown email nobody@example.test | 200 with session; then 401 /problems/sign-in-failed with one shared title and no cookie (FR-039, NFR-007) | AT-035 |
| EDGE-005 | FR-009, FR-040 | viewer of Order 1001 is Ana; Ben; Dr. Lee; nobody | 200; 404 not-found; 404 not-found; 401 unauthenticated (FR-009, FR-040, EC-9) | AT-007, AT-008, AT-033 |
| EDGE-006 | FR-050, FR-014 | breakdown opened by Omar (operations); Sam Reyes (sre); Dana Ito (data analyst); Ana (patient) | 200; 403 forbidden for the other three (FR-050, INV-7) | AT-025 |

### Boundary values

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-007 | FR-004, FR-011, FR-012 | Magnesium Glycinate (cost $12.00) priced $12.00, $12.08 and $12.09 | $12.00 and $12.08 refused 422 below-price-floor (payout below $0.00); $12.09 sent with payout $0.00 (FR-004, FR-011, FR-012) | AT-003, AT-041 |
| EDGE-008 | FR-041 | session last seen 14 and 16 minutes ago | 14: still signed in; 16: 401 unauthenticated and session ended (FR-041, NFR-008) | AT-034 |
| EDGE-009 | FR-041 | session last seen exactly 15 minutes 0 seconds ago | ended ("after 15 minutes", NFR-008) | not tested: an exact-second boundary is flaky against the database clock; 14/16 brackets it (EDGE-008) |
| EDGE-010 | FR-011 | fee lands on half a cent: $14.00 order (10.5 c), 3 Omega-3 $90.00 (67.5 c) | 11 c and 68 c, half-up once per order (FR-011, EC-8) | AT-011, AT-020 |

### State transitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-011 | FR-006 | pay while the order is sent and checkout has not started | 409 /problems/invalid-transition (lld.md SM-1) | AT-012 |
| EDGE-012 | FR-006, FR-008 | pay a paid order again with a new key | 409 /problems/invalid-transition, still one succeeded attempt (SM-1, INV-2) | AT-006 |
| EDGE-013 | FR-066 | cancel a sent order; cancel a payment_failed order | 200 cancelled, patient sees cancelled (FR-066, SM-1) | AT-018, AT-042 |
| EDGE-014 | FR-067 | cancel an order in in_checkout | 409 /problems/invalid-transition, stays in_checkout (FR-067, AE-064) | AT-019 |
| EDGE-015 | FR-066 | cancel an already cancelled order | 409 /problems/invalid-transition (SM-1: cancelled is final) | not tested: no AE names it and nothing changes either way; recommend waiver |
| EDGE-016 | FR-035 | pay again after payment_failed | a new attempt from payment_failed (SM-1, D42) | not tested: no M4 AE names the retry; the failed attempt recorded no money (AT-031, AT-040), so a retry cannot double-charge; recommend waiver |
| EDGE-017 | FR-015 | change the fee of a paid order (as the table owner) | refused by tg_orders_paid_frozen, fee stays 45 c (FR-015, EC-12, INV-4) | AT-026 |
| EDGE-018 | FR-068 | PATCH or PUT a sent order to quantity 3 | 404 or 405, quantity stays 2 (FR-068, AE-065) | AT-039 |

### Decision tables

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-019 | FR-017 | practice price set ($19.50) / not set (Omega-3, cost $15.00) | $19.50 / $30.00 = cost plus 50 % (FR-017, AE-015) | AT-015 |
| EDGE-020 | FR-013 | paid order whose parts sum to the amount paid / one cent short | saved / refused by ck_orders_split_balances (FR-013, INV-1, Q-2) | AT-029 |

### Error guessing

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-021 | FR-035 | payment stand-in never answers (PAYMENT_STUB_MODE=no_answer) | 502 /problems/payment-failed, order payment_failed, 0 ledger lines, one failed attempt (FR-035, EC-10, lld.md §8) | AT-031 |
| EDGE-022 | FR-035 | payment stand-in declines | 502 /problems/payment-failed, failure_reason declined, 0 ledger lines (FR-035, lld.md §8) | AT-040 |
| EDGE-023 | FR-008 | Send or Pay without an Idempotency-Key header | 400 /problems/idempotency-key-missing (FR-008, D41) | AT-013, AT-021 |
| EDGE-024 | FR-008 | same key reused with a different body (3 bottles instead of 2) | 422 /problems/idempotency-mismatch (D41) | AT-021 |
| EDGE-025 | FR-040, FR-042 | open the order page /orders/1001 with no session | 303 to /sign-in?next=… (FR-040, FR-042) | AT-033, AT-036 |

### Concurrency, idempotency, double-submit

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-026 | FR-008 | Pay pressed twice with the same key | same receipt, one succeeded attempt, four ledger lines (FR-008, EC-3, INV-2) | AT-006 |
| EDGE-027 | FR-008 | two payments with different keys at the same moment | one 201, one 409, one succeeded attempt, one patient_payment line (LINV-6, INV-2) | AT-038 |
| EDGE-028 | FR-002, FR-008 | Send pressed twice with the same key | one order, same order id returned (D41) | AT-021 |

### Authorization and abuse

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-029 | FR-009 | Ben opens Ana's order; Dr. Lee opens it; Dr. Lee sends an order for Ana | 404 not-found each time, nothing created, no contents in the body (FR-009, LINV-3, EC-9) | AT-007, AT-008, AT-022 |
| EDGE-030 | FR-039, FR-050 | Ana asks for the operations paid-order list | 403 /problems/forbidden (FR-039, AE-037) | AT-032 |
| EDGE-031 | FR-006 | Ben starts checkout on and pays Ana's order | 404 not-found, no payment attempt; Ana then pays (FR-006, FR-009, INV-7) | AT-043 |
| EDGE-032 | FR-066 | Dr. Lee cancels Ana's order from another practice | 404 not-found, order stays sent (FR-009, LINV-3) | AT-044 |
| EDGE-033 | FR-001 | Dr. Lee opens the catalog for Ana, a Willow Creek patient | 404 not-found (FR-001 "a patient of their practice", LINV-3) | AT-022 |
| EDGE-034 | FR-015 | the app's database user updates or deletes a ledger line, deletes the order, deletes its lines | permission error 42501 each time (INV-4, Q-3) | AT-027 |
| EDGE-035 | FR-043, FR-044 | a forwarded notice opened by anyone | only practice_name and sign_in_path; no items, amounts or patient name (FR-044, EC-14, LINV-5) | AT-017 |
| EDGE-036 | FR-050, FR-014 | Omar opens the breakdown and the paid list | no "Ana Ruiz", no ana.ruiz@example.test (FR-050, NFR-012) | AT-023 |

### Money, rounding, time zones

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-037 | FR-010, FR-012 | $60.00 paid for $30.00 of cost | 6000 = 3000 + 2955 + 45 in orders and in four ledger lines (FR-010, FR-012, AE-009, INV-3) | AT-009 |
| EDGE-038 | FR-011 | $33.34 order (fee 25.005 c) | 25 c, rounded once per order, payout $18.09 (FR-011, AE-010) | AT-010 |
| EDGE-039 | FR-036, FR-014 | product cost raised from $9.00 to $10.00 after payment | paid order keeps $9.00 and item cost $30.00 (FR-036, EC-11) | AT-024 |
| EDGE-040 | FR-031 | sent_at, paid_at order | paid_at empty until paid, then not earlier than sent_at (FR-031, AE-028) | AT-028 |
| EDGE-041 | FR-012 | one ledger line replaced by 44 c in one transaction | commit refused by ct_ledger_entries_balance, fee stays 45 c (LINV-2) | AT-030 |
| EDGE-042 | FR-031 | times shown in the practice's time zone on S2 and S4 | ⚠ screens.md copy; no browser tool (→ Q-6) | not tested: ⚠ Q-6 open; stored times are timestamptz and checked by AT-028 |

### Empty, huge and unicode data

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-043 | FR-002 | Vitamin D3 listed twice (1 + 1) plus Magnesium Glycinate | one line with quantity 2, total $60.00 (LINV-4) | AT-037 |
| EDGE-044 | FR-043, FR-044 | notice body keys | exactly practice_name and sign_in_path (FR-044) | AT-017 |
| EDGE-045 | FR-007 | order view and receipt for a test payment | is_test_payment true on both (FR-007); the on-screen label is checked in demo step 5 (⚠ Q-6) | AT-004, AT-005 |
| EDGE-046 | FR-002 | quantity 1,000,000 of one product | refused when above units in stock (stock rule FR-025, M5) | not tested: the stock limit is FR-025 in M5; no M4 artifact sets a maximum quantity; recommend waiver for M4 |
| EDGE-047 | FR-001, FR-005 | product names with accents or 120 characters | shown as stored (FR-001, FR-005) | not tested: M4 products come only from the fixed seed catalog; product editing arrives in M6 |

## Edge-case coverage matrix

Every in-scope FR against every group: EDGE ids, or `n/a: <why>`. No blank cell.

| FR | partition | boundary | state | decision-table | error-guess | concurrency | authz | money-time | data-shape |
|---|---|---|---|---|---|---|---|---|---|
| FR-001 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-033 | n/a: no amount or time | EDGE-047 |
| FR-002 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | EDGE-028 | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | EDGE-043, EDGE-046 |
| FR-003 | EDGE-001, EDGE-002, EDGE-003 | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-004 | n/a: one input class | EDGE-007 | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-005 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | EDGE-047 |
| FR-006 | n/a: one input class | n/a: no numeric or time limit | EDGE-011, EDGE-012 | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-031 | n/a: no amount or time | n/a: no list or free-text input |
| FR-007 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | EDGE-045 |
| FR-008 | n/a: one input class | n/a: no numeric or time limit | EDGE-012 | n/a: no combined conditions | EDGE-023, EDGE-024 | EDGE-026, EDGE-027, EDGE-028 | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-009 | EDGE-005 | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-029 | n/a: no amount or time | n/a: no list or free-text input |
| FR-010 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | EDGE-037 | n/a: no list or free-text input |
| FR-011 | n/a: one input class | EDGE-007, EDGE-010 | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | EDGE-038 | n/a: no list or free-text input |
| FR-012 | n/a: one input class | EDGE-007 | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | EDGE-037, EDGE-041 | n/a: no list or free-text input |
| FR-013 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | EDGE-020 | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-014 | EDGE-006 | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-036 | EDGE-039 | n/a: no list or free-text input |
| FR-015 | n/a: one input class | n/a: no numeric or time limit | EDGE-017 | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-034 | n/a: no amount or time | n/a: no list or free-text input |
| FR-017 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | EDGE-019 | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-031 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | EDGE-040, EDGE-042 | n/a: no list or free-text input |
| FR-035 | n/a: one input class | n/a: no numeric or time limit | EDGE-016 | n/a: no combined conditions | EDGE-021, EDGE-022 | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-036 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | EDGE-039 | n/a: no list or free-text input |
| FR-039 | EDGE-004 | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-030 | n/a: no amount or time | n/a: no list or free-text input |
| FR-040 | EDGE-005 | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | EDGE-025 | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-041 | n/a: one input class | EDGE-008, EDGE-009 | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-042 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | EDGE-025 | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-043 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-035 | n/a: no amount or time | EDGE-044 |
| FR-044 | n/a: one input class | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-035 | n/a: no amount or time | EDGE-044 |
| FR-050 | EDGE-006 | n/a: no numeric or time limit | n/a: changes no order status | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-030, EDGE-036 | n/a: no amount or time | n/a: no list or free-text input |
| FR-066 | n/a: one input class | n/a: no numeric or time limit | EDGE-013, EDGE-015 | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | EDGE-032 | n/a: no amount or time | n/a: no list or free-text input |
| FR-067 | n/a: one input class | n/a: no numeric or time limit | EDGE-014 | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |
| FR-068 | n/a: one input class | n/a: no numeric or time limit | EDGE-018 | n/a: no combined conditions | n/a: no outbound call or multi-step write (lld.md §8) | n/a: no write a person can repeat | n/a: same endpoints as FR-009 and FR-040 rows | n/a: no amount or time | n/a: no list or free-text input |

## Silent-success guards

Ways a test could pass while the feature is wrong (`references/silent-success.md`), and how these tests stop it.

| SS | How a test could pass while the feature is wrong | Tests at risk | Guard used in those tests |
|---|---|---|---|
| SS-01 | only the status code is asserted, so an empty 201 stub passes | AT-001, AT-004, AT-005, AT-009, AT-014 | exact cents (6000, 3000, 2955, 45), exact line tuples, and the persisted row read fresh after the act |
| SS-02 | a refusal passes because the route does not exist yet (every unknown route is a 404) | AT-002, AT-003, AT-007, AT-008, AT-012, AT-019, AT-022, AT-025, AT-032, AT-033, AT-034, AT-035, AT-039, AT-041, AT-043, AT-044 | the allowed twin (own order, own practice, fresh session, right password, default price) succeeds first in the same test, then the refusal is asserted with its openapi.yaml problem type |
| SS-03 | a hard-coded fee (always 45 c) or payout passes the first example | AT-001, AT-009 | triangulation with different numbers: AT-020 ($90.00 → 68 c), AT-010 ($33.34 → 25 c), AT-011 ($14.00 → 11 c), AT-041 ($12.09 → 9 c, payout 0) |
| SS-04 | an idempotency stub that always creates a new record still returns 201 | AT-006, AT-021, AT-038 | counts rows after the act: one order, one succeeded attempt, four ledger lines, one patient_payment line |
| SS-05 | a privacy test passes because the body is empty or the page errors | AT-007, AT-017, AT-023, AT-025, AT-033 | the same request first returns 200 with the expected content (order id, practice name), then the body is checked for absent names, items and amounts; AT-017 asserts the exact key set |
| SS-06 | a database-guard test passes because the table or column is missing, so any error counts | AT-026, AT-027, AT-029, AT-030 | the twin write on an unpaid or balanced order succeeds first; AT-027 asserts code 42501, AT-029 the constraint name; the value is read back unchanged afterwards |
| SS-07 | the race test passes because the two payments happened one after the other by luck | AT-038 | both requests start together (Promise.all) and the outcome is checked by counts; a sequential run still must give one 201 and one 409, so the test cannot pass with two charges |
| SS-08 | the failure test passes because the payment route is missing | AT-031, AT-040, AT-042 | send and checkout return 201 and 200 first, then the exact 502 /problems/payment-failed body, then the order and attempt rows |

Laziest-stub check (reasoned test by test at step 7, not executed): 43 automated tests reasoned against a
hard-coded, always-200 and always-allow stub. Refusal or no-effect tests whose allowed twin runs first in the same
test (or that assert an exact refusal body): 26 of 26.

## NFR and SC checks

One row per in-scope NFR and per SC this milestone's Proves column claims.

| Id | Threshold (verbatim) | How measured | Level | When it runs | Status |
|---|---|---|---|---|---|
| NFR-001 | Each step of the order journey shows its result within 2 s at the 95th percentile at 60 requests per second. | load run of send, checkout, pay and view against the deployed pilot; p95 per step | measurement | report-milestone at G5 (timing asserts in tests are flaky) | planned: no load tool installed ⚠ Q-8 |
| NFR-004 | 0 people outside an order's patient, that patient's practice and the platform reviewers can see the order | AT-007, AT-008, AT-022, AT-023, AT-025, AT-033, AT-043, AT-044 | integration | every acceptance run | red @ b72127a |
| NFR-006 | 0 orders are lost after the patient has seen a receipt. | AT-005 and AT-009 read the paid order and its ledger fresh from the database after the receipt; backups and restore at G-live | integration, then measurement | every acceptance run; ship-milestone at G-live for restore | red @ b72127a |
| NFR-007 | 100 % of people who use the system sign in under their own personal account, with no shared accounts. | AT-032, AT-035 (session names its own user and role) | integration | every acceptance run | red @ b72127a |
| NFR-008 | A signed-in session ends after 15 minutes without activity. | AT-034 (14 vs 16 minutes) | integration | every acceptance run | red @ b72127a |
| NFR-009 | 100 % of traffic between people and the system is encrypted in transit. | request the pilot URL over http and https; http must redirect or refuse | measurement | ship-milestone at G-live | planned: needs the deployed host |
| NFR-010 | The system's logs hold 0 records containing a patient's name, an order's items or payment details. | run the M4 suite with server output captured, then search it for Ana Ruiz, Vitamin, 6000 | measurement | report-milestone at G5 | planned: the test server's log is not captured by the suite ⚠ Q-9 |
| NFR-011 | 0 records from real patients are used in the demo, examples or tests; every person is fictional. | the Done-when secret and synthetic-data search over tests/acceptance/M4 and this file | manual | each define-acceptance run | checked: fictional names and @example.test only |
| NFR-012 | Platform staff see 0 records containing a patient's name or contact details on any page or report. | AT-023 | integration | every acceptance run | red @ b72127a |
| NFR-014 | 100 % of privileged actions (role changes, stock adjustments, price changes, report exports) are logged with who acted and when, and reviewed by someone other than the actor. | AT-027 proves history rows cannot be altered by the app; none of the listed privileged actions ships in M4 | integration | every acceptance run; the action log itself in M5 and M6 | red @ b72127a (partial: the who-and-when log is n/a: M5, M6) |

## Demo smoke

5-10 steps a person can do on the running app in under 10 minutes, with synthetic data: the P1 journey, one
unhappy path and one access-denied check. `ship-milestone` turns it into `scripts/smoke.sh`; `write-demo-script`
builds on it.

| # | Step (as a person does it) | Expected (what they see) | Re-checks |
|---|---|---|---|
| 1 | Sign in as Dr. Maya Chen (S8) | her own name and practice, Willow Creek Wellness | AT-032, AT-035 |
| 2 | Open Ana Ruiz's supplement order (S1) | Vitamin D3 2000 IU $18.00 with 10 in stock, Magnesium Glycinate $24.00 with 5, Omega-3 $30.00 | AT-001, AT-015 |
| 3 | Add 2 Vitamin D3 and 1 Magnesium Glycinate, press Send | order sent, total $60.00 | AT-001, AE-001 |
| 4 | Open Ana's order notice (S9) | only the practice name and a sign-in link; no items or amounts | AT-017, AT-036 |
| 5 | Sign in as Ana from the notice (S2) | her order: both items, $60.00 due, the payment marked as a test payment | AT-004, AT-036, FR-007 |
| 6 | Start checkout and press Pay, then press Pay again | one receipt for $60.00; the second press shows the same receipt | AT-005, AT-006 |
| 7 | Sign in as Omar Ortega, open Paid orders (S3), then Order 1001 (S4) | $60.00 = $30.00 + $29.55 + $0.45; no patient name anywhere | AT-014, AT-023 |
| 8 | Unhappy path: as Ben Ortiz, open Ana's order address | no such order; nothing of hers is shown | AT-007 |
| 9 | Access denied: as Sam Reyes (SRE), open Order 1001's breakdown | not allowed; no amounts shown | AT-025 |

## Red run

- Command: `npx vitest run tests/acceptance/M4` (env from .env.example; PostgreSQL 16 test container up)
- Run at: 2026-10-10 11:56 CDT (UTC-0500) on b72127a · exit code: 1
- Output file: `$TMPDIR/M4-acceptance-red.txt` (this run: `/var/folders/hy/jdyfzw1d74j_zxvpgy4bysm80000gp/T/M4-acceptance-red.txt`)
- Runner summary: Test Files 5 failed (5) · Tests 43 failed (43)
- Single-test proof: `npx vitest run tests/acceptance/M4 -t M4_AT_041` → exit 1, output names M4_AT_041 (Tests 1 failed, 42 skipped) · `npx vitest run tests/acceptance/M4 -t M4_AT_999` → exit 0 (Tests 43 skipped): ⚠ Q-5, Vitest has no fail-on-empty option in --help

| AT | Test | Why it fails (assertion, or missing: <name from an approved artifact>) | First failing line |
|---|---|---|---|
| AT-001 | `send-order.test.ts > M4_AT_001 catalog shows practice prices and stock, and a sent order carries total, fee and payout (AE-001)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-002 | `send-order.test.ts > M4_AT_002 an order with no items is not sent (AE-002, FR-003)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-003 | `send-order.test.ts > M4_AT_003 a product priced at its cost is below the floor and the order is not sent (AE-003, FR-004)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-004 | `send-order.test.ts > M4_AT_004 the patient sees every item, quantity, price and the total due (AE-004, FR-005)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-005 | `pay-order.test.ts > M4_AT_005 Ana pays $60.00 with the test payment and gets a receipt (AE-005, FR-006, FR-007)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-006 | `pay-order.test.ts > M4_AT_006 pressing Pay twice with the same key charges once and shows the first result (AE-006, FR-008, INV-2)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-007 | `pay-order.test.ts > M4_AT_007 another patient cannot see Ana's order (AE-007, FR-009, INV-7)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-008 | `pay-order.test.ts > M4_AT_008 a provider from another practice cannot see Ana's order (AE-008, FR-009, LINV-3)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-009 | `pay-order.test.ts > M4_AT_009 a $60.00 payment records item cost $30.00, fee $0.45 and payout $29.55, with four ledger lines (AE-009, FR-010 to FR-012, LINV-2)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-010 | `pay-order.test.ts > M4_AT_010 a $33.34 order pays a fee of $0.25, rounded once per order (AE-010, FR-011)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-011 | `pay-order.test.ts > M4_AT_011 a $14.00 order with $10.00 of cost pays a $0.11 fee (half-up) and a $3.89 payout (AE-011, FR-011, FR-012)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-012 | `pay-order.test.ts > M4_AT_012 paying before checkout has started is refused (SM-1)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-013 | `pay-order.test.ts > M4_AT_013 a payment without an Idempotency-Key is refused (FR-008, D41)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-014 | `audit-order.test.ts > M4_AT_014 a reviewer sees the $60.00 = $30.00 + $29.55 + $0.45 breakdown with each line (AE-013, FR-014, FR-036)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-015 | `send-order.test.ts > M4_AT_015 a product the practice never priced shows at cost plus a 50% margin (AE-015, FR-017)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-017 | `send-order.test.ts > M4_AT_017 sending creates one notice that names only the practice (AE-040, AE-041, FR-043, FR-044)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-018 | `send-order.test.ts > M4_AT_018 a provider cancels a sent, unpaid order and the patient sees it cancelled (AE-063, FR-066)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-019 | `send-order.test.ts > M4_AT_019 an order whose checkout has started cannot be cancelled (AE-064, FR-067)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-020 | `send-order.test.ts > M4_AT_020 a second order gives different totals: 3 Omega-3 at $30.00 is $90.00, fee $0.68, payout $44.32 (triangulation)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-021 | `send-order.test.ts > M4_AT_021 pressing Send twice with the same key creates one order (FR-008 rule applied to EP-19, D41)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-022 | `send-order.test.ts > M4_AT_022 a provider cannot send an order for another practice's patient (FR-009, LINV-3)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-023 | `audit-order.test.ts > M4_AT_023 operations views and the order breakdown never show the patient's name or email (AE-047, FR-050, NFR-012)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-024 | `audit-order.test.ts > M4_AT_024 a later change to a product's cost does not change a paid order's recorded cost (AE-032, FR-036)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-025 | `audit-order.test.ts > M4_AT_025 the SRE and the data analyst cannot open an order breakdown (FR-050, INV-7)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-026 | `audit-order.test.ts > M4_AT_026 a paid order's fee cannot be changed afterwards (AE-014, FR-015, INV-4: tg_orders_paid_frozen)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-027 | `audit-order.test.ts > M4_AT_027 the app's database user can read but never change or delete ledger lines (Q-3, INV-4, NFR-014)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-028 | `pay-order.test.ts > M4_AT_028 the order records when it was sent and when it was paid (AE-028, FR-031)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-029 | `audit-order.test.ts > M4_AT_029 a paid order whose parts are one cent short of the amount paid is refused (Q-2, FR-013, INV-1: ck_orders_split_balances)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-030 | `audit-order.test.ts > M4_AT_030 an order's four ledger lines must balance when the transaction commits (Q-2, LINV-2: ct_ledger_entries_balance)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-031 | `pay-failure.test.ts > M4_AT_031 the order stays unpaid, no money is recorded and the patient is told no money was taken (AE-031, FR-035)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-032 | `sign-in.test.ts > M4_AT_032 Ana signs in, sees her own role and cannot open operations pages (AE-037, FR-039)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-033 | `sign-in.test.ts > M4_AT_033 nobody signed in sees nothing of an order; the page sends them to sign in (AE-038, FR-040)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-034 | `sign-in.test.ts > M4_AT_034 a session idle for 16 minutes is signed out; one idle for 14 minutes is not (AE-039, FR-041, NFR-008)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-035 | `sign-in.test.ts > M4_AT_035 a wrong password is refused with one message for both cases (FR-039, NFR-007)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-036 | `sign-in.test.ts > M4_AT_036 the notice leads to sign-in and then to the order it was about (AE-040, FR-042)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-037 | `send-order.test.ts > M4_AT_037 the same product listed twice becomes one line with the quantities added (LINV-4, FR-002)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-038 | `pay-order.test.ts > M4_AT_038 two payments with different keys pressed at the same moment charge once (LINV-6, INV-2)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-039 | `send-order.test.ts > M4_AT_039 a sent order's items and quantities cannot be changed through the app (AE-065, FR-068)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-040 | `pay-failure.test.ts > M4_AT_040 a declined card leaves the order unpaid with nothing recorded, the same as no answer (FM-1, FR-035)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-041 | `send-order.test.ts > M4_AT_041 the floor is a $0.00 payout: $12.08 for a $12.00-cost item is refused, $12.09 is sent with a $0.00 payout (FR-004, FR-011, FR-012)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-042 | `pay-failure.test.ts > M4_AT_042 the provider can cancel an order whose payment failed (FR-066, SM-1)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-043 | `pay-order.test.ts > M4_AT_043 another patient cannot start checkout on or pay Ana's order (FR-006, FR-009, INV-7)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |
| AT-044 | `send-order.test.ts > M4_AT_044 a provider from another practice cannot cancel Ana's order (FR-066, FR-009, LINV-3)` | missing: table practices (lld.md §1), so no migration exists yet | error: relation "practices" does not exist |

```text
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 where every cent went > M4_AT_014 a reviewer sees the $60.00 = $30.00 + $29.55 + $0.45 breakdown with each line (AE-013, FR-014, FR-036)
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 where every cent went > M4_AT_023 operations views and the order breakdown never show the patient's name or email (AE-047, FR-050, NFR-012)
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 where every cent went > M4_AT_024 a later change to a product's cost does not change a paid order's recorded cost (AE-032, FR-036)
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 where every cent went > M4_AT_025 the SRE and the data analyst cannot open an order breakdown (FR-050, INV-7)
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 the database refuses bad money (Q-2, Q-3) > M4_AT_026 a paid order's fee cannot be changed afterwards (AE-014, FR-015, INV-4: tg_orders_paid_frozen)
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 the database refuses bad money (Q-2, Q-3) > M4_AT_027 the app's database user can read but never change or delete ledger lines (Q-3, INV-4, NFR-014)
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 the database refuses bad money (Q-2, Q-3) > M4_AT_029 a paid order whose parts are one cent short of the amount paid is refused (Q-2, FR-013, INV-1: ck_orders_split_balances)
 FAIL  tests/acceptance/M4/audit-order.test.ts > US-3 the database refuses bad money (Q-2, Q-3) > M4_AT_030 an order's four ledger lines must balance when the transaction commits (Q-2, LINV-2: ct_ledger_entries_balance)
 FAIL  tests/acceptance/M4/pay-failure.test.ts > US-2 the payment step does not answer > M4_AT_031 the order stays unpaid, no money is recorded and the patient is told no money was taken (AE-031, FR-035)
 FAIL  tests/acceptance/M4/pay-failure.test.ts > US-2 the payment step does not answer > M4_AT_042 the provider can cancel an order whose payment failed (FR-066, SM-1)
 FAIL  tests/acceptance/M4/pay-failure.test.ts > US-2 the payment step does not answer > M4_AT_040 a declined card leaves the order unpaid with nothing recorded, the same as no answer (FM-1, FR-035)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_005 Ana pays $60.00 with the test payment and gets a receipt (AE-005, FR-006, FR-007)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_006 pressing Pay twice with the same key charges once and shows the first result (AE-006, FR-008, INV-2)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_013 a payment without an Idempotency-Key is refused (FR-008, D41)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_012 paying before checkout has started is refused (SM-1)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_007 another patient cannot see Ana's order (AE-007, FR-009, INV-7)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_008 a provider from another practice cannot see Ana's order (AE-008, FR-009, LINV-3)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_043 another patient cannot start checkout on or pay Ana's order (FR-006, FR-009, INV-7)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-2 the patient pays once > M4_AT_038 two payments with different keys pressed at the same moment charge once (LINV-6, INV-2)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-3 the split is recorded to the cent > M4_AT_009 a $60.00 payment records item cost $30.00, fee $0.45 and payout $29.55, with four ledger lines (AE-009, FR-010 to FR-012, LINV-2)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-3 the split is recorded to the cent > M4_AT_010 a $33.34 order pays a fee of $0.25, rounded once per order (AE-010, FR-011)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-3 the split is recorded to the cent > M4_AT_011 a $14.00 order with $10.00 of cost pays a $0.11 fee (half-up) and a $3.89 payout (AE-011, FR-011, FR-012)
 FAIL  tests/acceptance/M4/pay-order.test.ts > US-3 the split is recorded to the cent > M4_AT_028 the order records when it was sent and when it was paid (AE-028, FR-031)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_001 catalog shows practice prices and stock, and a sent order carries total, fee and payout (AE-001)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_020 a second order gives different totals: 3 Omega-3 at $30.00 is $90.00, fee $0.68, payout $44.32 (triangulation)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_002 an order with no items is not sent (AE-002, FR-003)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_003 a product priced at its cost is below the floor and the order is not sent (AE-003, FR-004)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_004 the patient sees every item, quantity, price and the total due (AE-004, FR-005)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_015 a product the practice never priced shows at cost plus a 50% margin (AE-015, FR-017)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_017 sending creates one notice that names only the practice (AE-040, AE-041, FR-043, FR-044)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_021 pressing Send twice with the same key creates one order (FR-008 rule applied to EP-19, D41)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_022 a provider cannot send an order for another practice's patient (FR-009, LINV-3)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_018 a provider cancels a sent, unpaid order and the patient sees it cancelled (AE-063, FR-066)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_019 an order whose checkout has started cannot be cancelled (AE-064, FR-067)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_037 the same product listed twice becomes one line with the quantities added (LINV-4, FR-002)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_039 a sent order's items and quantities cannot be changed through the app (AE-065, FR-068)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_041 the floor is a $0.00 payout: $12.08 for a $12.00-cost item is refused, $12.09 is sent with a $0.00 payout (FR-004, FR-011, FR-012)
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_044 a provider from another practice cannot cancel Ana's order (FR-066, FR-009, LINV-3)
 FAIL  tests/acceptance/M4/sign-in.test.ts > US-8 sign in as myself > M4_AT_032 Ana signs in, sees her own role and cannot open operations pages (AE-037, FR-039)
 FAIL  tests/acceptance/M4/sign-in.test.ts > US-8 sign in as myself > M4_AT_035 a wrong password is refused with one message for both cases (FR-039, NFR-007)
 FAIL  tests/acceptance/M4/sign-in.test.ts > US-8 sign in as myself > M4_AT_033 nobody signed in sees nothing of an order; the page sends them to sign in (AE-038, FR-040)
 FAIL  tests/acceptance/M4/sign-in.test.ts > US-8 sign in as myself > M4_AT_034 a session idle for 16 minutes is signed out; one idle for 14 minutes is not (AE-039, FR-041, NFR-008)
 FAIL  tests/acceptance/M4/sign-in.test.ts > US-8 sign in as myself > M4_AT_036 the notice leads to sign-in and then to the order it was about (AE-040, FR-042)
error: relation "practices" does not exist
 Test Files  5 failed (5)
      Tests  43 failed (43)
$ npx vitest run tests/acceptance/M4 -t M4_AT_041   # exit 1
 FAIL  tests/acceptance/M4/send-order.test.ts > US-1 build and send a supplement order > M4_AT_041 the floor is a $0.00 payout: $12.08 for a $12.00-cost item is refused, $12.09 is sent with a $0.00 payout (FR-004, FR-011, FR-012)
      Tests  1 failed | 42 skipped (43)
$ npx vitest run tests/acceptance/M4 -t M4_AT_999   # exit 0
      Tests  43 skipped (43)
```

## Spec gaps and questions

Pass 1, 2026-10-10 11:56 CDT (UTC-0500). One question at a time, each with a recommendation; at most 5 asked per pass, highest cost
of a wrong guess first. Unasked gaps stay here as ⚠.

| Q | Question | Recommended (and why) | Answer (verbatim) | Blocks | Status |
|---|---|---|---|---|---|
| Q-1 | How are passwords stored, so tests can seed accounts that sign in through EP-15? | scrypt$N$r$p$salt-base64$hash-base64 with Node's built-in scrypt and a 64-byte hash; test cost N=1024 through SEAM-6 SCRYPT_COST, because lld.md names scrypt but not the stored format | "yes" | AT-032 to AT-036, every signIn | answered → LLD catch-up after G4 (design-lld) |
| Q-2 | Is FR-013 (the split adds up) proved at the database, since no API can write an unbalanced order? | yes: ck_orders_split_balances on orders and the commit-time ct_ledger_entries_balance (LINV-2), each tested by a direct write, because lld.md §7 names both enforcers | "yes" | AT-029, AT-030 | answered → LLD catch-up after G4 (design-lld) |
| Q-3 | Which database users exist and what may the app's user do? | supplements_owner runs migrations; supplements_app may only INSERT and SELECT on history tables and never DELETE orders or lines, because INV-4 names grants but not the role names | "yes" | AT-027 | answered → LLD catch-up after G4 (design-lld) |
| Q-4 | Where do migrations live and how are they run? | plain SQL in db/migrations/*.sql, applied with npx node-pg-migrate up -m db/migrations; tests drop and rebuild the schema per file, because D39 picks the tool but not the path | "yes" | every AT (schema) | answered → LLD catch-up after G4 (design-lld) |
| Q-5 | Vitest exits 0 when -t matches no test, so a task's Done-when could pass with zero tests. How should Done-when prove its test ran? | run it with --reporter=json --outputFile and require numPassedTests above 0 (or grep the output for the AT id), because Vitest 5.0.1 --help lists no fail-on-empty option | not asked | every task Done-when | ⚠ open (→ G4) |
| Q-6 | No browser tool or OpenAPI validator is installed. Are screen copy, the test-payment label (FR-007), time zones and response shapes left to the demo smoke and field-by-field checks for M4? | yes for M4; add Playwright when M6 adds screens with more state, because adding a tool is an Ask-first dependency | not asked | EDGE-042, EDGE-045, demo smoke steps 1-9 | ⚠ open (→ G4) |
| Q-7 | Should make check run tests/acceptance/? | not while M4 is built; the last M4 task adds a test-acceptance prerequisite to check in the Makefile, because progress tests kept red inside the gate teach the team to ignore red | not asked | Suites | ⚠ open (→ G4) |
| Q-8 | NFR-001 needs a load tool to measure p95 at 60 requests per second. Which one, and is it installed at G5? | measure at G5 with a pinned load tool added after your yes (a new devDependency), because timing asserts in tests are flaky | not asked | NFR-001 | ⚠ open (→ G4) |
| Q-9 | NFR-010 (no names, items or payment details in logs) needs the server's log output. Capture it at G5 and search it? | yes: the G5 verifier runs the suite with server output saved and searches it, because the test harness does not expose the server log | not asked | NFR-010 | ⚠ open (→ G4) |

## Change log

| Date | Change | Ids | Why (approved artifact, or the human's exact words) |
|---|---|---|---|
| 2026-10-10 11:56 CDT (UTC-0500) | First draft | all | G1 prd.md@998ed94, G2 hld.md@fea2e18, G-ux screens.md@bff1dd4, G3 lld.md@5a984b8 (Revise "a"); Q-1 to Q-4 answered "yes" |
