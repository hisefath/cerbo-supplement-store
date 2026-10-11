---
milestone: M5.1
slug: visual-refresh
artifact: acceptance
status: draft
written_by: define-acceptance (software-factory-kit 0.1)
written_at: 2026-10-11 07:27 CDT (UTC-0500)
base_sha: 59ce06a
inputs: "docs/product/prd.md@92d4a5f (G1), docs/architecture/lld.md@6faccb4 (G3), docs/architecture/hld.md@fea2e18 (G2), docs/design/screens.md@6faccb4 (G-ux)"
tests: tests/acceptance/M5.1/
gate: G4
---

# M5.1 acceptance: visual refresh

## Scope

| Id | Kind | Text (short) | Source |
|---|---|---|---|
| NFR-015 | NFR | every text and control colour pair meets WCAG 2.2 AA contrast | prd.md CQ-4 |
| NFR-016 | NFR | pages inside the EHR load 0 scripts, styles or fonts from another origin | prd.md CQ-4 |
| FR-005 | FR | the patient's order page (restyled, behaviour unchanged) | prd.md M5.1 row |
| FR-018 | FR | the practice prices page (restyled) | prd.md M5.1 row |
| FR-028 | FR | the practice dashboard (restyled) | prd.md M5.1 row |
| FR-030 | FR | the stock page (restyled) | prd.md M5.1 row |
| FR-045 | FR | the dashboard orders list (restyled) | prd.md M5.1 row |

Counts: `grep -E '^\| M5\.1 ' docs/product/prd.md | grep -oE '(FR|NFR)-[0-9]{3}' | sort -u | wc -l` → 7. No AE, EC, INV or SC ids: a restyle adds no behaviour (CQ-4 "Scope change: none").
Out of scope this milestone: every behaviour; the M4 and M5 suites in `make check` prove behaviour is unchanged.

## How these tests run

