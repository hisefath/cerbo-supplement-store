---
learning: test-every-role-home-target
date: 2026-10-11
project: cerbo-supplement-store
finding: F42
proposal: none
layer: Tests/types
status: proposed
---

# A table that sends people somewhere is tested as a whole: every entry must open a real page.

## What happened

After signing in, people landed on 404 pages in production: a patient's home was /orders before that page
existed, and the site root had no page. The verifier flagged the patient case twice (M4-pass4 R9, M5.1-pass1 R6),
but the M5.1 row was filed rather than fixed, and the landing tests checked three hand-picked roles. The human
found it: "everytime i log in, i get 404s". It took M5.2 and M6.1 to fix.

## Why it happened

1. Some roles' homes pointed at routes that had no page.
2. The tests sampled roles instead of walking `ROLE_PAGES`, so a new entry never had to resolve.
3. Harness gap: no acceptance test iterates the navigation table, so a filed review row was the only signal,
   and nothing stops a filed row from shipping.

## The rule now

One acceptance test signs in a seeded user for every `ROLE_PAGES` role and opens every listed path (200, no
not-found copy).
- Enforced by: routed to define-acceptance (FINDINGS F42); no harness diff.
- Interview line: "We stopped testing three roles we remembered and started testing the routing table itself, so
  adding a role without its page fails the build."

## Evidence

- human 2026-10-11 09:37: "everytime i log in, i get 404s" ; M5.1-pass1 R6 file per Approvals 2026-10-11 08:12 CDT ; M5.2-pass1 R1 fix per Approvals 2026-10-11 09:52 CDT ; M6.1-pass1 R1 fix per Approvals 2026-10-11 14:17 CDT ; specs/bugs/root-url-404-after-sign-in.md
- Guard: the new test fails when `ROLE_PAGES` gains a path with no page under app/pages
- Factory record: `FINDINGS.md` F42
