# PRD: In-EHR Supplement Store (vertical slice)

**Partner:** Cerbo (EHR for functional / integrative medicine)
**Status:** Build spec for a 1–2 day vertical slice
**Scope of this document:** what we're building, the money rules, the assumptions behind them, and how we'll know it worked.

---

## 1. Problem

Functional-medicine providers recommend supplements as part of a treatment *protocol*. Today they order through third-party marketplaces:

1. The provider picks supplements and places the order **on the patient's behalf**, outside the EHR.
2. The order ships to the patient. **The provider pays the marketplace** at point of sale.
3. **The patient reimburses the provider later**, through some other channel.

The result: providers front cash and chase reimbursements, patients get a checkout that has nothing to do with their care, nothing lands in the clinical or financial record, and every dollar of margin and fees accrues to a platform Cerbo doesn't own.

## 2. Goal

Inside the EHR, a provider can recommend supplements to a patient and set the price. **The patient pays the platform directly.** The platform keeps the item cost (it holds the inventory), routes the provider's margin to the provider, and takes a **75 bps platform fee**. Every cent of every paid order can be accounted for.

### Non-goals (this slice)

Real payment processing, auth, email, and shipping. Catalog browsing, search, imagery, and styling. Tax, shipping cost, and compliance. International or multi-currency. Warehouse modeling. Recurring protocols or auto-refill, refunds, and provider payouts are deferred to "next" (§10). Cancelling an unpaid order *is* built, because a sent link has to be withdrawable.

## 3. Users and jobs to be done

| User | Job | What success looks like |
|---|---|---|
| **Provider** (clinician running a cash-pay practice) | "Put my patient's supplement protocol in front of them at the price I choose, without fronting money." | Builds an order in under a minute, sees their exact payout before sending, and never handles reimbursement. |
| **Patient** | "Pay for what my provider recommended without a separate shopping trip." | Opens one link, sees items and total, pays once. |
| **Platform** (Cerbo finance and ops) | "Know exactly where every cent went, and measure in-house GMV." | Each paid order has a balanced ledger posting. GMV and fee revenue can be queried from the ledger. |

## 4. Core flow (happy path)

1. A provider opens **New order** for one of *their* patients and selects one or more supplements, a quantity, and a **patient-facing unit price** for each. They can type the price, or enter a whole-number **markup % on cost** that fills the price in. The price is the only thing submitted and stored.
2. A **live quote** shows the money split for the whole order: subtotal, cost of goods (COGS), 75 bps fee, and the provider's payout. It is computed server-side by the same code that will post the ledger.
3. The provider sends the order. Prices and costs are **snapshotted** onto the order lines; the quote is now locked. The patient gets a **unique payment link** (email is stubbed and logged).
4. The patient opens the link and sees the provider, the items, the prices, and the total. They do **not** see cost or margin. They pay (the payment step is simulated).
5. On a successful charge the order becomes **paid**, stock is decremented, and a **balanced ledger entry** records the split.
6. The provider dashboard shows what sold, earnings, and stock levels, and lets the provider restock or adjust inventory. A platform view shows GMV and fee revenue.

## 5. Functional requirements and acceptance criteria

