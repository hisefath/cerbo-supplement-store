---
milestone: M6
slug: measurement-and-operations
artifact: acceptance
status: draft
written_by: define-acceptance (software-factory-kit 0.1)
written_at: 2026-10-11 10:36 CDT (UTC-0500)
base_sha: 1a9545b
inputs: "docs/product/prd.md@97e8186 (G1), docs/architecture/lld.md@97e8186 (G3), docs/architecture/hld.md@968279b (G2), docs/design/screens.md@97e8186 (G-ux)"
tests: tests/acceptance/M6/
gate: G4
---

# M6 acceptance: platform health, volume report, financial report, operations roles, access log and system health

## Scope

In-scope ids for M6, from the `## Milestone cut` row of `docs/product/prd.md` (Scope and Proves columns) and
what those FRs reach. Every count comes from the command listed under the table for that kind.

| Kind | Ids | Count |
|---|---|---|
| FR | FR-032, FR-048, FR-049, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059, FR-060, FR-061, FR-062, FR-063, FR-064, FR-065 | 18 |
| AE | AE-029, AE-045, AE-046, AE-048, AE-049, AE-050, AE-051, AE-052, AE-053, AE-054, AE-055, AE-056, AE-057, AE-058, AE-059, AE-060, AE-061, AE-062 | 18 |
| EC (PRD edge cases) | EC-15, EC-16 | 2 |
| NFR | NFR-010, NFR-012, NFR-013, NFR-014 | 4 |
| SC (Proves column) | SC-001, SC-002, SC-003 | 3 |
| INV (hld.md §7) and LINV (lld.md §7) | INV-1, INV-4, INV-7, INV-9, INV-10 (no LINV: none cites an M6 FR) | 5 |
| Screens and states | S10 Platform health, S11 Financial report, S12 Operations access, S13 Access log, S14 System health, S15 Your home (role landing), S4 Paid order breakdown (wrong-role copy for the data analyst and SRE) | 7 |
| State machines and sequences | SEQ-8, SEQ-9, SEQ-10, SEQ-11, SEQ-12 (no state machine: M6 adds none; SM-1 is touched only by carried D85) | 5 |

Counted with (one command per kind; pipes are fine here, never inside the table):

```sh
FR:  grep '^| M6 ' docs/product/prd.md | grep -oE 'FR-[0-9]{3}' | sort -u | wc -l                                   # 18
AE:  grep -oE '^- \*\*AE-(029|045|046|04[89]|05[0-9]|06[0-2])\*\*' docs/product/prd.md | wc -l                         # 18 (the row says "AE-048 to AE-062")
EC:  grep -E '^- \*\*EC-[0-9]+\*\*' docs/product/prd.md | grep -E 'FR-0(32|4[89]|5[1-9]|6[0-5])' | grep -oE '^- \*\*EC-[0-9]+' | wc -l   # 2
NFR: grep -oE '^- \*\*NFR-01[0234]\*\*' docs/product/prd.md | wc -l                                                     # 4 (job: NFR-013, NFR-014; plus NFR-010, NFR-012, whose subject is an M6 surface)
SC:  grep '^| M6 ' docs/product/prd.md | grep -oE 'SC-[0-9]{3}' | sort -u | wc -l                                   # 3
INV: sed -n '/^## 7. Invariants/,/^## 8/p' docs/architecture/lld.md | grep -cE '^\| INV-(1|4|7|9|10) '                 # 5
```

Out of scope this milestone: every FR outside the M6 row. Carried M5 design decisions D83 (input bounds) and D85
(invalid-transition members) have tests here without an M6 FR (⚠ Q-13); D84 (row lock strength) has none.
NFR-001 and NFR-005 are what S14 reports on, but their subject is the order journey; they are measured at G-live,
not here.

## How these tests run

