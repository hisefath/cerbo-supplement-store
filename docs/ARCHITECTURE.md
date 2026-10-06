# Architecture: concepts, trade-offs, and why

This is the companion to [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md), which has the diagrams. That document shows *what* the system is. This one explains the engineering concepts it relies on and the trade-offs behind each choice.

---

## Stack

| Layer | Choice | Why | What it costs |
|---|---|---|---|
| Language/framework | **PHP 8.5 + Laravel 13** | It's Cerbo's production stack (their engineering roles list PHP/Laravel), so reviewers read it in their own idiom and it could be lifted toward their codebase. Batteries included: migrations, validation, CSRF, DB transactions with `lockForUpdate`, a service container for seams, mail drivers, and a test harness. So almost every line written here is domain code. | Skeleton files a micro-framework wouldn't have. Accepted: they're the standard Laravel layout every Laravel engineer navigates blind. |
| UI | **Server-rendered Blade**, one small `fetch` for the live quote | The brief explicitly doesn't grade styling. Server rendering means one deployable, no build step, and no client-side money math. | Less slick UX. Fine for a slice. |
| DB (prod) | **Postgres** (Railway managed) | Real row locks (`SELECT … FOR UPDATE`), CHECK constraints, and partial unique indexes: the guarantees the money flow relies on. | A managed service to run. Trivial on Railway. |
| DB (dev/test) | **SQLite** (default), Postgres optional | Clone → `composer setup` → running, with no Docker. The suite is also run against Postgres so prod-only guarantees are exercised. | Two engines to keep portable. Mitigated by using only portable SQL plus guarded Postgres-only CHECKs. |
| Deploy | **Docker (FrankenPHP) on Railway** | A reproducible image that runs anywhere (Railway, Fly, ECS). FrankenPHP is a production-grade PHP app server in one binary, so no nginx + php-fpm pair. | Railway-specific env wiring (documented). |

**Alternatives considered.** Python/FastAPI or Node/Next.js would have been equally quick to write, but neither matches the partner's stack, and the evaluation is about judgment, not language. A Next.js SPA would add a client build and tempt duplicating money math in JS.

---

## Concepts the design relies on

### 1. Integer minor units, basis points, explicit rounding
Money is stored and computed as **integer cents** (`int`, 64-bit). Floats can't represent 0.1 exactly, and errors compound across sums. The fee rate is an **integer in basis points** (`fee_bps` = 75 = 0.75%, snapshotted per order), so `fee = intdiv(subtotal × fee_bps + 5000, 10000)` is exact integer math with **round-half-up** written into the formula. Prices entered as text ("24.99") are parsed with a strict grammar (`^\$?\d{1,5}(\.\d{1,2})?$`) straight into cents and never pass through a float. Columns are `bigint`. The one float in the UI is the markup-% helper, and it only *fills the price field*: the server only ever sees, validates, and stores the price string.

### 2. Invariants by construction
`provider_payout = subtotal − cogs − fee` is computed as the **residual**, so `subtotal = cogs + fee + payout` holds by construction and can't be broken by rounding. Rounding error has to land somewhere, and this puts it deterministically in one place: the provider's payout, by at most ½¢. That's documented, not hidden.

### 3. Snapshotting (quote locking)
When an order is sent, `unit_price`, `unit_cost`, and `fee_bps` are copied onto the order and its lines. The catalog is mutable reference data, and an order is a **historical fact**. Without snapshots, a cost change or fee change tomorrow would silently rewrite yesterday's books, and the provider's quoted payout could change after they agreed to it.

### 4. Double-entry ledger (append-only)
Each successful payment posts entries whose amounts **sum to zero**: debit `processor_clearing` (cash in), credit `inventory_cogs`, `provider_payable`, and `platform_fee_revenue`. Why bother when the order row already has the split?
- The order row is a **quote**. The ledger is **what happened**. Verifying they agree is the audit.
- Future events (refunds, payouts, chargebacks) become **new** balanced entries (reversals), never edits, so history is never rewritten.
- Balances fall out of a `SUM`: GMV = Σ clearing, fee revenue = −Σ fee account, owed to provider = −Σ payable.

