# Bug: Pay after the hold ended says "This order is already paid."

- Found: 2026-10-10 23:37 CDT, by the M5-T008 worker (result.md Q2), outside its Owns.
- Cause: M5-T007 runs the FM-7 reconcile (BE-9.expireHoldIfDue) at the start of BE-10.pay. With no payment in flight, that also ends a due hold and puts the order back to `sent`. Transaction 1 then saw `sent` and answered `/problems/invalid-transition`, which FE-8 shows as "This order is already paid." lld.md says Pay after the hold ends answers 409 `/problems/checkout-expired` (problem registry; SM-1).
- Repro: tests/acceptance/M5/close-out.test.ts::M5_AT_042 failed with "got 409 /problems/invalid-transition".
- Fix: server/services/payments.ts: an order that is `sent` with `checkout_started_at` set answers checkout-expired.
- Verified: AT-042 green; make check exit 0 (unit 216, M4 43, M5 42).
- Approval: STANDING row 2026-10-10 23:09 CDT.
