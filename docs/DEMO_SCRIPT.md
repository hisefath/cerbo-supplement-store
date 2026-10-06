# Demo video script (about 5 minutes)

Record at https://supplement-store-slice.up.railway.app, where the live data works as-is. Or record locally with `php artisan serve --port=8100`, running `php artisan migrate:fresh --seed` first for clean data. The script follows the brief's grading: core-flow integrity first, then judgment, then AI use.

| Time | Screen | Say |
|---|---|---|
| 0:00 | README on GitLab | "Today providers front the money on a third-party marketplace and chase reimbursement. I built the in-EHR slice: the provider sets the price, the patient pays the platform directly, and every cent of the split is recorded and auditable. Laravel, because it's Cerbo's stack." |
| 0:25 | **Dashboard** (Dr. Maya) | Point at the KPIs: GMV, *earnings = margin net of fee*, fees. Then the sold-by-product table and inventory. "Auth is stubbed; this switcher is the seam. Authorization is real: another provider's order is a 404." |
| 0:50 | **New order** → patient Priya | Set Omega-3 qty 1 and type **50** in markup %, which fills $24.75. Set Curcumin qty 2. "The quote is computed by the same server code that persists the order. There's no money math in JS." Read out: total, COGS, margin, **fee = 75 bps of the total, rounded half-up**, payout. |
| 1:30 | Same page | Set Probiotic qty **5**. Error: "only 4 in stock". Set it back to 0. Then set a price below cost to show the error, and fix it. |
| 1:50 | **Send** → audit page | "Price, cost, and fee rate are snapshotted now. Changing the catalog tomorrow can't change this quote. The patient gets an emailed link; email is stubbed to the log." Click **open the patient checkout**. |
| 2:10 | **Patient checkout** | "The patient sees prices and the total, never cost or margin. No card fields: payment is a fake gateway behind an interface." Click **Simulate a declined card** → message. Click **Pay**. |
| 2:35 | Back on the **audit page** (refresh) | Walk top to bottom: payment attempts (failed, then succeeded, each with its own idempotency key) · ledger (debits = credits, four accounts) · movements (reserve, release, reserve) · **audit checks**. "The audit recomputes the split from the line snapshots, so a wrong number can't hide behind a copy of itself." |
| 3:20 | **Platform metrics** | "GMV and fee revenue come straight from the ledger. The effective rate is a hair over 75 bps because each small order rounds half-up. Weekly paid orders and active providers are the 'volume migrated' leading indicator. The books check runs live here." |
| 3:45 | Editor: `app/Money/Split.php` | "Payout is the residual, so the invariant is exact." |
| 3:55 | Editor: `app/Services/CheckoutService.php` | "Reserve, charge, settle. No DB lock is held across the processor call. There are three layers against double charge: the idempotency key, the row lock with a status check, and a partial unique index." |
| 4:15 | Terminal: `php artisan test` then `php artisan ledger:verify` | "26 tests: 5,000 random carts against a rounding oracle, plus each failure path, on SQLite and Postgres in CI. I mutation-tested them: breaking the rounding fails 7 tests." |
| 4:35 | `docs/AI_USAGE.md` | "AI built this with me, but I ran adversarial review panels on the design and the code, overrode some of their recommendations, and caught the AI overclaiming in my own docs. It's all logged." |
| 4:55 | README "What's next" | "Deliberately cut: refunds, payouts, recurring orders, drafts, tax and shipping, and real auth. Next: a reconcile job for stuck payments, refunds as reversal entries, Stripe Connect for payouts, and recurring protocols." |

**Tip:** if a reviewer wants to see tamper detection, `tests/Feature/OrderFlowTest.php::test_ledger_verify_catches_tampering` shifts one cent and `ledger:verify` names the order and the failed check.
