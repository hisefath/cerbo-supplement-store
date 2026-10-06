# Supplement Store: in-EHR supplement ordering (Cerbo partner project)

A working vertical slice of a supplement store inside an EHR:

- A **provider** builds a supplement order for their patient and sets the price.
- The **patient pays the platform directly**.
- The system computes, persists, and audits **where every cent went**: item cost (COGS), the provider's margin, and the platform's **75 bps** fee.

| | |
|---|---|
| **Live demo** | https://supplement-store-slice.up.railway.app |
| **Video demo** | _(link pending; script in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md))_ |
| **Repo (GitLab, primary)** | https://labs.gauntletai.com/sefathchowdhury/cerbo-supplement-store |
| **Repo (GitHub mirror)** | https://github.com/hisefath/cerbo-supplement-store |
| **Docs** | [PRD](docs/PRD.md) · [System design + diagrams](docs/SYSTEM_DESIGN.md) · [Architecture & trade-offs](docs/ARCHITECTURE.md) · [AI usage log](docs/AI_USAGE.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Mermaid sources](docs/diagrams/) |
| **Stack** | PHP 8.5 · Laravel 13 · Blade · Postgres (prod) / SQLite (dev) · FrankenPHP on Railway |

---

## Try it in two minutes (live demo)

1. **Dashboard.** You're "logged in" as Dr. Maya Okafor; the stub login switcher is top right. You can see sales, earnings, stock, and recent orders.
2. **New order.** Pick a patient. Set a quantity on a few supplements and type a price or a markup %. The **quote** updates live from the server: what the patient pays, COGS, your gross margin, the 75 bps fee, and your payout.
3. **Send.** You land on the order's audit page. Click **open the patient checkout**. This is the link the patient would get by email; email is stubbed.
4. **As the patient,** try **Simulate a declined card**, then **Pay**. The patient never sees cost or margin.
5. **Back on the audit page**, you'll see:
   - the price and cost snapshots;
   - the split, which adds up to the cent;
   - both payment attempts;
   - the double-entry ledger, with debits equal to credits;
   - stock reserve/release movements;
   - the automated audit checks (split recomputed from the snapshots, one payment, ledger balanced and matching, stock movements matching the lines).
6. **Platform metrics** shows GMV and fee revenue computed **from the ledger**, by provider and by week, plus a live run of the books check.

## The money rules

All money is integer cents, with no floats anywhere. For an order:

```
subtotal (GMV)   = Σ qty × unit_price                       what the patient pays
cogs             = Σ qty × unit_cost                        platform keeps (it owns the inventory)
platform_fee     = round_half_up(subtotal × fee_bps / 10000)  fee_bps = 75, once per order
provider_payout  = subtotal − cogs − platform_fee           the provider's margin net of the fee
```

