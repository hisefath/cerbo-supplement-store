# Bug: the demo reset fails once the M5 tables exist

- Found: 2026-10-11, during the M5 deploy (supervisor read db/seed/demo.ts before the migration step).
- Cause: db/seed/demo.ts truncates a fixed list of M4 tables. M5 added price_changes and stock_movements, which reference orders, products and users; Postgres refuses a TRUNCATE of a table referenced by a table outside the list, so `scripts/railway-setup.sh` without `--skip-seed` stops at step 5.
- Workaround used: the M5 deploy ran `scripts/railway-setup.sh --skip-seed` (human run).
- Repro: tests/unit/seed-demo.test.ts "names every table the migrations create" failed (no exported list; 2 tables missing).
- Fix: the list is now RESET_TABLES, exported, and names every table; the unit test compares it with every `create table` in db/migrations, so a future table cannot be forgotten.
- Verified: tests/unit/seed-demo.test.ts 78 passed.
- Approval: STANDING row 2026-10-10 23:09 CDT (2026-10-11 07:55 CDT).