| Item | Value | Source |
|---|---|---|
| Framework | Vitest 5.0.1 with @nuxt/test-utils 4.3.2 (real Nuxt server per file, HTTP like a browser) | package.json:25,30; AGENTS.md Commands |
| Run all M6 acceptance tests | `npx vitest run tests/acceptance/M6` | AGENTS.md Commands ("Acceptance tests") |
| Run one test (for a task's Done-when) | `npx vitest run tests/acceptance/M6 -t 'M6_AT_007 '` (exits 0 when nothing matches: count the ids, ⚠ Q-2) | AGENTS.md Commands; proven in Red run |
| Test database (safe to reset?) | `supplements_test` on 127.0.0.1:54329, a tmpfs throwaway container; yes | tests/acceptance/support/db.ts:11-15; docker-compose.yml |
| Database between tests | schema rebuilt from db/migrations once per file; every table truncated with identities restarted before each test; one file at a time through advisory lock 424242 | tests/acceptance/support/db.ts:36-89; tests/acceptance/support/app.ts:15-28 |
| Fakes at external boundaries | SEAM-3 payment stub (`PAYMENT_STUB_MODE=succeed`); SEAM-5 sign-in through EP-15; SEAM-6 low scrypt cost; SEAM-7 uptime monitor = inserted `health_pings` slots or a direct EP-40 call | lld.md §9; tests/acceptance/support/app.ts:10-14 |
| Never faked (lld.md §9) | PostgreSQL 16 in every constraint, grant and concurrency test; BE-6 Money | lld.md §9 |
| Browser tool (e2e) | none (`setup({ browser: false })`); screens are checked in the server-rendered HTML by `screens.md` copy | tests/acceptance/support/app.ts:24 |
| Contract validator | none; response shapes are asserted field by field from `openapi.yaml` | lld.md Q-4 |
| `make check` runs `tests/acceptance/` | partly: M4, M5, M5.1 and M5.2, not M6, ⚠ Q-1 (→ G4) | Makefile:12 (`check:` line) |

- **QA-owned.** Only `define-acceptance` edits `tests/acceptance/**`. `slice-tasks` never lists it in an `Owns:`.
  An implementer who believes a test is wrong writes that under `## Questions` in its `result.md` and stops.
- **Suites (recommendation, → Q-1 at G4, until WORKFLOW.md settles it).** While M6 is built these tests
  measure progress, so `make check` should not run them (every task would stay red); each task's Done-when runs
  only its own AT ids. When M6 merges they should join the regression suite `make check` runs. Today `make check`
  does reach `tests/acceptance/` for M4, M5, M5.1 and M5.2 only (Makefile:12 and the `test-acceptance-m5.2` target). The change that adds
  them: a `test-acceptance-m6: npx vitest run --dir tests/acceptance/M6` target and `test-acceptance-m6` appended to the `check:` prerequisites, made by the last M6 task, in its Owns via slice-tasks.
- **Test data.** Synthetic only: the PRD's fictional people (Dr. Maya Chen, Ana Ruiz, Fran Fields, Sam Reyes, Dana Ito, Omar Ortega) with `@example.test` emails from tests/acceptance/support/people.ts; past months (October 2025) so figures never depend on today.

## Traceability

| AT | Covers | Requirement (EARS, verbatim) | Given / When / Then (concrete values) | Technique | Level | Test (path::name) | Status |
|---|---|---|---|---|---|---|---|
| AT-001 | AE-029, FR-032, SC-001, EC-16 | FR-032: When a platform reviewer opens the volume report for a month, the system shall show each practice's paid amount, platform fees, orders sent and orders paid for that month. | **Given** Willow Creek sent 5 orders in October 2025 and 4 were paid at $60.00 each, and Maple Grove sent and was paid 1 $30.00 order **When** Omar opens the October 2025 volume report (EP-33) **Then** Willow Creek shows 24000 paid cents, 180 fee cents, 5 sent, 4 paid, and Maple Grove 3000, 23, 1, 1, in practice order | example | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_001` | red @ 0faedf6 |
| AT-002 | AE-045, FR-048, SC-003 | FR-048: When platform staff open the platform health dashboard for a period, the system shall show the sent-to-paid rate, median time to pay, failed payments, out-of-stock refusals, expired checkouts, orders needing review, and in-house paid volume and fees. | **Given** 10 orders sent in October 2025, 8 paid after 10, 12, 18, 20, 20, 22, 40 and 50 hours, 1 payment failed, 1 checkout expired **When** Fran opens October's health (EP-33) **Then** the funnel reads sent 10, checkout started 10, paid 8, failed 1, expired 1, median 1200 minutes, 0 out-of-stock refusals, one measure valued 80 (percent, ⚠ Q-4); September reads zeros and no median | example | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_002` | red @ 0faedf6 |
| AT-003 | AE-046, FR-049 | FR-049: While a health measure is past its alert line, the system shall mark it as needing attention on the platform health dashboard. | **Given** 0, then 1, then 2 orders needing review and the alert line 1 (A-11) **When** Omar opens platform health **Then** at 0 no measure needs attention; at 1 exactly one does (value 1, alert line 1) and S10 shows "1 measure needs attention: orders needing review (1)"; at 2 the value is 2 | boundary | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_003` | red @ 0faedf6 |
| AT-004 | AE-050, FR-053, INV-7 | FR-053: The system shall show the data analyst totals on the health dashboard and volume report and never a single order. | **Given** Ana's $60.00 order paid in October 2025 **When** Dana opens October's health and then that order's breakdown **Then** she sees Willow Creek 6000 paid cents and no order id; Omar opens the breakdown (200) but Dana gets 403 with no amounts, S4 shows "Your role shows totals only." (⚠ Q-8), and S10 has no link to any order | authz | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_004` | red @ 0faedf6 |
| AT-005 | FR-048 | FR-048: When platform staff open the platform health dashboard for a period, the system shall show the sent-to-paid rate, median time to pay, failed payments, out-of-stock refusals, expired checkouts, orders needing review, and in-house paid volume and fees. | **Given** Ana's order of 2 Vitamin D3 with 1 in stock **When** she presses Pay (422 insufficient-stock), Dr. Chen's send of 5 is refused, then stock is 10 and Ana pays **Then** this month's out-of-stock refusals read 1 and stay 1 (D86: Pay refusals only) | decision-table | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_005` | red @ 0faedf6 |
| AT-006 | FR-032, FR-048 | FR-032: When a platform reviewer opens the volume report for a month, the system shall show each practice's paid amount, platform fees, orders sent and orders paid for that month. | **Given** one paid order in October 2025 and none in September **When** Omar opens September **Then** both practices are listed with 0, 0, 0, 0, the median is null, and S10 shows "No orders were sent in September 2025." | data-shape | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_006` | red @ 0faedf6 |
| AT-007 | NFR-012, INV-7, FR-053, FR-063 | FR-053: The system shall show the data analyst totals on the health dashboard and volume report and never a single order. | **Given** Ana's and Carla's paid October 2025 orders **When** Omar and Fran open health, report, export, access log and the S10 and S11 pages **Then** none of the answers or pages contains "Ana Ruiz", "Ben Ortiz", "Carla Diaz" or their emails, while the figures are present (6000, 9000) | authz | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_007` | red @ 0faedf6 |
| AT-008 | FR-053, FR-058 | FR-058: If an operations person opens a page or action their role does not allow, then the system shall refuse and show none of its contents. | **Given** the seeded people **When** each opens October 2025 health **Then** Fran, Omar, Dana get 200; Sam, Dr. Chen, Ana 403 forbidden; nobody signed in 401; month 2025-13 is 422; S10 tells Dr. Chen "Only operations staff can see platform health." with "Go to your home"; a stranger is sent to sign-in | authz | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_008` | red @ 0faedf6 |
| AT-009 | FR-032 | FR-032: When a platform reviewer opens the volume report for a month, the system shall show each practice's paid amount, platform fees, orders sent and orders paid for that month. | **Given** one $60.00 order paid 2025-10-31 23:59:59Z and one sent then and paid 2025-11-01 00:00:00Z **When** Omar opens October and November **Then** October shows 6000, 45, 2 sent, 1 paid and November 6000, 45, 0 sent, 1 paid | boundary | integration | `tests/acceptance/M6/platform-health.test.ts::M6_AT_009` | red @ 0faedf6 |
| AT-010 | AE-055, FR-060, FR-064, INV-9, EC-16 | FR-060: When the finance lead runs the financial report for a period, the system shall show that period's patient payments, item cost, provider payouts and platform fees, each in whole cents. | **Given** October 2025 holds Ana's $60.00 and Ben's $30.00 paid orders with Dr. Chen plus one unpaid order, and November holds Ben's and Carla's $30.00 orders with Dr. Chen and Dr. Lee **When** Fran runs October and November **Then** October is 9000, 4500, 4432, 68 with only Dr. Chen at 4432; November is 6000, 3000, 2954, 46 (sum of order fees, not 45) with Dr. Chen 1477 and Dr. Lee 1477 | example | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_010` | red @ 0faedf6 |
| AT-011 | AE-056, FR-061, INV-1 | FR-061: The system shall show on the financial report whether patient payments equal item cost plus provider payouts plus platform fees to the cent. | **Given** the October 2025 orders of AT-010 **When** Fran runs October **Then** balanced is true, gap 0, no gap orders, and S11 shows "Balanced: yes" with $90.00, $45.00, $44.32 and $0.68 | example | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_011` | red @ 0faedf6 |
| AT-012 | AE-057, FR-062 | FR-062: The system shall show revenue on the financial report two ways, each labelled: gross as all patient payments, and net as platform fees only. | **Given** the October 2025 orders **When** Fran runs October **Then** gross is 9000 and net 68 cents, and S11 shows "Gross" beside $90.00 and "Net" beside $0.68 | example | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_012` | red @ 0faedf6 |
| AT-013 | AE-058, FR-063, INV-7, EC-16 | FR-063: When the finance lead exports the financial report, the system shall produce the period totals and one line per paid order with its order number and no patient identity. | **Given** the October 2025 orders (two paid, one unpaid) **When** Fran exports October (EP-35) **Then** a text/csv file holds the four totals, exactly one line per paid order number, no line for the unpaid order and no patient name or email (column format ⚠ Q-6) | example | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_013` | red @ 0faedf6 |
| AT-014 | AE-059, FR-065, FR-061 | FR-065: If a period's totals do not balance to the cent, then the system shall mark the report as not balanced and name the orders that cause the gap. | **Given** October 2025 balanced, then Ana's fee entry changed from 45 to 44 by a direct database write **When** Fran runs October **Then** balanced is false, gap 1 cent, gap orders = Ana's order, fees 67, and S11 shows "Not balanced: $0.01 short." naming "Order <n>" | error-guess | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_014` | red @ 0faedf6 |
| AT-015 | AE-060, FR-060 | FR-060: When the finance lead runs the financial report for a period, the system shall show that period's patient payments, item cost, provider payouts and platform fees, each in whole cents. | **Given** one paid order in October 2025 and none in September **When** Fran runs September **Then** from 2025-09-01 to 2025-09-30, every total 0, balanced, gross and net 0, no payouts, and S11 shows "No orders were paid in September 2025. Every total is $0.00." | data-shape | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_015` | red @ 0faedf6 |
| AT-016 | AE-048, FR-051, FR-058 | FR-051: The system shall let only the finance lead run and export financial reports. | **Given** the October 2025 orders **When** Fran, then Omar, Dana and Sam run and export October **Then** Fran gets 200 for both; the others get 403 forbidden with no CSV, and S11 tells Omar "Only the finance lead can run financial reports." with "Go to your home" and no $90.00 | authz | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_016` | red @ 0faedf6 |
| AT-017 | FR-060, FR-063 | FR-060: When the finance lead runs the financial report for a period, the system shall show that period's patient payments, item cost, provider payouts and platform fees, each in whole cents. | **Given** $60.00 paid 2025-10-31 23:59:59Z and $30.00 paid 2025-11-01 00:00:00Z **When** Fran asks for month 2025-10, from 2025-10-01 to 2025-10-31, 2025-11-01 to 2025-11-01, 2025-10-31 to 2025-11-01, and the 366 days of 2024 **Then** payments are 6000, 6000, 3000, 9000 and 0; month with from-to, from after to, 367 days, 2025-02-30 and 2025-13 are each 422 (BE-17 period rule) | boundary | integration | `tests/acceptance/M6/financial-report.test.ts::M6_AT_017` | red @ 0faedf6 |
| AT-018 | AE-051, FR-054, NFR-014 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** Dana has no role **When** Sam grants her data analyst with "new hire", then removes Omar's role with "left the team" **Then** each answer is 200, the roles are data_analyst and none, and the access log holds exactly (Sam, Dana, none → data_analyst, "new hire", granted) and (Sam, Omar, operations_specialist → none, "left the team", granted), timed now | example | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_018` | red @ 0faedf6 |
| AT-019 | AE-052, FR-055, INV-10, EC-15 | FR-055: If anyone other than the SRE tries to grant or remove an operations role, then the system shall refuse and leave every role unchanged. | **Given** Sam's change for Dana succeeds first **When** Fran tries to make Omar SRE **Then** 403 forbidden, Omar is still operations_specialist with no change date, and a refused row (Fran, Omar, operations_specialist → sre) is logged | authz | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_019` | red @ 0faedf6 |
| AT-020 | AE-053, FR-056, INV-10 | FR-056: If the SRE tries to grant or remove a role on their own account, then the system shall refuse and leave their roles unchanged. | **Given** Sam's change for Dana succeeds first **When** Sam tries to make himself finance lead **Then** 403 self-role-change, Sam is still sre, and a refused row (Sam, Sam, sre → finance_lead) is logged | authz | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_020` | red @ 0faedf6 |
| AT-021 | FR-054, FR-058 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** the seeded people **When** Sam, then Fran, Omar and Dana open the staff list and S12 **Then** Sam sees exactly Dana Ito, Fran Fields, Omar Ortega and Sam Reyes with "you" on his row; the others get 403, and S12 tells Fran "Only the SRE can change operations roles." with no staff names | authz | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_021` | red @ 0faedf6 |
| AT-022 | FR-054 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** one Idempotency-Key **When** Sam sends Dana → finance lead twice with it, then a change for Omar with no key **Then** both answers are equal, one log row exists; the keyless one is 400 idempotency-key-missing and Omar is unchanged | concurrency | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_022` | red @ 0faedf6 |
| AT-023 | FR-054 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** Dana is data_analyst **When** Sam saves with expected role none, then with expected data_analyst **Then** first 409 stale-role with currentRole data_analyst, nothing changed or logged; second 200 and one row | error-guess | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_023` | red @ 0faedf6 |
| AT-024 | FR-054 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** Fran is the only finance lead **When** Sam removes her without confirming, gives Dana finance lead, removes Fran, removes Dana without and then with confirm_no_finance_lead **Then** 422 last-finance-lead (unchanged, unlogged), 200, 200, 422, 200; three granted rows | decision-table | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_024` | red @ 0faedf6 |
| AT-025 | FR-054, FR-055 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** Sam's change for Dana succeeds **When** Sam aims a change at Dr. Chen, Ana and user 999999 **Then** each is 404 not-found, their roles are unchanged and only the one row exists | partition | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_025` | red @ 0faedf6 |
| AT-026 | FR-054 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** Dana is data_analyst **When** Sam sends reason "", a 201-character reason, role provider, an extra practice_id, then a 200-character reason **Then** the first four are 422 with nothing logged or changed; the last is 200 with its full reason logged | boundary | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_026` | red @ 0faedf6 |
| AT-027 | INV-4, NFR-013 | INV-4: paid money records, ledger entries, price, stock and access history are never changed or deleted | **Given** one granted access log row **When** the app's database user updates and deletes access_log **Then** both fail with 42501 (permission denied), it can still read 1 row, and the reason is unchanged | error-guess | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_027` | red @ 0faedf6 |
| AT-028 | FR-058, FR-054 | FR-058: If an operations person opens a page or action their role does not allow, then the system shall refuse and show none of its contents. | **Given** Dana is signed in and can open platform health (200) **When** Sam removes her role **Then** her same session gets 403 forbidden on platform health | state | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_028` | red @ 0faedf6 |
| AT-029 | FR-054, INV-10 | FR-054: When the SRE grants or removes an operations role, the system shall add an access log entry showing who acted, for whom, which role, when and the reason. | **Given** Dana is data_analyst **When** two changes with different keys and the same expected role arrive at once **Then** one is 200 and one 409 stale-role, exactly one granted row exists, and Dana holds the winner's role | concurrency | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_029` | red @ 0faedf6 |
| AT-030 | FR-039, FR-058 | FR-039: When a person signs in with their own account, the system shall show only the pages their role allows: a patient their own orders, a provider their practice, platform staff the platform pages. | **Given** M6's pages exist **When** Sam, Dana and Fran open the site root **Then** Sam is redirected to /ops/system and Dana to /ops/health, each page opens with its title and no wrong-role link; Fran still goes to /ops/orders (lld.md ROLE_PAGES M6 note, ⚠ Q-10, Q-11) | state | integration | `tests/acceptance/M6/roles.test.ts::M6_AT_030` | red @ 0faedf6 |
| AT-031 | AE-054, FR-057 | FR-057: When the finance lead opens the access log for a period, the system shall list every role grant and removal in that period. | **Given** Sam granted Dana data analyst on 2025-10-20 14:12Z and was refused a self-change on 2025-10-21 **When** Fran opens October 2025 and September 2025 **Then** October lists the refused self-change then the grant (Sam Reyes, Dana Ito, none → data_analyst, "new hire", at 2025-10-20T14:12Z), S13 shows them with "Refused"; September is empty and S13 says "No roles changed in September 2025." | example | integration | `tests/acceptance/M6/access-log.test.ts::M6_AT_031` | red @ 0faedf6 |
| AT-032 | FR-057, FR-058, NFR-014, INV-10 | FR-057: When the finance lead opens the access log for a period, the system shall list every role grant and removal in that period. | **Given** the October 2025 entries **When** Fran, then Sam (the actor), Omar and Dana open the log **Then** Fran 200; the others 403 with no entry text, and S13 tells Sam "Only the finance lead reviews the access log." with "Go to your home" | authz | integration | `tests/acceptance/M6/access-log.test.ts::M6_AT_032` | red @ 0faedf6 |
| AT-033 | FR-057 | FR-057: When the finance lead opens the access log for a period, the system shall list every role grant and removal in that period. | **Given** 26 entries in October 2025 an hour apart **When** Fran opens the month, follows next_cursor, and sends cursor "not-a-cursor", limit 101, limit 0, month 2025-13 **Then** 25 entries newest first ("entry 25" first) and a cursor, then exactly "entry 0" and no cursor; each bad value is 422 | boundary | integration | `tests/acceptance/M6/access-log.test.ts::M6_AT_033` | red @ 0faedf6 |
| AT-034 | AE-062, FR-059 | FR-059: When the SRE opens system health for a period, the system shall show availability, error rate and the share of slow pages for that period. | **Given** October 2025 pinged in 8,901 of 8,928 five-minute slots, 4 errors in 1,000 requests, 10 slow of 500 page responses and 100 slow api responses **When** Sam opens October **Then** availability 99.7 (within 0.05, ⚠ Q-7), error rate 0.4, slow pages 2, targets 99.5 and 5, not partial, and S14 shows "99.7%" | example | integration | `tests/acceptance/M6/system-health.test.ts::M6_AT_034` | red @ 0faedf6 |
| AT-035 | FR-059 | FR-059: When the SRE opens system health for a period, the system shall show availability, error rate and the share of slow pages for that period. | **Given** the first ping ever at 2025-10-16 00:00Z with every slot after it pinged to month end, no pings in November but 100 api requests, nothing in September **When** Sam opens each month **Then** October 100, November 0 availability with error rate 0 and slow pages null, September all null (D87) | decision-table | integration | `tests/acceptance/M6/system-health.test.ts::M6_AT_035` | red @ 0faedf6 |
| AT-036 | FR-059 | FR-059: When the SRE opens system health for a period, the system shall show availability, error rate and the share of slow pages for that period. | **Given** nothing recorded **When** /healthz is called twice **Then** both answer 200 "ok", 1 or 2 slots exist, each a multiple of 300 seconds, including the current slot | concurrency | integration | `tests/acceptance/M6/system-health.test.ts::M6_AT_036` | red @ 0faedf6 |
| AT-037 | FR-059, NFR-010 | FR-059: When the SRE opens system health for a period, the system shall show availability, error rate and the share of slow pages for that period. | **Given** Ana's paid order **When** she opens /api/orders/<n> and /healthz is called **Then** request_stats holds api.orders and api.session groups, none containing the order number, healthz, version or _nuxt | partition | integration | `tests/acceptance/M6/system-health.test.ts::M6_AT_037` | red @ 0faedf6 |
| AT-038 | FR-059, FR-058 | FR-058: If an operations person opens a page or action their role does not allow, then the system shall refuse and show none of its contents. | **Given** the seeded people **When** Sam, then Fran, Omar and Dana open October 2025 system health **Then** Sam 200, the others 403, month 2025-13 is 422, and S14 tells Fran "Only the SRE can see system health." with "Go to your home" | authz | integration | `tests/acceptance/M6/system-health.test.ts::M6_AT_038` | red @ 0faedf6 |
| AT-039 | AE-061, FR-058, INV-7 | FR-058: If an operations person opens a page or action their role does not allow, then the system shall refuse and show none of its contents. | **Given** Ana's $60.00 order paid in October 2025 **When** Omar, then Sam open its breakdown **Then** Omar gets 200 and S4 shows $60.00; Sam gets 403 with no amounts and S4 shows "Your role can't open order breakdowns." without $60.00 (⚠ Q-8) | authz | integration | `tests/acceptance/M6/system-health.test.ts::M6_AT_039` | red @ 0faedf6 |
| AT-040 | AE-049, FR-052 | FR-052: The system shall let only the operations specialist work the review list and record stock adjustments. | **Given** one order on the review list **When** Omar, then Dana and Sam open the review list **Then** Omar sees exactly that order; Dana and Sam get 403 without its number (finance lead keeps access, ⚠ Q-9) | authz | integration | `tests/acceptance/M6/review-and-stock.test.ts::M6_AT_040` | green: pins EP-25 role list built in M4 (⚠ Q-3) |
| AT-041 | FR-052, FR-058 | FR-052: The system shall let only the operations specialist work the review list and record stock adjustments. | **Given** 10 Vitamin D3 in stock **When** Omar adds 5, then Fran, Dana and Sam each try +5 **Then** Omar 201 and stock 15; the others 403 and stock still 15 | authz | integration | `tests/acceptance/M6/review-and-stock.test.ts::M6_AT_041` | green: pins EP-32 role check built in M5 (⚠ Q-3) |
| AT-042 | FR-052 | lld.md BE-13 (D83): an adjustment whose `change` is outside −1,000,000 to +1,000,000, or whose resulting count would pass 1,000,000 units, is refused with 422 `/problems/validation` (pointer `#/change`) | **Given** 10 Vitamin D3 **When** Omar sends +1,000,001, −1,000,001, then +999,990, then +1 **Then** 422 at #/change, 422, 201 with stock 1,000,000, then 422 at #/change with stock still 1,000,000 | boundary | integration | `tests/acceptance/M6/review-and-stock.test.ts::M6_AT_042` | red @ 0faedf6 |
| AT-043 | D83 (carried, ⚠ Q-13) | lld.md BE-8 (D83): a requested or margin-computed price above 10,000,000 cents ($100,000.00) is refused with 422 `/problems/validation` (pointer `#/price_cents` or `#/margin_basis_points`) before any write | **Given** Omega-3 costs $15.00 at $30.00 **When** Dr. Chen sets 10,000,001 cents, then a 99.99% margin, then 10,000,000 cents **Then** 422 at #/price_cents, 422 at #/margin_basis_points with no history row, then 200 and a price of 10,000,000 | boundary | integration | `tests/acceptance/M6/review-and-stock.test.ts::M6_AT_043` | red @ 0faedf6 |
| AT-044 | D85 (carried, ⚠ Q-13) | openapi.yaml InvalidTransitionProblem (D85): `/problems/invalid-transition` with why it was refused, members `from` (the order's status) and `event` (start_checkout, pay or cancel) | **Given** Ben's sent order and Ana's paid order **When** Dr. Chen cancels both and Ana restarts checkout on hers **Then** Ben's cancel is 200; Ana's cancel is 409 with from paid, event cancel, and her checkout 409 with from paid, event start_checkout | state | integration | `tests/acceptance/M6/review-and-stock.test.ts::M6_AT_044` | red @ 0faedf6 |

## Edge cases

### Equivalence partitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-001 | FR-032 | a practice with orders and one with none in the month | both listed, zeros included, by practice id (lld.md BE-16 Definitions) | AT-001, AT-006 |
| EDGE-002 | FR-048 | orders now paid, payment_failed, sent after an ended hold, sent never started | each counted in its funnel class (lld.md BE-16 Definitions) | AT-002 |
| EDGE-003 | FR-053 | finance_lead, operations_specialist, data_analyst versus sre, provider, patient, signed out | 200 for the first three; 403 forbidden; 401 unauthenticated (EP-33) | AT-008 |
| EDGE-004 | FR-051 | the report and export asked by finance_lead versus operations_specialist, data_analyst, sre | 200; 403 forbidden (EP-34, EP-35, AE-048) | AT-016 |
| EDGE-005 | FR-054 | a grant (none → data_analyst) and a removal (operations_specialist → none) | both change the role and log a granted row (FR-054, SEQ-10) | AT-018 |
| EDGE-006 | FR-054 | target an operations person, a provider, a patient, an unknown id | 200; 404 not-found with nothing logged for the other three (lld.md BE-18 order of checks) | AT-025 |
| EDGE-007 | FR-060 | period given as a month, as from and to, or not at all | month and from-to give the same totals; none = the current month (lld.md BE-17 Period) | AT-017 for month and from-to; not tested: the no-period default depends on today's date (no clock seam across the test process), low risk |
| EDGE-008 | FR-063 | a paid order and an unpaid order in the same month | only the paid order gets an export line (FR-063, EC-16) | AT-013 |
| EDGE-009 | FR-059 | /api/orders/1001, /api/session, /healthz | counted as api.orders and api.session; /healthz not counted; no ids (lld.md BE-19.routeGroup, NFR-010) | AT-037 |
| EDGE-010 | FR-058 | each M6 page opened by a wrong role | the page's wrong-role copy and "Go to your home", no figures (screens.md S10 to S14 Permission denied; M5.2 convention) | AT-008, AT-016, AT-021, AT-032, AT-038 |

### Boundary values

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-011 | FR-032 | paid 2025-10-31 23:59:59Z versus 2025-11-01 00:00:00Z | October versus November (UTC month, lld.md BE-16) | AT-009 |
| EDGE-012 | FR-060 | to = from (one day), 366 days, 367 days | inclusive one day; 366 allowed; 367 is 422 (lld.md BE-17 Period) | AT-017 |
| EDGE-013 | FR-049 | orders needing review 0, 1, 2 with alert line 1 | 0 not flagged; 1 and 2 flagged (A-11, AE-046) | AT-003 |
| EDGE-014 | FR-054 | reason of 0, 200 and 201 characters | 422, 200, 422 (RoleChangeRequest minLength 1, maxLength 200) | AT-026 |
| EDGE-015 | FR-057 | 26 entries; limit 0 and 101 | pages of 25 then 1; 422 (lld.md §4 Pagination, BE-22.parseLimit 1 to 100) | AT-033 |
| EDGE-016 | FR-052 | stock change ±1,000,001; resulting count 1,000,000 and 1,000,001 | 422, 201, 422 at #/change (D83) | AT-042 |
| EDGE-017 | FR-059 | 27 of 8,928 slots without a ping | availability 99.7 % (D87; AE-062) | AT-034 |

### State transitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-018 | FR-058 | Dana's live session after her role is removed | her next request is refused (lld.md users "Role none": BE-3.resolve reads the role every time) | AT-028 |
| EDGE-019 | FR-054 | removing the last finance lead with and without confirm, and while a second one exists | 422 last-finance-lead unless confirmed or not the last (EP-37, S12 Edge data) | AT-024 |
| EDGE-020 | FR-048 | an order whose checkout hold ended without payment | counted as checkout expired (lld.md BE-16 Definitions) | AT-002 |
| EDGE-021 | FR-056 | an operations person whose role is now none | pages refuse (prd.md CQ-7); sign-in to S15 stays as M5.2 built it | AT-028 (pages refuse); sign-in landing already pinned by M5.2_AT_005 in make check |
| EDGE-022 | FR-039 | sre and data_analyst land on their new pages instead of S15 | Sam to /ops/system, Dana to /ops/health (lld.md Site root, M6 note) | AT-030 |
| EDGE-023 | FR-058 | cancel or restart checkout on a paid order (carried D85) | 409 invalid-transition with from paid and the event (D85) | AT-044 |

### Decision tables

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-024 | FR-055 | actor sre → another person; actor not sre → anyone; logged or not | granted and logged; 403 forbidden and a refused row (SEQ-10 alt, BE-18) | AT-018, AT-019 |
| EDGE-025 | FR-056 | actor sre → own account | 403 self-role-change and a refused row (SEQ-10 alt) | AT-020 |
| EDGE-026 | FR-048 | Pay refused for stock; send refused for stock; Pay succeeds | counted 1; not counted; not counted (D86) | AT-005 |
| EDGE-027 | FR-061 | parts equal payments; parts 1 cent short | Balanced: yes; not balanced with the gap and the order (FR-061, FR-065) | AT-011, AT-014 |
| EDGE-028 | FR-059 | month after the first ping with pings; after it with none; before any ping | a percentage; 0; null (D87, SystemHealth "null with no pings") | AT-035 |

### Error guessing

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-029 | FR-065 | a ledger entry changed by a direct database write | the report names that order (lld.md BE-17 Gap orders) | AT-014 |
| EDGE-030 | FR-057 | cursor "not-a-cursor", month 2025-13 | 422 validation (BE-22) | AT-033 |
| EDGE-031 | FR-060 | to = 2025-02-30, month = 2025-13, both forms at once, from after to | 422 validation (EP-34) | AT-017 |
| EDGE-032 | FR-054 | the dialog was opened before another change landed (expected role stale) | 409 stale-role with currentRole, not logged (BE-18) | AT-023 |
| EDGE-033 | FR-063 | the export stream fails part-way | "We couldn't prepare the export. Nothing was downloaded. Try again." and nothing written (FM-9) | not tested: no seam can break a stream mid-way (lld.md §9 has none); nothing is written either way |
| EDGE-034 | FR-059 | the ping write fails while the database answers | /healthz still answers ok; that slot reads as down (FM-8) | not tested: no seam fails one insert without failing the database; the cost is one slot reading down |
| EDGE-035 | FR-054 | a change request with no Idempotency-Key | 400 idempotency-key-missing, nothing changed (EP-37) | AT-022 |

### Concurrency, idempotency, double-submit

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-036 | FR-054 | the same role change twice with one key | one change, one log row, the same answer (EP-37 Idempotency, D41) | AT-022 |
| EDGE-037 | FR-054 | two changes for Dana with different keys at once | one 200, one 409 stale-role, one log row (BE-18 locks the target row) | AT-029 |
| EDGE-038 | FR-059 | two /healthz calls in one 5-minute slot | one slot row (health_pings primary key) | AT-036 |
| EDGE-039 | FR-063 | a payment lands while the report and its export are read | totals and lines from the same moment (lld.md BE-17 repeatable-read) | not tested: needs a payment paused mid-transaction and no seam pauses BE-10 (lld.md §9); INV-9 itself is tested by AT-010 · BLOCKS G4 |

### Authorization and abuse

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-040 | FR-053 | the data analyst types an order breakdown address | 403, "Your role shows totals only." (SEQ-8 alt, S10) | AT-004 |
| EDGE-041 | FR-058 | the SRE follows a link to Order <n>'s breakdown | 403, "Your role can't open order breakdowns." (SEQ-12 alt, S14, AE-061) | AT-039 |
| EDGE-042 | FR-057 | the SRE (the actor) opens the access log | 403, "Only the finance lead reviews the access log." (SEQ-11 alt, INV-10 review by another) | AT-032 |
| EDGE-043 | FR-054 | an extra practice_id in the role-change body | 422 (RoleChangeRequest additionalProperties false) | AT-026 |
| EDGE-044 | FR-051 | an export link opened by Omar | 403 problem, no CSV (EP-35) | AT-016 |
| EDGE-045 | FR-052 | review list and stock adjustment by data analyst, SRE, finance lead | 403 (EP-25, EP-32; ⚠ Q-9 for the finance lead on EP-25) | AT-040, AT-041 |
| EDGE-046 | FR-058 | an M6 page opened while signed out | 303 to sign-in with next (EP-10 to EP-14) | AT-008 |
| EDGE-047 | FR-032 | patient names or emails in any platform staff answer or page | none (NFR-012, INV-7) | AT-007 |
| EDGE-048 | FR-055 | the SRE leaves and nobody else can grant roles (EC-15) | roles stay as they are; nobody else may grant (FR-055) | AT-019 |

### Money, rounding, time zones

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-049 | FR-060 | two $30.00 orders whose fees round up to 23 each | fees 46, the sum of per-order fees, never 0.75 % of $60.00 = 45 (FR-011, FR-060 from ledger entries) | AT-010 |
| EDGE-050 | FR-064 | two providers in two practices in one month | one payout line each, 1477 and 1477 (FR-064) | AT-010 |
| EDGE-051 | FR-048 | median of an even count whose middle two differ (19 h and 21 h) | ⚠ Q-5 (average of the middle two, or the lower) | not tested: ⚠ Q-5 open; the fixture uses equal middle values (20 h and 20 h) |
| EDGE-052 | FR-059 | 8,901 ÷ 8,928 = 99.6976 % | shown as 99.7 % (AE-062; rounding ⚠ Q-7) | AT-034 |
| EDGE-053 | FR-062 | net revenue | platform fees only, 68 cents; gross 9000 (FR-062, AE-057) | AT-012 |
| EDGE-054 | FR-065 | the gap is one cent | "Not balanced: $0.01 short." (AE-059, S11) | AT-014 |

### Empty, huge and unicode data

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-055 | FR-032 | September 2025 with no orders | every practice with zeros; "No orders were sent in September 2025." (S10 Empty) | AT-006 |
| EDGE-056 | FR-060 | September 2025 with no paid orders (EC-16) | every total $0.00 and balanced; S11 Empty copy (AE-060) | AT-015 |
| EDGE-057 | FR-057 | September 2025 with no role changes | empty list; "No roles changed in September 2025." (S13 Empty) | AT-031 |
| EDGE-058 | FR-063 | a cell starting with "=" in the export | ⚠ Q-6 (no free-text column is designed, so none can start with "=") | not tested: ⚠ Q-6 open; the export holds numbers and order numbers only |
| EDGE-059 | FR-064 | 50 providers, 200 practices | the API returns the whole list; the page shows 25 at a time (EP-33, EP-34) | not tested: the reveal is client-side (no browser tool); the full list is asserted by AT-010 and AT-001 |
| EDGE-060 | FR-054 | the operations team list | operations people only, never patients or providers (BE-18.listStaff) | AT-021 |

## Edge-case coverage matrix

Every in-scope FR against every group: EDGE ids, or `n/a: <why>`. No blank cell.

| FR | partition | boundary | state | decision-table | error-guess | concurrency | authz | money-time | data-shape |
|---|---|---|---|---|---|---|---|---|---|
| FR-032 | EDGE-001 | EDGE-011 | n/a: a read-only report changes no state | n/a: one rule, every practice listed | n/a: no input but the month (EDGE-030 pattern via EP-33 in AT-008) | n/a: read-only | EDGE-047 | EDGE-011 | EDGE-055 |
| FR-048 | EDGE-002 | n/a: counts have no limit | EDGE-020 | EDGE-026 | n/a: covered by FR-032's month handling | n/a: counts are best-effort by design (D86, FM-8) | EDGE-003 | EDGE-051 | EDGE-055 |
| FR-049 | n/a: one measure has an alert line (A-11) | EDGE-013 | n/a: computed per read | n/a: one rule | n/a: no input | n/a: read-only | EDGE-003 | n/a: counts only | n/a: zero case is EDGE-013 |
| FR-051 | EDGE-004 | n/a: no limits | n/a: no state | n/a: one condition (role) | n/a: covered by FR-060 | n/a: read-only | EDGE-044 | n/a: role rule only | n/a: no data input |
| FR-052 | EDGE-045 | EDGE-016 | n/a: role rule | n/a: one condition (role) | n/a: M5 behaviour | n/a: M5 tests cover stock races | EDGE-045 | n/a: no money | n/a: no text input in scope |
| FR-053 | EDGE-003 | n/a: no limits | n/a: no state | n/a: one condition (role) | n/a: no input | n/a: read-only | EDGE-040 | n/a: totals only | EDGE-047 |
| FR-054 | EDGE-005, EDGE-006 | EDGE-014 | EDGE-019 | EDGE-024 | EDGE-032, EDGE-035 | EDGE-036, EDGE-037 | EDGE-043 | n/a: no money; times asserted within a minute | EDGE-060 |
| FR-055 | EDGE-024 | n/a: no limits | n/a: refusal changes nothing | EDGE-024 | n/a: covered by FR-054 | n/a: covered by EDGE-037 | EDGE-048 | n/a: no money | n/a: no data input |
| FR-056 | EDGE-025 | n/a: no limits | EDGE-021 | EDGE-025 | n/a: covered by FR-054 | n/a: covered by EDGE-037 | EDGE-025 | n/a: no money | n/a: no data input |
| FR-057 | n/a: one list | EDGE-015 | n/a: read-only | n/a: one rule | EDGE-030 | n/a: read-only | EDGE-042 | n/a: UTC month as FR-032 | EDGE-057 |
| FR-058 | EDGE-010 | n/a: no limits | EDGE-018, EDGE-023 | n/a: covered per page in EDGE-010 | n/a: no input | n/a: no shared write | EDGE-041, EDGE-046 | n/a: no money | n/a: no data |
| FR-059 | EDGE-009 | EDGE-017 | n/a: read-only | EDGE-028 | EDGE-034 | EDGE-038 | EDGE-010 | EDGE-052 | EDGE-028 |
| FR-060 | EDGE-007 | EDGE-012 | n/a: read-only | n/a: one rule | EDGE-031 | EDGE-039 | EDGE-004 | EDGE-049 | EDGE-056 |
| FR-061 | n/a: one flag | n/a: the one-cent case is EDGE-054 | n/a: read-only | EDGE-027 | EDGE-029 | n/a: as FR-060 | EDGE-004 | EDGE-054 | EDGE-056 |
| FR-062 | n/a: two fixed views | n/a: no limits | n/a: read-only | n/a: one rule | n/a: as FR-060 | n/a: read-only | EDGE-004 | EDGE-053 | EDGE-056 |
| FR-063 | EDGE-008 | EDGE-012 | n/a: read-only | n/a: one rule | EDGE-033 | EDGE-039 | EDGE-044 | EDGE-049 | EDGE-058 |
| FR-064 | n/a: one list | n/a: no limits | n/a: read-only | n/a: one rule | n/a: as FR-060 | n/a: read-only | EDGE-004 | EDGE-050 | EDGE-059 |
| FR-065 | n/a: one rule | EDGE-054 | n/a: read-only | EDGE-027 | EDGE-029 | n/a: as FR-060 | EDGE-004 | EDGE-054 | n/a: an empty period balances (EDGE-056) |

## Silent-success guards

Ways a test could pass while the feature is wrong (`references/silent-success.md`), and how these tests stop it.

| SS | How a test could pass while the feature is wrong | Tests at risk | Guard used in those tests |
|---|---|---|---|
| SS-01 | only the status is asserted, so an empty 200 stub passes | every automated AT | exact cents, counts and rows are asserted; persisted state (users, access_log, products) is read fresh after the act |
| SS-02 | a refusal passes because the route does not exist yet (every unknown route is a 404, and every unbuilt page a 200 with the not-found page) | AT-004, AT-008, AT-016, AT-019, AT-020, AT-021, AT-025, AT-028, AT-032, AT-038, AT-039, AT-040, AT-041 | the allowed twin (right role, or the SRE's first change) succeeds first in the same test; page refusals match the exact screens.md copy, which no not-found page shows |
| SS-03 | a hard-coded AE value or a recomputed formula (tautological oracle, indistinct fixtures) | AT-001, AT-002, AT-010, AT-034 | a second practice and provider with different numbers; November fees 46 where 0.75 % of the total gives 45; median 20 h where the mean is 24 h; api slowness present so a slow share over all groups would read 11 %, not 2 % |
| SS-04 | the success answer without the effect (role shown changed, nothing saved or logged) | AT-018 to AT-029 | users.role and access_log rows are read from the database after each call, and refused attempts must leave a refused row and an unchanged role |
| SS-05 | an over-broad page match ("Error", "$") | AT-003, AT-004, AT-006, AT-008, AT-011, AT-014 to AT-016, AT-021, AT-031, AT-032, AT-038, AT-039 | exact screens.md copy through `copy()` (apostrophes as escaped HTML too), and the absence of figures on refused pages |
| SS-06 | clock luck: passes only in the month it was written | every AT using past months; AT-003, AT-005, AT-036 use now | fixed past months (October 2025); the three "now" tests read the current UTC month or slot and tolerate a slot edge (AT-036 allows 1 or 2 rows); a run across a UTC month change could still flake (accepted, as M5) |
| SS-07 | an asynchronous counter not yet written, read once (always 0) or asserted in a loop | AT-005, AT-036, AT-037 | `eventually()` polls with a bound, then one assertion outside the loop; AT-005 waits for later requests to be counted before asserting the count stayed 1 |
| SS-08 | not run at all: a Done-when `-t` that matches nothing exits 0 | every AT | the single-test proof below; Done-when lines count passing ids (⚠ Q-2) |
| SS-09 | leaking state between tests | every AT | every table truncated before each test, identities restarted; the sign-in cookie cache is cleared before each test |
| SS-10 | a transaction-wrapped race that cannot collide | AT-029 | two real HTTP requests on separate connections, asserted through the log row count |
| SS-11 | order luck | AT-010, AT-021, AT-031, AT-033 | provider payouts and staff names compared after sorting; order asserted only where lld.md says newest first (EP-38) or by practice id (BE-16) |

Laziest-stub check (reasoned test by test at step 7, not executed): 44 automated tests reasoned against a
hard-coded, always-200 and always-allow stub. Refusal or no-effect tests whose allowed twin runs first in the same
test (or that assert an exact refusal body): 21 of 21 (AT-004, AT-005, AT-008, AT-016, AT-019 to AT-026, AT-028, AT-032, AT-038 to AT-044).

## NFR and SC checks

One row per in-scope NFR and per SC this milestone's Proves column claims.

| Id | Threshold (verbatim) | How measured | Level | When it runs | Status |
|---|---|---|---|---|---|
| NFR-010 | The system's logs hold 0 records containing a patient's name, an order's items or payment details. | AT-037 (request counts carry route groups, never ids); the log lines themselves are read in the demo smoke, step 9 | integration, manual | every M6 Done-when; G5 demo | red @ 0faedf6 (AT-037); log lines ⚠ Q-12 |
| NFR-012 | Platform staff see 0 records containing a patient's name or contact details on any page or report. | AT-007, AT-013 | integration | every M6 Done-when, then make check (Q-1) | red @ 0faedf6 |
| NFR-013 | 100 % of paid orders, their splits, and the price, stock and access histories are kept for at least 3 years. | AT-027 (the app cannot change or delete access_log); M4 and M5 tests already deny it on the other history tables; BE-21 prunes only the attempt tables | integration, review | every M6 Done-when; retention review at G-live | red @ 0faedf6 |
| NFR-014 | 100 % of privileged actions (role changes, stock adjustments, price changes, report exports) are logged with who acted and when, and reviewed by someone other than the actor. | role changes: AT-018 to AT-020 (logged), AT-031, AT-032 (Fran reviews; Sam may not); exports: the `privileged_action=finance_export` log line (CQ-6) checked by hand in the demo smoke, step 9 | integration, manual | every M6 Done-when; G5 demo | red @ 0faedf6 (role changes); export line planned: no log capture seam ⚠ Q-12 |
| SC-001 | Target about $3,000 a month (about $22.50 in fees) (aspirational) | paid amount and fees per practice per month from EP-33 (AT-001 proves the figure is computable) | measurement | report-milestone at G5 shows it can be read; measured monthly after launch | planned: measured after launch |
| SC-002 | Target 75 % or more by month 6 (aspirational) | in-house ÷ (in-house + outside-seller) volume per practice per month | measurement | after launch, once the partner supplies the baseline | n/a: the outside-seller baseline comes from the partner (PRD Q6); M6 supplies only the in-house half (EP-33) |
| SC-003 | Target set after 30 days of real orders (aspirational) | sent-to-paid share and median send-to-pay time from EP-33 (AT-002 proves both are computable) | measurement | after 30 days of real orders | planned: target set after 30 days |

## Demo smoke

5-10 steps a person can do on the running app in under 10 minutes, with synthetic data: the P1 journey, one
unhappy path and one access-denied check. `ship-milestone` turns it into `scripts/smoke.sh`; `write-demo-script`
builds on it.

| # | Step (as a person does it) | Expected (what they see) | Re-checks |
|---|---|---|---|
| 1 | Sign in as Fran Fields (finance lead) and open Financial report for a month with Ana's $60.00 and Ben's $30.00 paid orders | "$90.00 patient payments = $45.00 item cost + $44.32 provider payouts + $0.68 platform fees" and "Balanced: yes"; Gross $90.00, Net $0.68; Dr. Maya Chen $44.32 | AT-010, AT-011, AT-012 |
| 2 | Press Export | a CSV downloads with the four totals and two order numbers, no patient name; "Exported …: 4 totals and 2 orders." | AT-013 |
| 3 | Sign in as Sam Reyes (SRE) | lands on System health, not "Nothing to open yet" | AT-030 |
| 4 | Open Operations access, change Dana Ito to Data analyst with reason "new hire" | "Saved. Dana Ito is now Data analyst. The finance lead will see this in the access log." | AT-018 |
| 5 | On his own row, try to change his role | no Change role button; "You can't change your own role." | AT-020 |
| 6 | Sign in as Fran and open Access log for this month | the grant (Sam Reyes, Dana Ito, new hire) and any refused attempt marked "Refused" | AT-031 |
| 7 | Sign in as Dana Ito and open Platform health | the funnel and volume by practice, no patient name; no link to any order | AT-002, AT-004, AT-007 |
| 8 | As Dana, type the address of an order breakdown (unhappy path, access denied) | "Your role shows totals only." and "Go to your home", no amounts | AT-004 |
| 9 | Read the server log lines of steps 2 and 4 | one `privileged_action=finance_export` line with Fran's user id, the period and the row count, no amounts or names | NFR-014, NFR-010 (⚠ Q-12) |

## Red run

- Command: `out="${TMPDIR:-/tmp}/M6-acceptance-red.txt"; npx vitest run tests/acceptance/M6 >"$out" 2>&1; echo "exit=$? out=$out"`
- Run at: 2026-10-11 11:00 CDT (UTC-0500) on 0faedf6 · exit code: 1
- Output file: `/var/folders/hy/jdyfzw1d74j_zxvpgy4bysm80000gp/T/M6-acceptance-red.txt`
- Runner summary: Test Files 6 failed (6) · Tests 42 failed / 2 passed (44); the 2 passing are the green pins AT-040, AT-041
- Single-test proof: `npx vitest run tests/acceptance/M6 -t 'M6_AT_007 ' --reporter=verbose` → runs and fails only M6_AT_007 (1 failed, 43 skipped), exit 1 · `npx vitest run tests/acceptance/M6 -t 'M6_AT_999 ' --reporter=verbose` → exit 0 (44 skipped): ⚠ Q-2, vitest --help lists no fail-on-empty option for -t (only --passWithNoTests)

| AT | Test | Why it fails (assertion, or missing: <name from an approved artifact>) | First failing line |
|---|---|---|---|
| AT-001 | `M6_AT_001` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-002 | `M6_AT_002` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-003 | `M6_AT_003` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-004 | `M6_AT_004` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-005 | `M6_AT_005` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-006 | `M6_AT_006` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-007 | `M6_AT_007` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-008 | `M6_AT_008` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: fran: expected 404 to be 200 // Object.is equality |
| AT-009 | `M6_AT_009` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-010 | `M6_AT_010` | missing: EP-34 GET /api/ops/finance/report (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-011 | `M6_AT_011` | missing: EP-34 GET /api/ops/finance/report (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-012 | `M6_AT_012` | missing: EP-34 GET /api/ops/finance/report (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-013 | `M6_AT_013` | missing: EP-35 GET /api/ops/finance/export (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-014 | `M6_AT_014` | missing: EP-34 GET /api/ops/finance/report (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-015 | `M6_AT_015` | missing: EP-34 GET /api/ops/finance/report (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-016 | `M6_AT_016` | missing: EP-34 GET /api/ops/finance/report (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-017 | `M6_AT_017` | missing: EP-34 GET /api/ops/finance/report (openapi.yaml), 404 | AssertionError: month=2025-10: expected 404 to be 200 // Object.is equality |
| AT-018 | `M6_AT_018` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-019 | `M6_AT_019` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-020 | `M6_AT_020` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-021 | `M6_AT_021` | missing: EP-36 GET /api/ops/staff (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-022 | `M6_AT_022` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-023 | `M6_AT_023` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | Error: expected 409 application/problem+json /problems/stale-role, got 404 application/json { |
| AT-024 | `M6_AT_024` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | Error: expected 422 application/problem+json /problems/last-finance-lead, got 404 application/json { |
| AT-025 | `M6_AT_025` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-026 | `M6_AT_026` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | Error: expected 422 application/problem+json /problems/validation, got 404 application/json { |
| AT-027 | `M6_AT_027` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-028 | `M6_AT_028` | missing: EP-33 GET /api/ops/health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-029 | `M6_AT_029` | missing: EP-37 PUT /api/ops/staff/{userId}/role (openapi.yaml), 404 | AssertionError: expected [ 404, 404 ] to deeply equal [ 200, 409 ] |
| AT-030 | `M6_AT_030` | assertion: Sam gets S15 (200) instead of a redirect to /ops/system | AssertionError: sam: expected [ 302, 303, 307 ] to include 200 |
| AT-031 | `M6_AT_031` | missing: EP-38 GET /api/ops/access-log (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-032 | `M6_AT_032` | missing: EP-38 GET /api/ops/access-log (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-033 | `M6_AT_033` | missing: table access_log (lld.md §1) | error: relation "access_log" does not exist |
| AT-034 | `M6_AT_034` | missing: table health_pings (lld.md §1) | error: relation "health_pings" does not exist |
| AT-035 | `M6_AT_035` | missing: table health_pings (lld.md §1) | error: relation "health_pings" does not exist |
| AT-036 | `M6_AT_036` | missing: table health_pings (lld.md §1) | error: relation "health_pings" does not exist |
| AT-037 | `M6_AT_037` | missing: table request_stats (lld.md §1) | error: relation "request_stats" does not exist |
| AT-038 | `M6_AT_038` | missing: EP-39 GET /api/ops/system-health (openapi.yaml), 404 | AssertionError: expected 404 to be 200 // Object.is equality |
| AT-039 | `M6_AT_039` | assertion: S4 shows its general wrong-role copy, not "Your role can't open order breakdowns." | AssertionError: expected '<!DOCTYPE html><html><head><meta char…' to match /Your role can(?:'/&#39;/&apos;/&#x27;…/ |
| AT-042 | `M6_AT_042` | assertion: +1,000,001 units accepted (201) instead of 422 at #/change | Error: expected 422 application/problem+json /problems/validation, got 201 application/json {"product_name":"Vitamin D3 2000 IU","change":1000001,"kin |
| AT-043 | `M6_AT_043` | assertion: 10,000,001 cents accepted (200) instead of 422 at #/price_cents | Error: expected 422 application/problem+json /problems/validation, got 200 application/json {"product_id":3,"name":"Omega-3 Fish Oil","unit_cost_cents |
| AT-044 | `M6_AT_044` | assertion: 409 invalid-transition has no from and event members | AssertionError: expected { …(3) } to match object { from: 'paid', event: 'cancel' } |

```text
Test Files  6 failed (6)
Tests  42 failed / 2 passed (44)
FAIL M6_AT_001: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_002: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_003: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_004: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_005: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_006: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_007: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_008: AssertionError: fran: expected 404 to be 200 // Object.is equality
FAIL M6_AT_009: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_010: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_011: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_012: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_013: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_014: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_015: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_016: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_017: AssertionError: month=2025-10: expected 404 to be 200 // Object.is equality
FAIL M6_AT_018: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_019: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_020: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_021: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_022: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_023: Error: expected 409 application/problem+json /problems/stale-role, got 404 application/json {
FAIL M6_AT_024: Error: expected 422 application/problem+json /problems/last-finance-lead, got 404 application/json {
FAIL M6_AT_025: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_026: Error: expected 422 application/problem+json /problems/validation, got 404 application/json {
FAIL M6_AT_027: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_028: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_029: AssertionError: expected [ 404, 404 ] to deeply equal [ 200, 409 ]
FAIL M6_AT_030: AssertionError: sam: expected [ 302, 303, 307 ] to include 200
FAIL M6_AT_031: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_032: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_033: error: relation "access_log" does not exist
FAIL M6_AT_034: error: relation "health_pings" does not exist
FAIL M6_AT_035: error: relation "health_pings" does not exist
FAIL M6_AT_036: error: relation "health_pings" does not exist
FAIL M6_AT_037: error: relation "request_stats" does not exist
FAIL M6_AT_038: AssertionError: expected 404 to be 200 // Object.is equality
FAIL M6_AT_039: AssertionError: expected '<!DOCTYPE html><html><head><meta char…' to match /Your role can(?:'/&#39;/&apos;/&#x
FAIL M6_AT_042: Error: expected 422 application/problem+json /problems/validation, got 201 application/json {"product_name":"V
FAIL M6_AT_043: Error: expected 422 application/problem+json /problems/validation, got 200 application/json {"product_id":3,"n
FAIL M6_AT_044: AssertionError: expected { …(3) } to match object { from: 'paid', event: 'cancel' }
--- single-test proofs: npx vitest run tests/acceptance/M6 -t '<id> ' --reporter=verbose ---
-- real id
×  M6_AT_007
Test Files  1 failed / 5 skipped (6)
Tests  1 failed / 43 skipped (44)
exit=1
-- missing id
Test Files  6 skipped (6)
Tests  44 skipped (44)
exit=0
-- pins
✓  M6_AT_040
✓  M6_AT_041
Tests  2 passed / 3 skipped (5)
exit=0
```

## Spec gaps and questions

Pass 1, 2026-10-11. No live human (dispatched job M6-ACC): each gap is written with its recommendation, the tests
follow the recommendation, and none is asked; the human answers at G4.

| Q | Question | Recommended (and why) | Answer (verbatim) | Blocks | Status |
|---|---|---|---|---|---|
| Q-1 | Does `make check` run the M6 acceptance tests while M6 is built? | no: each task's Done-when runs its own AT ids, and the last M6 task adds a `test-acceptance-m6` target to `check` (the M5 Q-2 pattern), because progress tests would keep every task red | not asked | every AT | ⚠ open (→ G4) |
| Q-2 | The single-test command exits 0 when no test matches, so a mistyped id in a Done-when would pass with zero tests. How should slice-tasks write Done-when lines? | count passing ids: `npx vitest run tests/acceptance/M6 -t '<ids>' --reporter=verbose 2>&1 / grep -c '✓ M6_AT_'` must equal the number of ids (M5 Q-5), because vitest has no fail-on-empty option for `-t` | not asked | every task's Done-when | ⚠ open (→ G4) |
| Q-3 | AT-040 and AT-041 already pass (the review list and stock adjustments refuse the data analyst and SRE since M4 and M5). Keep them as green pins? | yes, as M5 Q-1 allowed: FR-052 is an access rule (always tested) and these pins guard it when M6 widens the role lists | not asked | AT-040, AT-041 | ⚠ open (→ G4) |
| Q-4 | FR-048 asks for the sent-to-paid rate, but `PlatformHealth.measures` names no measure and gives no unit. How is the rate given? | as one `measures` entry whose value is the percent (80 for 8 of 10), with alert line null, like the `_percent` fields of SystemHealth, because a share 0.8 next to counts reads as a count | not asked | AT-002 | ⚠ open (→ G4) |
| Q-5 | The median time to pay over an even count: the average of the middle two, or the lower one? | the average (PostgreSQL percentile_cont), rounded to whole minutes, because that is the usual median | not asked | EDGE-051 | ⚠ open (→ G4) |
| Q-6 | The export's columns are not specified (cents or dollars, header row, line layout). What is the format? | a header row; totals then one line per paid order; amounts in whole cents as integers (the API's Cents), and only numbers and order numbers, so no cell can start with "=" | not asked | AT-013, EDGE-058 | ⚠ open (→ G4) |
| Q-7 | How are availability, error-rate and slow-page percents rounded? | one decimal place, half-up, on the page; the API may return the unrounded value (the test accepts ±0.05) | not asked | AT-034, EDGE-052 | ⚠ open (→ G4) |
| Q-8 | S4's wrong-role copy is "Only platform reviewers can see order breakdowns.", but S10 and SEQ-8 give the data analyst "Your role shows totals only." and S14 and SEQ-12 give the SRE "Your role can't open order breakdowns." on the same page. Which shows? | the role-specific copy for those two roles, and S4's general copy for everyone else, because it is the later, more specific design and tells each person why | not asked | AT-004, AT-039 | ⚠ open (→ G4) |
| Q-9 | FR-052 says "only the operations specialist" works the review list, but lld.md BE-4 gives the finance lead the same list (ORDER_REVIEWER_ROLES) and S11 sends Fran to it for a gap order. Is the finance lead allowed? | yes, keep the approved LLD: Fran needs the review list to follow a gap order (S11 Edge data); FR-052's "only" refuses the data analyst and SRE. PRD catch-up: reword FR-052 | not asked | AT-040, EDGE-045 | ⚠ open (→ G4) |
| Q-10 | lld.md's M6 note lists the SRE's pages as `/ops/system` and `/ops/staff`, while EP-12 puts Operations access at `/ops/access`. Which path? | `/ops/access` (the endpoint table and S12), with `/ops/system` listed first so it is the SRE's home | not asked | AT-021, AT-030 | ⚠ open (→ G4) |
| Q-11 | M5.2_AT_001 (in `make check`) expects Sam and Dana to land on "Nothing to open yet"; M6 sends them to their pages (lld.md M6 note), so it goes red when ROLE_PAGES changes. Who updates it? | the supervisor runs define-acceptance on M5.2 in the same task that edits ROLE_PAGES, keeping Ana's case and moving Sam's and Dana's to M6_AT_030, so make check stays green | not asked | AT-030, M5.2_AT_001 | ⚠ open (→ G4) |
| Q-12 | The export's privileged-action log line (CQ-6) and NFR-010's logs cannot be read by these tests (no log capture seam). How are they checked? | by hand in demo smoke step 9 at G5, as a planned check, because adding a log seam is a design change | not asked | NFR-014, NFR-010 | ⚠ open (→ G4) |
| Q-13 | D83 (price and stock bounds) and D85 (invalid-transition members) are M5 decisions built in M6 with no M6 FR. Test them here? D84 (lock strength) has no observable behaviour. | yes for D83 and D85 (AT-042 to AT-044), because the M5 folder is frozen and an unbounded value still reaches the database; D84 stays untested (the M5 concurrency tests guard INV-5) | not asked | AT-042, AT-043, AT-044 | ⚠ open (→ G4) |
| Q-14 | The job file numbers the decisions "D84 from/event, D85 stock_refusals, D86 five-minute slots"; lld.md has D84 lock, D85 from/event, D86 stock_refusals, D87 slots. | follow lld.md (the approved artifact); the job's labels are off by one | from source: docs/architecture/lld.md Decisions D83 to D87 | none | answered → PRD catch-up after G4 (none needed: naming only) |

## Change log

| Date | Change | Ids | Why (approved artifact, or the human's exact words) |
|---|---|---|---|
| 2026-10-11 10:36 CDT | First draft | all | G1 and G3 re-approval 2026-10-11 10:36 CDT at docs/product/prd.md@97e8186 and lld.md (STANDING row 2026-10-10 23:09 CDT); G2 hld.md; G-ux screens.md |
| 2026-10-11 11:07 CDT | G4 acceptance answers: Q-1 to Q-13 recommendations taken; Q-11 done (M5.2 AT-001 narrowed to Ana); EDGE-039 waived (INV-9 guaranteed by one repeatable-read transaction per report and export; AT-010 tests INV-9; the M6 verifier checks the transaction in code); EDGE-007, 033, 034, 051, 058, 059 waived as recommended | Q-1 to Q-13, EDGE-007, 033, 034, 039, 051, 058, 059 | STANDING approval 2026-10-10 23:09 CDT |
