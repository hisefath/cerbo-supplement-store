# System Design

How the slice is built and why. Product rules and assumptions are in [PRD.md](PRD.md); concepts and trade-offs are in [ARCHITECTURE.md](ARCHITECTURE.md). The raw Mermaid source for every diagram below is in [`diagrams/`](diagrams/) (one `.mmd` per diagram, ready to paste into [mermaid.live](https://mermaid.live)).

## Design goals, in priority order

1. **Money integrity.** Every paid order's cents are fully accounted for, reproducibly, with no floats, no drift, and no double charges.
2. **Clean seams.** Payments, auth, email, and fulfillment are stubbed behind boundaries a real adapter can drop into.
3. **Smallest thing that proves it.** One deployable, server-rendered pages, and a handful of tables. Breadth is deliberately cut.

## Key assumptions that shape the design

- **We are merchant of record and hold inventory.** The patient pays us, we keep COGS, owe the provider their margin, and earn 75 bps.
- **The fee is 75 bps of the order subtotal, once per order, rounded half-up, and borne by the provider.** The patient pays exactly the quoted price.
- **Quotes lock at send.** Unit price, unit cost, and fee rate are copied onto the order, so later catalog changes can't move a sent order's money.
- **Payment is the only external call in the critical path, and it is slow and unreliable in real life.** The design never holds a DB transaction open across it.

## 1. Architecture

```mermaid
flowchart LR
  subgraph Clients
    PB["Provider<br/>(inside the EHR)"]
    PT["Patient<br/>(payment link)"]
    OPS["Platform / finance"]
  end

  subgraph App["Laravel monolith (one deployable)"]
    MW["ActingProvider middleware<br/>(stubbed auth)"]
    OC["OrderController"]
    DC["DashboardController"]
    CC["CheckoutController"]
    PC["PlatformController"]
    OS["OrderService<br/>validate · snapshot · quote"]
    CS["CheckoutService<br/>two-phase payment"]
    SP["Split<br/>pure money math"]
    LG["Ledger<br/>post · verify"]
  end

  subgraph Seams["Seams (stubbed adapters)"]
    PG["PaymentGateway<br/>→ FakePaymentGateway"]
    ML["Mail<br/>→ log driver"]
    FF["Fulfillment<br/>→ log line"]
  end

  DB[("Postgres (prod) / SQLite (dev)<br/>orders · order_lines · payments<br/>ledger_entries · inventory_movements")]

  PB --> MW
  MW --> OC
  MW --> DC
  PT --> CC
  OPS --> PC
  OC --> OS
  OS --> SP
  OS --> ML
  CC --> CS
  CS --> SP
  CS --> LG
  CS --> PG
  CS --> FF
  OS --> DB
  CS --> DB
  LG --> DB
  DC --> DB
  PC --> DB
```

<sub>Source: [`diagrams/architecture.mmd`](diagrams/architecture.mmd)</sub>

A **modular monolith**. Controllers stay thin. Two services own the domain (`OrderService` for quote and send, `CheckoutService` for pay). One pure class owns the money math (`Split`), and one owns the books (`Ledger`). Each external dependency sits behind a seam:

- **Payments:** a `PaymentGateway` interface bound to `FakePaymentGateway` in the service container.
- **Email:** Laravel's mail facade with the `log` driver.
- **Fulfillment:** a log line at the "order paid" point.
- **Auth:** `ActingProvider` middleware that resolves a provider from the session.

**Why a monolith:** one team, one transactional boundary around order, payment, inventory, and ledger. Splitting services here would turn the hardest correctness problem (atomic settlement) into a distributed-transaction problem for no benefit.

## 2. Data model

```mermaid
erDiagram
  PROVIDERS ||--o{ PATIENTS : "cares for"
  PROVIDERS ||--o{ ORDERS : "creates"
  PATIENTS ||--o{ ORDERS : "pays for"
  ORDERS ||--|{ ORDER_LINES : "contains"
  PRODUCTS ||--o{ ORDER_LINES : "price/cost snapshotted into"
  ORDERS ||--o{ PAYMENTS : "attempted by"
  PAYMENTS ||--o{ LEDGER_ENTRIES : "settled as"
  ORDERS ||--o{ LEDGER_ENTRIES : "posted to"
  PRODUCTS ||--o{ INVENTORY_MOVEMENTS : "stock history"
  ORDERS ||--o{ INVENTORY_MOVEMENTS : "reserves / releases"

  PROVIDERS {
    bigint id PK
    string name
    string email
  }
  PATIENTS {
    bigint id PK
    bigint provider_id FK
    string name
    string email
    string shipping_address "US only"
  }
  PRODUCTS {
    bigint id PK
    string sku UK
    string name
    int unit_cost_cents "COGS, platform-owned"
    int msrp_cents "suggested price"
    int stock_on_hand "never < 0"
  }
  ORDERS {
    bigint id PK
    bigint provider_id FK
    bigint patient_id FK
    string status "awaiting_payment | processing | paid"
    string checkout_token UK "patient capability link"
    int fee_bps "rate snapshot (75)"
    int subtotal_cents "GMV"
    int cogs_cents
    int fee_cents
    int provider_payout_cents "subtotal = cogs + fee + payout"
    timestamp sent_at
    timestamp paid_at
  }
  ORDER_LINES {
    bigint id PK
    bigint order_id FK
    bigint product_id FK
    int quantity
    int unit_price_cents "snapshot: patient-facing"
    int unit_cost_cents "snapshot: COGS at send"
  }
  PAYMENTS {
    bigint id PK
    bigint order_id FK
    string idempotency_key UK
    int amount_cents
    string status "pending | succeeded | failed"
    string gateway_ref
    string failure_reason
  }
  LEDGER_ENTRIES {
    bigint id PK
    bigint order_id FK
    bigint payment_id FK
    string account "processor_clearing | inventory_cogs | provider_payable | platform_fee_revenue"
    int amount_cents "debit +, credit -, sums to 0 per payment"
    timestamp created_at "append-only"
  }
  INVENTORY_MOVEMENTS {
    bigint id PK
    bigint product_id FK
    bigint order_id FK "nullable"
    int delta "signed"
    string reason "restock | adjustment | sale | sale_released"
    string actor
  }
```

<sub>Source: [`diagrams/erd.mmd`](diagrams/erd.mmd)</sub>

| Table | Role | Integrity mechanism |
|---|---|---|
| `products` | Catalog plus platform-owned stock | `stock_on_hand` only changes via a conditional decrement (`WHERE stock_on_hand >= qty`). Postgres `CHECK (stock_on_hand >= 0)`. |
| `orders` | Header plus **persisted split** | Split columns written once from `Split`. Postgres `CHECK (subtotal = cogs + fee + payout)` and `CHECK (payout >= 0)`. |
| `order_lines` | **Snapshots** of price and cost at send | Never updated after send. Line math is derived (`qty × unit`), not stored twice. |
| `payments` | One row per attempt | `UNIQUE(idempotency_key)`. Partial unique index allows at most one `pending` or `succeeded` payment per order. |
| `ledger_entries` | Double-entry postings | Append-only (model refuses update and delete). Σ = 0 per payment, asserted before insert and re-verified by `ledger:verify`. |
| `inventory_movements` | Stock audit trail | Every stock change writes a signed movement. `ledger:verify` checks `stock_on_hand == Σ delta`. |

Why both persisted split columns on `orders` **and** ledger rows? The columns are the **quote** the provider agreed to at send time. The ledger is the **record of money that actually moved**. Keeping both and verifying they agree is the audit: if they ever disagree, something is wrong and `ledger:verify` says which order.

## 3. The money split

```mermaid
flowchart LR
  P["Patient pays<br/>$63.99 (6399¢)"] --> C["processor_clearing<br/>+6399"]
  C --> G["inventory_cogs<br/>−3250<br/>platform recovers item cost"]
  C --> V["provider_payable<br/>−3101<br/>provider margin net of fee"]
  C --> F["platform_fee_revenue<br/>−48<br/>75 bps of 6399, half-up"]
  V -. "future: payout batch / Stripe Connect transfer" .-> B["Provider bank"]
```

<sub>Source: [`diagrams/money-flow.mmd`](diagrams/money-flow.mmd)</sub>

```
subtotal = Σ qty × unit_price        cogs = Σ qty × unit_cost
fee      = ⌊(subtotal × 75 + 5000) / 10000⌋       # half-up, integer-only
payout   = subtotal − cogs − fee                  # residual → invariant holds by construction
```

The payout is computed as the **residual**, so `subtotal == cogs + fee + payout` can never be off by a cent, no matter how the fee rounds. All arithmetic is PHP 64-bit integer math (`intdiv`); no floats anywhere.

## 4. Payment flow (the core)

```mermaid
sequenceDiagram
  autonumber
  actor Patient
  participant CC as CheckoutController
  participant CS as CheckoutService
  participant DB as Database
  participant PG as PaymentGateway (fake)

  Patient->>CC: POST /pay/{token} (idempotency_key from form)
  CC->>CS: pay(order, key, simulateDecline?)

  Note over CS,DB: Phase 1: reserve (short DB transaction)
  CS->>DB: BEGIN, SELECT order FOR UPDATE
  alt payment with this key already exists
    CS-->>CC: replay stored result (no second charge)
  else order.status != awaiting_payment
    CS-->>CC: reject (already paid or in flight)
  else
    CS->>DB: UPDATE products SET stock = stock - qty WHERE stock >= qty (per line)
    CS->>DB: INSERT payment(pending), INSERT movements(sale), order → processing
    CS->>DB: COMMIT
  end

  Note over CS,PG: Phase 2: charge (no DB transaction held open)
  CS->>PG: charge(amount_cents, idempotency_key)
  PG-->>CS: ChargeResult(succeeded | declined, ref)

  Note over CS,DB: Phase 3: settle (short DB transaction)
  alt succeeded
    CS->>DB: payment → succeeded, order → paid (paid_at)
    CS->>DB: INSERT 4 ledger_entries (asserted Σ = 0 and = order split)
  else declined
    CS->>DB: payment → failed, stock += qty, movements(sale_released), order → awaiting_payment
  end
  CS->>DB: COMMIT
  CC-->>Patient: receipt or "payment declined, try again"
```

<sub>Source: [`diagrams/payment-sequence.mmd`](diagrams/payment-sequence.mmd)</sub>

**Three short phases, not one long transaction:**

1. **Reserve.** In one DB transaction: lock the order row, check its state, short-circuit on a replayed idempotency key, conditionally decrement stock for every line, insert a `pending` payment, and move the order to `processing`. Any failure (out of stock, already paid) rolls back everything.
2. **Charge.** Call the gateway with the **same idempotency key**, with no transaction open. Real processors take hundreds of ms to seconds; holding row locks across that would serialize checkout and risk lock timeouts.
3. **Settle.** In one DB transaction: on success, mark the payment and order paid and post the ledger. On decline, mark the payment failed, release stock (with compensating movements), and reopen the order for retry.

**Double-pay protections, layered:**

| Scenario | What stops it |
|---|---|
| Double-click or refresh (same form) | Same `idempotency_key` → stored result replayed, gateway not called again |
| Two tabs (different keys) | Row lock plus `status = awaiting_payment` check. The second request sees `processing` or `paid` and is rejected. |
| A bug that skips the above | Partial unique index: at most one `pending`/`succeeded` payment per order, enforced by the DB |
| Gateway retry | The gateway receives the idempotency key, as Stripe and others support |

**Known gap (documented, not built):** if the process dies between phase 2 and phase 3, the order stays in `processing` with a `pending` payment. The fix is a reconcile job that looks up `pending` payments older than N minutes and asks the gateway for the charge by idempotency key.

## 5. Order lifecycle

```mermaid
stateDiagram-v2
  [*] --> awaiting_payment: provider sends order<br/>(prices, costs, fee_bps snapshotted; link issued)
  awaiting_payment --> processing: patient pays<br/>(stock reserved, payment pending)
  processing --> paid: charge succeeded<br/>(ledger posted)
  processing --> awaiting_payment: charge declined<br/>(stock released, can retry)
  paid --> [*]
  note right of paid
    Next (out of scope): fulfilled, refunded (reversal entries), cancelled
  end note
```

<sub>Source: [`diagrams/order-state.mmd`](diagrams/order-state.mmd)</sub>

Transitions happen only inside `CheckoutService`. Each is guarded by the current status read under a row lock, so an order can't be paid twice or settled from the wrong state.

## 6. Auditability

- **Order audit page** (`/orders/{id}`): lines with snapshots, the persisted split, every payment attempt, ledger entries, inventory movements, and live checks (ledger balances, ledger matches split, payment = subtotal).
- **`php artisan ledger:verify`**: re-runs those checks for **every** paid order and the stock-vs-movements check for every product. It exits non-zero on any discrepancy, so it can run nightly or in CI.
- **Platform metrics** (`/platform`) are computed **from the ledger**, the same rows auditors would look at, so GMV and fee revenue can't drift from what was actually charged.

## 7. Deployment

```mermaid
flowchart LR
  U["Browser"] -->|HTTPS| R["Railway edge"]
  R --> A["app service<br/>Docker: FrankenPHP + Laravel<br/>runs migrations + demo seed on boot"]
  A -->|private network| D[("Railway Postgres")]
  GH["GitHub (mirror)"] -.-> A
  GL["GitLab (primary)"] -.- GH
```

<sub>Source: [`diagrams/deployment.mmd`](diagrams/deployment.mmd)</sub>

A single Docker image (FrankenPHP + Laravel) on Railway with managed Postgres. The container runs migrations and an idempotent demo seed on boot. Local dev and the default test run use SQLite (zero setup). The suite also runs against Postgres (`DB_CONNECTION=pgsql`) so the production engine's locks and constraints are exercised.
