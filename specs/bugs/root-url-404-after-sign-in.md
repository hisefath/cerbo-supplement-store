# Bug: the site root shows a 404 after sign-in

- Found: 2026-10-11 08:04 CDT, by the supervisor during the M5.1 browser check (local dev server).
- Symptom: opening the site root (the production link sent at the M5 deploy) while signed out goes to /sign-in?next=/; after signing in the person lands on / and sees "404 - Page not found".
- Cause: there is no page at /, and the sign-in page honours next=/ as "the page asked for" (flows.md F7 step 2 says: the page asked for, or the role's home).
- Repro: tests/acceptance/M5.1/visual-language.test.ts::M5.1_AT_005 (Dr. Chen opening / gets 404). Written and committed red before the fix.
- Fix: a site-root page sends the signed-in person to their role's home; the role-home table moves to one shared place used by the sign-in page and the root page.
- Not fixed here: a patient's role home (/orders, the order list) does not exist yet: M5-R03 (clarify-spec, patient order list). A patient arriving at the root still meets that gap.
- Verified: M5.1_AT_005 green; make check exit 0.
- Approval: STANDING row 2026-10-10 23:09 CDT.