Payout is the **residual**, so `subtotal = cogs + fee + payout` holds exactly. Worked example (order #1 in the demo): 2 × $24.00 + 1 × $15.99 = **$63.99**, which splits into $32.50 COGS + **$0.48** fee + **$31.01** payout.

At payment, a balanced settlement ledger is posted:

| account | |
|---|---|
| `processor_clearing` | +6399 |
| `inventory_cogs` | −3250 |
| `provider_payable` | −3101 |
| `platform_fee_revenue` | −48 |

`php artisan ledger:verify` re-checks every order and every product's stock, and exits non-zero on any discrepancy.

## What's stubbed, and where the seam is

| External | Stub | Swap point |
|---|---|---|
| Payments | `FakePaymentGateway`: approves `pm_fake_visa` and declines `pm_fake_declined`. No card fields anywhere. | `App\Payments\PaymentGateway::charge(amountCents, paymentMethod, idempotencyKey)`, bound in `AppServiceProvider`. Real: Stripe (Connect application fee + transfer). |
| Auth | "Acting as" provider switcher (session). Patients reach an order only through a 40-char random link. | `ActingProvider` middleware. Real: the EHR session or SSO. **Authorization is real:** every provider query is scoped, and another provider's order is a 404. |
| Email | Laravel `log` mailer. The payment-link email goes to the app log, and the link is shown on the order page. | `MAIL_MAILER` env var. |
| Shipping | A log line when an order is paid | The marked hook in `CheckoutService::settle`. |
| Provider payouts | Recorded as a `provider_payable` ledger balance | Future payout batch, posted as a debit to `provider_payable`. |

## Run it locally

Requires PHP 8.4+ and Composer. No Node and no Docker.

```bash
composer setup
```

```bash
php artisan serve --port=8100
```

Then open http://localhost:8100. Other useful commands:

```bash
php artisan test
```

```bash
php artisan ledger:verify
```

```bash
php artisan migrate:fresh --seed
```

The last one resets the demo data. The suite also runs unchanged against Postgres, which exercises the CHECK constraints and the partial unique index. Create the database first with `createdb store_test`; the credentials below are placeholders:

```bash
DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5432 DB_DATABASE=store_test DB_USERNAME=postgres DB_PASSWORD=secret php artisan test
```

## Code map

About 2,000 hand-written lines; everything else is the standard Laravel skeleton.

| Path | What |
|---|---|
| `app/Money/Split.php` | The split math: pure, integer-only, takes `fee_bps`. |
| `app/Money/Money.php` | Strict dollar-string → cents parser and formatter. |
| `app/Services/OrderService.php` | Quote (shared by the live preview and send), send (snapshot + link), cancel. |
| `app/Services/CheckoutService.php` | Payment: **reserve → charge → settle**, with idempotency, lock ordering, and stock reservation. |
| `app/Services/Ledger.php` | Ledger posting (Σ = 0 asserted), per-order audit, and verify-all. |
| `app/Models/Product.php` | `adjustStock()`: the only way stock changes (atomic, conditional, audited). |
| `app/Payments/` | Gateway interface, fake adapter, and result object. |
| `database/migrations/2026_10_05_000000_create_store_tables.php` | Schema: bigint cents, unique and partial-unique indexes, Postgres CHECKs. |
| `database/seeders/DatabaseSeeder.php` | Demo data created *through the real services*. |
| `tests/Unit/SplitTest.php` | Money rules, including 5,000 random carts against an independent rounding oracle. |
| `tests/Feature/OrderFlowTest.php` | End-to-end flow plus each failure path: decline, replay, in-flight race, out-of-stock rollback, authz, cancel, tamper detection, append-only. |

## Key decisions (full reasoning in [ARCHITECTURE.md](docs/ARCHITECTURE.md))

- **Laravel**, because it's Cerbo's production stack, so reviewers read it in their own idiom.
- **Fee = 75 bps of the subtotal, once per order, half-up, borne by the provider.** The patient pays exactly the quoted price, and the payout is the residual.
- **Snapshots at send.** Price, cost, and `fee_bps` are copied onto the order, so the quote the provider agreed to can't drift.
- **The quote on the order and the ledger are kept separately and cross-checked.** The audit recomputes from immutable line snapshots, and also checks stock movements against lines and looks for money captured but never booked.
- **Reserve → charge → settle**, never holding a DB lock across the processor call. Stock is reserved before charging and released on decline.
- **Idempotent "send order"** (a per-form key), so a double-click can't create two payable links for one patient.
- **Three layers against double charge:**
  - the idempotency key, so the same attempt replays its stored outcome;
  - the order row lock with a status check, so different attempts can't race;
  - a partial unique index, so the DB allows only one live payment per order.
- **Constraints in the database:** unique indexes everywhere, plus Postgres CHECKs for `subtotal = cogs + fee + payout`, non-negative payout, and non-negative stock.

## What I cut, and what's next

**Cut on purpose:**
- refunds;
- provider payouts (beyond the payable balance);
- recurring protocols and auto-refill;
- drafts;
- tax and shipping cost;
- catalog UX;
- real auth;
- a stuck-payment reconcile job (`ledger:verify` *detects* stuck payments; it doesn't fix them).

**Next, in order:**
1. A **reconcile job** for `pending` payments.
2. **Refunds** as reversal journal entries, plus a fee-refund policy.
3. **Stripe Connect.** The provider margin becomes a transfer to the provider's connected account, and the payout batch settles `provider_payable`.
4. **Recurring protocols**, the real volume lever for functional medicine.
5. **Instrumenting recommendations** in the existing marketplace integrations, so "volume migrated" has a real denominator.
6. A **load test**. Concurrency correctness is already checked by `scripts/race-check.sh`: 8 simultaneous payments → 1 charge, and 6 buyers for 4 units → 4 sold. It needs Postgres plus a multi-worker server; see the script's header for the two commands.

Open product question: pure at-cost dispensing makes the payout negative (by the fee). Should the platform absorb the fee for those providers?

## How I used AI

See [docs/AI_USAGE.md](docs/AI_USAGE.md). In short:
- Claude Code built this with me end to end.
- Multi-agent review panels critiqued the design and then the code, and each finding was attacked by an adversarial verifier before I acted on it.
- I overrode several AI recommendations, and caught AI overclaiming in the docs.
- I mutation-tested the money tests rather than trusting a first-try green run.