*Simplification:* this is a **settlement ledger** (where the patient's cents went), not a full GAAP chart of accounts (revenue recognition, inventory asset vs COGS expense). That's the right altitude for the question being asked.

### 5. Explicit state machine with guarded transitions
`awaiting_payment → processing → paid`, with `processing → awaiting_payment` on decline. Every transition reads the current status **under a row lock** and refuses if it's not the expected one (compare-and-set). This turns "two requests raced" from a data-corruption bug into a rejected request.

### 6. Pessimistic locking vs optimistic
Checkout uses **pessimistic** row locks (`SELECT … FOR UPDATE`) on the order, held only for the milliseconds of the reserve and settle phases. Optimistic concurrency (a version column, retry on conflict) would also work, but checkout contention per order is near zero and the lock code is simpler to reason about. Stock uses an **atomic conditional update** (`UPDATE … SET stock = stock − q WHERE stock >= q`, check affected rows), so oversell is impossible without a separate read-then-write. **Lock order** is always: order row, then products by ascending id, then payment row. Two checkouts that share products therefore can't deadlock.

### 7. Idempotency keys
The pay form carries a server-minted key: **one key = one attempt**. Each render of the checkout page mints a new key, and every POST redirects back to that page, so a retry after a decline is a new attempt. The key is `UNIQUE` on `payments`, scoped to its order, and passed to the gateway. A retry of the *same* attempt (double-click, network retry, refresh) replays the stored outcome, decline included, instead of charging again. This is the standard Stripe-style contract and the one that matters most in payments: **at-least-once delivery + idempotent handling = effectively exactly-once**.

*Why keep it when the order lock already blocks a second payment?* The lock stops *different* attempts from racing. The key makes the *same* attempt safe to repeat. Without it, a double-click on a declined card would fire a second charge attempt, because by then the order is back to `awaiting_payment`. A client whose response got lost (mobile, an EHR integration) also needs it to retry safely. A design reviewer suggested cutting it. I kept it for these two reasons.

### 8. Never hold a DB transaction across a network call
A real payment call takes 300 ms to several seconds and can hang. Holding row locks or a transaction across it ties up connections and serializes checkout. So payment is split into **reserve (txn) → charge (no txn) → settle (txn)**. This is a small saga with a compensating action (release stock) on failure. The cost is an intermediate `processing` state that needs a **reconcile job** for crashes mid-flight. That's documented as the known gap.

### 9. Reservation pattern for inventory
Stock is decremented at **reserve** (before charging) and released on decline. The alternative orders are worse:
- Charge first, then decrement: risks charging for something out of stock, which then needs a refund.
- Decrement at quote: unpaid links would hold stock hostage.

### 10. Ports and adapters (seams)
External systems sit behind boundaries the app owns:
- `PaymentGateway::charge(amountCents, paymentMethod, idempotencyKey)` is an interface bound in the service container. The fake declines based on the payment method, as Stripe test methods do, so no test flag reaches the domain. Tests bind a call-counting spy, and production would bind Stripe.
- Mail goes through Laravel's mailer, so the driver is a config value.
- Auth is one middleware that answers "who is the acting provider".

Swapping a stub for the real thing touches the adapter and the binding, not the domain code.

### 11. Authorization ≠ authentication
Authentication is stubbed (an "acting as" switcher), but **authorization is real**:
- Every provider route scopes queries to the acting provider, and another provider's order returns 404.
- Patients reach an order only through an unguessable **capability URL**: a 40-character random token.
- The patient view never exposes COGS or margin.

### 12. Derived metrics from the system of record
Platform GMV and fee revenue are computed from **ledger rows**, not from order headers or a counter. There's one source of truth, so the headline metric can't drift from what was actually charged. "Volume migrated" is computable from `orders.paid_at` and `provider_id`.

### 13. Defense in depth
Each guarantee is enforced at more than one layer:
- In code: `Split` asserts its invariant, and the ledger asserts Σ = 0 before insert.
- In the DB: unique and partial-unique indexes, plus Postgres CHECK constraints.
- After the fact: `ledger:verify` re-checks everything, and tests exercise the failure paths.

---

## Trade-off log

| Decision | Chosen | Rejected alternative | Why |
|---|---|---|---|
| Fee granularity | Once per order | Per line, summed | The fee is "on the transaction". Per-line rounding makes the fee depend on how the cart is split. |
| Who bears the fee | Provider (out of margin) | Patient surcharge; platform absorbs | Patient pays exactly the quoted price, and the platform's take stays explicit. Flagged as a product decision (at-cost providers). |
| Rounding | Half-up, residual to payout | Banker's rounding; largest-remainder per line | Simplest explainable rule. Residual placement makes the invariant exact. |
| Split storage | Columns on order **and** ledger rows | Ledger only; order only | Quote vs actual, cross-checked. Ledger-only makes the provider's quote non-reproducible. Order-only can't represent refunds and payouts. |
| Stock model | `stock_on_hand` column + movements log | Stock = Σ movements (pure event-sourced) | Column makes the conditional decrement a single atomic `UPDATE`. The log provides the audit, and verify checks they agree. |
| Payment flow | Reserve → charge → settle | One transaction around the gateway call | Never hold locks across network I/O. Costs a `processing` state plus a reconcile job (documented). |
| Patient access | Random token column | Laravel signed URLs | A DB token can be revoked or rotated, and is the same mechanism for email and SMS. Signed URLs can't be revoked without expiry. |
| Live quote | Server endpoint reusing `Split` | Re-implement split in JS | One implementation of money math. A JS copy would drift. |
| Order drafts / cancel / refund | Cancel built; drafts and refunds not | Full lifecycle | A sent link must be withdrawable, and cancel takes the same row lock as pay, so they can't both win. Drafts and refunds are listed as next. |
| Markup helper | Kept (markup on cost, whole %) | Price-only input (two reviewers suggested it) | The brief says "price (or margin)". The helper only fills the price field; the live quote shows margin and payout from the server. |
| Movements on checkout | `reserve` / `release` movements | Only log manual adjustments (a reviewer suggested it) | Then *every* stock change goes through one method with an audit row, and the stock invariant is just `stock == Σ delta`. |
| Ledger immutability | Model guard (+ prod: revoke UPDATE/DELETE) | DB triggers | Triggers differ between SQLite and Postgres. A DB role grant is the real prod control. |

## Known limitations (honest list)

- **Crash between charge and settle** leaves an order in `processing`. A reconcile job is designed but not built.
- **No refunds, payouts, cancellations, or recurring orders.** The ledger is shaped for them as reversal and settlement entries.
- **Inventory editing sits on the provider dashboard** because FR5 asks for it. In production it would be an ops-only role.
- **SQLite ignores `FOR UPDATE`.** It serializes writers globally instead (`transaction_mode = IMMEDIATE`), which is correct but coarse. Postgres is the engine of record.
- **Stubbed auth** means anyone with the demo URL can act as a demo provider. `/platform` (the finance view) is unauthenticated on the demo. Demo data only.
- **Race tests are deterministic, not concurrent.** They simulate the in-flight state and hit the DB indexes directly. A real concurrent soak test against Postgres is next.
- **Times display in UTC.** Per-practice time zones would come from the EHR.