| # | Requirement (from brief) | Acceptance criteria |
|---|---|---|
| FR1 | Provider assembles an order: ≥1 supplement, sets patient-facing price (or margin) per item | Can add N lines with qty and price. A markup-on-cost % helper fills the price; the live quote shows each line's margin and the order's payout. Validation: qty 1–100 and ≤ current stock (advisory; stock is reserved at payment); price matches `^\$?\d{1,5}(\.\d{1,2})?$`; unit price ≥ unit cost; provider payout ≥ $0. A provider can only order for their own patients (anything else is a 404). Double-submitting the form creates one order, not two. |
| FR2 | Patient can pay (stubbed) | A patient link shows the order and a Pay button. A simulated decline path exists, and after a decline a retry from the reloaded page succeeds. Paying twice (double-click, refresh, two tabs) never charges or posts twice. If any line is out of stock at pay time, nothing changes: no charge, no payment row, no stock movement. Cancelled orders can't be paid. |
| FR3 | Compute and persist the split: COGS, provider margin, 75 bps fee | Persisted on the order (`subtotal = cogs + fee + payout`, exactly, in integer cents) and as ledger entries at payment. |
| FR4 | Split is correct and auditable | The order audit page shows lines, snapshots, the payment record, the ledger entries, and automated checks (ledger balances, ledger matches order, payment matches total). `php artisan ledger:verify` re-checks every paid order and every product's stock. |
| FR5 | Provider dashboard: what's been sold, update inventory | **Earnings** = Σ `provider_payout_cents` of paid orders, i.e. margin net of the fee (the brief's "provider margin"). The **sold-by-product** table comes from the line snapshots of *paid* orders: units, patient sales, and gross margin before the fee. The fee is charged per order, so it isn't allocated to products. The table also lists recent orders and stock on hand. A restock or adjust form (signed delta between −1000 and +1000, never below zero) writes an audited inventory movement. Sales reserve stock automatically. |

## 6. Money rules (the contract)

All money is stored as **integer cents** (USD). No floating point anywhere in the money path.

For an order with lines `(qty, unit_price, unit_cost)`:

```
subtotal (GMV)   = Σ qty × unit_price                 # what the patient pays
cogs             = Σ qty × unit_cost                  # retained by platform (we own the inventory)
platform_fee     = round_half_up(subtotal × fee_bps / 10_000)   # fee_bps = 75, snapshotted per order
provider_payout  = subtotal − cogs − platform_fee     # provider's margin, net of the fee
invariant:  subtotal == cogs + platform_fee + provider_payout   (exact, by construction)
```

**Worked example.** Magnesium Glycinate ×2 at $24.00 (cost $12.00) and Vitamin D3+K2 ×1 at $15.99 (cost $8.50):

| | cents |
|---|---|
| subtotal | 4800 + 1599 = **6399** |
| COGS | 2400 + 850 = **3250** |
| fee | 6399 × 75 / 10000 = 47.9925 → **48** |
| provider payout | 6399 − 3250 − 48 = **3101** |
| check | 3250 + 48 + 3101 = 6399 ✓ |

**Ledger posting at payment** (double-entry, debits positive, credits negative, sum = 0):

| Account | Amount |
|---|---|
| `processor_clearing` (cash received via processor) | +6399 |
| `inventory_cogs` (platform recovers item cost) | −3250 |
| `provider_payable` (owed to the provider) | −3101 |
| `platform_fee_revenue` (the 75 bps) | −48 |

## 7. Assumptions (and why)

| # | Assumption | Why |
|---|---|---|
| A1 | The platform is the merchant of record. The patient pays the platform the provider-set price. | The brief says patients pay *us directly* and *we hold the inventory*. |
| A2 | The 75 bps fee is charged on the **order subtotal (GMV)**, computed **once per order**, rounded **half-up** to the cent. | "75 bps on the transaction" means on the gross transaction. Computing it once per order avoids per-line rounding drift. Half-up is the conventional, explainable rule. |
| A3 | **The provider bears the fee** (it comes out of their margin). The patient pays exactly the quoted price. | The patient price stays what the provider told them, which mirrors marketplace norms (e.g. an application fee on a connected-account charge). The platform's take is COGS recovery plus the fee. |
| A4 | Unit price must be ≥ unit cost, and order payout must be ≥ $0. | This prevents negative payouts, which would mean the provider owes the platform. Consequence: pure at-cost dispensing (zero markup) is blocked by the fee. **Open question for Cerbo**: should the platform absorb the fee for at-cost providers? |
| A5 | Price, cost, and fee rate (`fee_bps`) are **snapshotted** when the order is sent. | The provider's quoted payout must not change if catalog cost or the fee rate changes later, and historical orders stay reproducible. |
| A6 | Stock is **reserved at payment time** (not at quote) with a conditional decrement (`reserve` movement), and released if the charge fails (`release` movement). | Unpaid links shouldn't lock up inventory, and oversell is impossible because the decrement only succeeds if stock ≥ qty. |
| A7 | One full payment per order. No partial or split-tender payments. | That's the simplest model that covers the flow. |
| A8 | Inventory is platform-wide. The dashboard's "update inventory" = restock or adjust with an audit trail. | FR5 asks for it. In production this would be an ops-only permission, because Cerbo, not the provider, holds the stock. |
| A9 | A provider sees and orders only for their own patients. Patients reach an order only through its unguessable link. | Authorization is enforced even though authentication is stubbed. |
| A10 | USD only, no tax, no shipping cost, US addresses. | Explicitly out of scope in the brief. |