| Item | Value | Source |
|---|---|---|
| Framework | Vitest 5 with @nuxt/test-utils (the built app served for the file) | tests/acceptance/support/app.ts |
| Run all | `npx vitest run tests/acceptance/M5.1` | AGENTS.md acceptance command |
| Run one test (for a task's Done-when) | `npx vitest run tests/acceptance/M5.1 -t 'M5.1_AT_002 '` (exits 0 when no test matches: see Q-1) | proven in Red run |
| Test database (safe to reset?) | yes: `supplements_test` on the throwaway docker container | tests/acceptance/support/db.ts:10-19 |
| Suites | `make check` does not run tests/acceptance/M5.1 until the last M5.1 task adds it (Q-2) | Makefile test-acceptance-m5 |

## Traceability

| AT | Covers | Requirement (EARS, verbatim) | Given / When / Then (concrete values) | Technique | Level | Test (path::name) | Status |
|---|---|---|---|---|---|---|---|
| AT-001 | NFR-015 | NFR-015: 100 % of text and control colour pairs on every screen meet WCAG 2.2 AA contrast (4.5:1 for normal text, 3:1 for large text and focus rings). | **Given** the colour tokens in app/assets/css/theme.css (lld.md Theme names) **When** each text/background pair is measured **Then** ink, muted ink, white on primary, danger and white on both band ends are 4.5:1 or better; the focus ring 3:1 on white; the pale glow fails 3:1 (decoration only) | boundary | unit | `tests/acceptance/M5.1/visual-language.test.ts::M5.1_AT_001` | red @ 59ce06a |
| AT-002 | NFR-015, FR-018, FR-028, FR-030 | lld.md Theme: "no colour value is written outside theme.css" | **Given** every page and component file under app/ **When** scanned **Then** no hex or rgb() colour remains | partition | unit | `tests/acceptance/M5.1/visual-language.test.ts::M5.1_AT_002` | red @ 59ce06a |
| AT-003 | NFR-016 | NFR-016: Pages shown inside the EHR load 0 scripts, styles or fonts from any origin but the app's own. | **Given** Dr. Chen signed in **When** she opens the prices page **Then** every link and script is same-origin, every url() in its styles is same-origin, and at least one .woff2 font is served from the app (200) | error-guessing | integration | `tests/acceptance/M5.1/visual-language.test.ts::M5.1_AT_003` | red @ 59ce06a |
| AT-004 | FR-005, FR-018, FR-028, FR-030, FR-045 | screens.md Visual language (VL-2): "on every screen the title sits in a band" | **Given** Dr. Chen, Omar and Ana signed in **When** they open prices, dashboard, stock and Ana's order, and a stranger opens sign-in **Then** each page's h1 sits inside the page-band element | example | integration | `tests/acceptance/M5.1/visual-language.test.ts::M5.1_AT_004` | red @ 59ce06a |
| AT-005 | FR-039 | flows.md F7 step 2: "lands on the page she asked for, or her role's home" | **Given** a stranger, Dr. Chen and Omar **When** each opens the site root **Then** the stranger goes to sign-in; Dr. Chen to /practice/dashboard; Omar to an operations page; never a 404 | error-guessing | integration | `tests/acceptance/M5.1/visual-language.test.ts::M5.1_AT_005` | red @ c2ab86b (bug repro, specs/bugs/root-url-404-after-sign-in.md) |

## Edge cases

### Equivalence partitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-001 | FR-018 | a colour written as #abc, #aabbcc or rgba(0,0,0,.5) inside a page | none allowed outside theme.css (lld.md Theme) | AT-002 |

### Boundary values

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-002 | NFR-015 | white on the band's bright end #2563EB (5.17:1) and the focus ring #3B82F6 on white (3.68:1) | at or above 4.5:1 and 3:1 (NFR-015) | AT-001 |
| EDGE-003 | NFR-015 | white on the pale glow #8EC5F5 (1.8:1) | never behind text (screens.md band) | AT-001 |

### State transitions

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-004 | FR-005 | the order page in its states (sent, in checkout, paid, hold ended) | each keeps its M4/M5 behaviour; only the look changes (CQ-4) | not tested: behaviour is pinned by the M4 and M5 suites in make check |

### Decision tables

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-005 | FR-045 | status pill per status (Paid, Sent, In checkout, Payment failed, Needs review, Cancelled) | the status word stays; colour is never the only signal (screens.md) | not tested: the words are pinned by M5 AT-023; pill tints need a browser |

### Error guessing

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-006 | NFR-016 | a font or stylesheet fetched from fonts.googleapis.com or a CDN | refused: own origin only (NFR-016, D81) | AT-003 |
| EDGE-011 | FR-039 | a signed-in person opens the site root, or signs in with next=/ | their role's home, never a missing page (flows.md F7 step 2) | AT-005 |

### Concurrency, idempotency, double-submit

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-007 | FR-018 | n/a | n/a | not tested: a restyle adds no write path |

### Authorization and abuse

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-008 | FR-030 | a provider opening the stock page after the restyle | still refused (M5 AT-018) | not tested: pinned by M5 AT-018 in make check |

### Money, rounding, time zones

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-009 | FR-028 | dollar amounts in the restyled dashboard | unchanged values (M5 AT-022) | not tested: pinned by M5 AT-022 in make check |

### Empty, huge and unicode data

| EDGE | FR | Case (concrete) | Expected (source) | Disposition |
|---|---|---|---|---|
| EDGE-010 | FR-018 | a 60-character product name in the restyled table | wraps, nothing scrolls sideways (screens.md S5 Responsive) | not tested: needs a browser; demo smoke step 3 |

## Edge-case coverage matrix

Every in-scope FR against every group: EDGE ids, or `n/a: <why>`. No blank cell.

| FR | partition | boundary | state | decision-table | error-guess | concurrency | authz | money-time | data-shape |
|---|---|---|---|---|---|---|---|---|---|
| FR-005 | n/a: restyle only | n/a: restyle only | EDGE-004 | n/a: restyle only | n/a: restyle only | n/a: no write path | n/a: pinned by M4 suite | n/a: pinned by M5 suite | n/a: restyle only |
| FR-018 | EDGE-001 | n/a: covered by NFR-015 rows | n/a: restyle only | n/a: restyle only | n/a: restyle only | EDGE-007 | n/a: pinned by M5 AT-009 | n/a: pinned by M5 suite | EDGE-010 |
| FR-028 | n/a: covered by EDGE-001 | n/a: covered by NFR-015 rows | n/a: restyle only | n/a: restyle only | n/a: restyle only | n/a: no write path | n/a: pinned by M5 AT-026 | EDGE-009 | n/a: restyle only |
| FR-030 | n/a: covered by EDGE-001 | n/a: covered by NFR-015 rows | n/a: restyle only | n/a: restyle only | n/a: restyle only | n/a: no write path | EDGE-008 | n/a: units, not money | n/a: restyle only |
| FR-045 | n/a: covered by EDGE-001 | n/a: covered by NFR-015 rows | n/a: restyle only | EDGE-005 | n/a: restyle only | n/a: no write path | n/a: pinned by M5 AT-026 | n/a: pinned by M5 suite | n/a: restyle only |

## Silent-success guards

Ways a test could pass while the feature is wrong (`references/silent-success.md`), and how these tests stop it.

| SS | How a test could pass while the feature is wrong | Tests at risk | Guard used in those tests |
|---|---|---|---|
| SS-01 | the theme file exists but holds no tokens, so every pair is "missing" and nothing is checked | AT-001 | a missing token fails the pair; the glow pair is triangulated to fail 3:1 |
| SS-02 | the scan finds no files, so no colours are found | AT-002 | the scan must see more than 10 .vue files |
| SS-03 | the page has no stylesheet or font at all, so "no third-party url" passes | AT-003 | at least one .woff2 must be found and served 200 |
| SS-04 | a page that 404s or redirects has no band and no third-party link | AT-003, AT-004 | each page must answer 200 with an h1 first (live twin) |

## NFR and SC checks

| Id | Threshold (verbatim) | How measured | When |
|---|---|---|---|
| NFR-015 | 4.5:1 for normal text, 3:1 for large text and focus rings | AT-001 over the theme tokens; status-pill tints by eye in the demo | make check (after the last M5.1 task) |
| NFR-016 | 0 scripts, styles or fonts from any origin but the app's own | AT-003; CSP header by smoke SM-6/SM-7 on the deployed app | make check; ship-milestone |

## Demo smoke

| Step | What the person does | What they see | Re-checks |
|---|---|---|---|
| 1 | Dr. Chen signs in | the sign-in title in the sky band, serif title | AT-004 |
| 2 | opens Practice prices | white cards on a pale page, glowing blue "Change price" button | AT-001, AT-004 |
| 3 | changes a price with a 60-character reason | it saves; long text wraps, nothing scrolls sideways | M5 AT-001 |
| 4 | opens Practice dashboard | status pills with their words; numbers line up | AT-004 |
| 5 | Omar opens Stock and tabs through | a blue focus ring on every control | AT-001 |
| 6 | Ana opens her order and pays | the band title, the receipt as before | AT-004, M4 suite |
| 7 | Dr. Chen opens Stock (unhappy path) | refused with the same words as before | M5 AT-018 |

## Red run

- Command: `out=/var/folders/hy/jdyfzw1d74j_zxvpgy4bysm80000gp/T/M5.1-acceptance-red.txt; npx vitest run tests/acceptance/M5.1 --reporter=verbose >"$out" 2>&1; echo "exit=$? out=$out"`
- Run at: 2026-10-11 07:27 CDT (UTC-0500) on 59ce06a (plus the uncommitted M5.1 test file) · exit code: 1
- Output file: `/var/folders/hy/jdyfzw1d74j_zxvpgy4bysm80000gp/T/M5.1-acceptance-red.txt`
- Runner summary: Tests 4 failed (4)
- Single-test proof: `npx vitest run tests/acceptance/M5.1 -t 'M5.1_AT_002 '` → Tests 1 failed / 3 skipped (4) · `-t 'M5.1_AT_999 '` → Tests 4 skipped, exit 0: ⚠ Q-1

| AT | Test | Why it fails (assertion, or missing: <name from an approved artifact>) | First failing line |
|---|---|---|---|
| AT-001 | `M5.1_AT_001 every colour pair in the theme …` | missing: app/assets/css/theme.css (lld.md Theme) | app/assets/css/theme.css exists (lld.md Theme): expected false to be true |
| AT-002 | `M5.1_AT_002 no colour value is written outside …` | assertion: 43 hard-coded colours in pages and components | expected [ …(43) ] to deeply equal [] |
| AT-003 | `M5.1_AT_003 the prices page loads its styles and fonts …` | assertion: no self-hosted font yet | at least one self-hosted .woff2 font: expected 0 to be greater than 0 |
| AT-004 | `M5.1_AT_004 each work screen puts its title …` | missing: the page-band element (lld.md Theme) | /practice/prices title inside .page-band: expected false to be true |
| AT-005 | `M5.1_AT_005 opening the site root lands each person …` | assertion: the root answers 404 (no page at /) | expected [ 302, 303, 307 ] to include 404 |

## Spec gaps and questions

| Q | Question | Recommended (and why) | Answer (verbatim) | Blocks | Status |
|---|---|---|---|---|---|
| Q-1 | The single-test command exits 0 when no test matches; how do Done-when lines guard a mistyped id? | count the passing ids, as M5 Q-5 | STANDING approval 2026-10-10 23:09 CDT | every Done-when | answered |
| Q-2 | Does make check run tests/acceptance/M5.1 while M5.1 is built? | no: the last M5.1 task adds a test-acceptance-m5.1 target to check (the M5 Q-2 pattern) | STANDING approval 2026-10-10 23:09 CDT | every AT | answered |

## Change log

| Date | Change | Ids | Why (approved artifact, or the human's exact words) |
|---|---|---|---|
| 2026-10-11 07:27 CDT (UTC-0500) | First draft | all | G1 prd.md@92d4a5f (CQ-4), G3 lld.md@6faccb4, G-ux screens.md@6faccb4; STANDING approval 2026-10-10 23:09 CDT |
| 2026-10-11 08:04 CDT | Bug repro found in the M5.1 browser check: the site root 404s after sign-in | AT-005, EDGE-011 | STANDING approval 2026-10-10 23:09 CDT |
| 2026-10-11 08:12 CDT | Review pass 1: AT-001 adds control-border, focus-on-page and status-pill pairs (R2, R5); AT-002 also refuses hsl() and 4/8-digit hex (R3); AT-004 requires the h1 inside the band (R1). AT-001 red until M5.1-T005 adds --color-control-border | AT-001, AT-002, AT-004 | M5.1-pass1 R1, R2, R3, R5; STANDING approval 2026-10-10 23:09 CDT |
