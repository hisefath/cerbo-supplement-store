---
learning: tests-must-fail-when-code-breaks
date: 2026-10-10
project: cerbo-supplement-store
finding: F11
proposal: H10
layer: Skill
status: proposed
---

# A test counts as evidence only after you have seen it fail when the code it guards is wrong.

## What happened

In M4 the verifier found four tests that stayed green whatever the code did. Rate-limit tests used a fake database
driver that ignored the SQL `WHERE` clause and the locks. A CSP test hashed a string and compared it with a hash of
the same string. A test named "names every product" used one product. Each was caught at review, and each cost a
relaunch, a smoke check or a filed follow-up.

## Why it happened

1. The tests passed while the code they claimed to guard could be wrong.
2. Red-first proves a test fails when the code is missing, not that it pins the right code. A fake that does not model
   the behaviour (filters, locks, the built output) goes green for any implementation.
3. Harness gap: implement-task asked for a red run before the code existed, but never for a red run against broken
   code, and never said when a fake is not good enough.

## The rule now

After green, break each guarded line once (flip a comparison, drop a `WHERE`, change the hashed string), paste the red
run, then restore it. Test SQL and locks against the test database, and generated config against the built output.
- Enforced by: implement-task step 8 as proposed in H10 (see the frontmatter status); mutation testing is the
  stronger option if M5 still has these rows.
- Interview line: "A green test is only evidence if I've seen it go red when the code is wrong, so I break the line
  once and watch it fail before I trust it."

## Evidence

- M4-pass5 R1, M4-pass6 R1, M4-pass7 R1 (fix) and R2 (file), dispositions in TRACKER Approvals 2026-10-10 14:54,
  15:19 and 16:15 CDT
- Guard: verifier tests-that-lie rows per milestone, 4 in M4; M5 should have 0-1
- Factory record: `FINDINGS.md` F11, `HARNESS_CHANGELOG.md` H10