## 8. What's stubbed (and the seam)

| External | Stub | Seam for the real thing |
|---|---|---|
| Payments | `FakePaymentGateway`: approves `pm_fake_visa` and declines `pm_fake_declined` (the "Simulate a declined card" button). No card fields exist anywhere. | `PaymentGateway` interface: `charge(amountCents, paymentMethod, idempotencyKey)`. Swap for Stripe (Connect: application fee + transfer to provider). |
| Auth | "Acting as" provider switcher (session); patient access via random 40-char token link | Middleware that resolves the current provider. Swap for the EHR's real session or SSO. |
| Email/SMS | Laravel `log` mailer: the payment link email is written to the log, and the link is shown in the UI | `MAIL_MAILER` env var. Swap for SES or Postmark. |
| Shipping/fulfillment | A log line on payment | An "order paid" hook point in `CheckoutService`. Swap for a 3PL or fulfillment queue. |
| Provider payouts | Recorded as `provider_payable` ledger balance only | Payout batch job → Stripe transfers. Settled with a debit to `provider_payable`. |

## 9. Success metrics and instrumentation

| Metric | Definition | Source |
|---|---|---|
| **GMV in-house** (headline) | Σ `processor_clearing` debits | Ledger. Can't drift from what was charged. |
| **Platform fee revenue** | −Σ `platform_fee_revenue` | Ledger. Should be ≈ 0.75% of GMV (exact per order, ±½¢ rounding). |
| **Volume migrated** (leading indicator) | Paid orders and active providers (≥1 paid order) per period. Later: in-house share of supplement recommendations. | `orders.paid_at`, `provider_id`. The share metric needs Cerbo's existing supplement-plan events joined to orders (§10). |
| Funnel | Sent → paid conversion, time-to-pay | `sent_at`, `paid_at` |
| Guardrails | Payment decline rate, `ledger:verify` failures (must be 0) | `payments.status`, verify command |

## 10. Risks, open questions, next steps

- **Recurring protocols.** Supplements are an ongoing protocol, so auto-refill and subscriptions are the biggest volume lever. This slice keeps one-off orders.
- **Refunds and returns.** These need reversal journal entries and a fee-refund policy (do we return the 75 bps?).
- **Provider payouts.** Stripe Connect transfers, payout schedule, negative-balance handling.
- **At-cost dispensing** (see A4): a product and policy decision.
- **Stuck payments.** If the process crashes between the charge and the commit, the order stays in `processing`. Needs a reconcile job that queries the gateway by idempotency key.
- **Migration measurement.** Instrument "recommendation created" in the existing Fullscript/Wholescripts integration flows so the in-house share can be measured against a real denominator.

## 11. Delivery plan

| Milestone | Output |
|---|---|
| M0 | PRD, system design (Mermaid), architecture and trade-offs, decision journal |
| M1 | Schema and migrations, `Split` calculator and unit tests (TDD on the money rules) |
| M2 | Provider order flow: create, live quote, snapshot, payment link |
| M3 | Patient checkout: two-phase payment with idempotency, stock reservation, ledger posting |
| M4 | Provider dashboard (sales and inventory), platform metrics, order audit page, `ledger:verify` |
| M5 | Multi-agent review (money correctness, concurrency, security, scope), then fixes |
| M6 | Deploy (Railway: app and Postgres), README, AI usage log, demo script |
