# In-EHR supplement orders for Cerbo — Product Requirements

| Field | Value |
|---|---|
| Source brief | `specs/M1-in-ehr-supplement-orders/brief.md` @ e8c6621 |
| Track | Full |
| Last updated | 2026-10-09 21:45 CDT |
| Context names | Cerbo, Fullscript |
| Approval | G1 — recorded in `.handoff/TRACKER.md ## Approvals` (never in this file) |

## Problem

Providers who put patients on supplement protocols buy the supplements for them from an outside seller, pay up front,
and then chase the patient for repayment through some other channel; none of it lands in the clinical or financial
record, and every dollar of margin and fee goes to the outside seller (REQ-01, brief Problem). A second workaround
already lives inside Cerbo: the provider sends a plan through the Fullscript integration and the patient pays
Fullscript directly, so the provider stops fronting money, but the sale, the margin and the fee still sit outside
Cerbo (R02, R08, Q1). The people hurting are small-to-midsize cash-pay and membership practices whose patients are
often on ongoing protocols (R09, R06). How much it costs: practitioners sell roughly $6–7B of supplements a year in
the US, and the part Cerbo's own practitioners could route through Cerbo is about $240M a year of patient spend
(range $60M–$480M), about $1.8M a year at 75 bps if all of it moved (R10). Why now: the partner wants to bring this
flow in-house and earn its fee on volume that already exists (REQ-09).

### Job stories

- **JS-01** When I decide a patient needs a supplement protocol, I want to put the order in front of them at the price I choose without paying for it myself, so I can stop fronting money and chasing repayment. — Source: brief JS-01 (REQ-01, REQ-02)
- **JS-02** When my provider recommends supplements for me, I want to see what I owe and pay once, so I can follow my treatment without a separate shopping trip and repayment. — Source: brief JS-02 (REQ-03)
- **JS-03** When a patient has paid, I want to see exactly where every cent went, so I can trust the books and the provider's payout. — Source: brief JS-03 (REQ-04, REQ-05)
- **JS-04** When I review my practice's supplement business, I want to see what sold and keep stock right, so I can plan protocols without surprises. — Source: brief JS-04 (REQ-06)
- **JS-05** When the business asks whether this was worth building, I want to see how much order volume moved in-house and what it earned, so I can decide whether to invest further. — Source: brief JS-05 (REQ-09)
- **JS-06** When I set my practice's supplement prices, I want sensible defaults and a deliberate way to change them, so I can avoid typing mistakes and show later who changed what. — Source: (Q3)
- **JS-07** When a price changes before I pay, I want to be told what changed, so I can trust the total I am paying. — Source: (Q4)

## Users and personas

| Persona | Who they are | Context of use | What they need | How often |
|---|---|---|---|---|
| P-1 Provider (primary) | Clinician in a small-to-midsize cash-pay or membership practice on Cerbo: functional and integrative medicine, direct primary care, IV and hormone clinics (R09) | During or right after a visit, when they decide a protocol | Build the order at sensible prices and hand it to the patient without paying for it | Several times per clinic day |
| P-2 Patient | A practice's patient on a supplement protocol, often ongoing (R06) | After the visit, from wherever they read the practice's messages | See what they owe, be told of any price change, pay once | Per order; often monthly |
| P-3 Platform reviewer | Cerbo finance or operations staff | When checking payouts or answering a provider's question | See where every cent of a paid order went | Weekly or on demand |
| P-4 Platform leadership | Cerbo product and business owners | Monthly business review | See in-house volume and fees per practice | Monthly |

Not for: insurance-billed practices (Cerbo's own pages describe a cash, membership and direct-pay customer, R09);
prescription-medicine dispensing (a different product category, R08); practices outside the US (REQ-08).

## Goals

- **GOAL-1** The platform earns its fee on supplement spending its practices already do. Measured by: SC-001.
- **GOAL-2** Practices move their supplement ordering off outside sellers and into their own EHR. Measured by: SC-002.
- **GOAL-3** Patients pay for recommended supplements in one step, with no repayment to the provider. Measured by: SC-003.

## Non-goals and no-gos

Non-goals:
- **NG-1** Real payment processing, real sign-in, real email and real shipping — because the assignment asks for stand-ins with clean seams (REQ-07, REQ-08); revisit after the slice.
- **NG-2** Catalog browsing, search, product images and styling — because a seeded list is enough (REQ-08); revisit never for this slice.
- **NG-3** Tax, shipping cost and regulatory compliance — because the assignment rules them out (REQ-08, REQ-10); revisit before any real launch.
- **NG-4** Multi-state and international rules — because the slice is US-only (REQ-08); revisit never for this slice.
- **NG-5** Pricing campaigns (sell at cost to clear stock, discounts, selling at a loss to win early users) — because the slice follows the assignment's money rules first (Q3); revisit as the first Later milestone (US-7).
- **NG-6** Automatic refills and recurring orders — because the assignment asks for one order journey, and refill data is still open (R06); revisit after the North Star has a baseline.
- **NG-7** Refunds, returns and corrections to paid orders — because they need their own money rules; revisit with US-7.
- **NG-8** Warehouses, multiple stock locations and supplier ordering — because the platform holds the inventory and stock mechanics stay minimal (REQ-08, REQ-10).
- **NG-9** Discount-off-retail-price pricing — because the assignment asks for a price or a margin per item (REQ-02, Q3).
- **NG-11** Alerts by email or text — because messaging is a stand-in (NG-1); alerts show on the dashboards only (Q11); revisit after the slice.
- **NG-10** Formal HIPAA compliance (business associate agreements with every vendor that touches patient data, a risk analysis, written policies, staff training) — because the assignment puts compliance out of scope and compliance belongs to the organisation, not the software (REQ-08, Q8); the slice is HIPAA-ready instead (NFR-003, NFR-004, NFR-007 to NFR-011); revisit before any real patient data.

No-gos:
- **NOGO-1** The provider paying for a patient's order up front — because that is the problem being removed (REQ-01, JS-01).
- **NOGO-2** Editing or deleting a paid order's amounts, or a price or stock history entry — because the split must stay auditable (REQ-05, Q3, Q4).
- **NOGO-3** Reading or reusing the earlier one-shot build in `main` — because this restart is fully gated (D22).

## Appetite

- Time box: none fixed; the human waived the deadline, and the assignment's guidance of 1–2 days still keeps each milestone small. Hard date: none. Source: REQ-24, brief Appetite and deadlines.
- If time runs short, cut in this order: US-7 → US-6 → US-5 → US-4. Never cut: US-1, US-2, US-3, US-8 and every [Unwanted] requirement they hold.

## User stories

### US-1 Build and send a supplement order (P1)

As a provider, I want to build an order for my patient from my practice's products at their current prices and send
it to the patient, so that I never pay for it myself.

- Why this priority: it is the start of the journey the assignment asks for (REQ-01, REQ-02).
- Independent test: a provider builds an order for a patient, sees the total and their payout, sends it, and the patient can see it.
- Requirements: FR-001, FR-002, FR-003, FR-004, FR-005 · Examples: AE-001, AE-002, AE-003, AE-004

### US-2 Patient pays once (P1)

As a patient, I want to see what I owe and pay for the order in one step, so that I never repay my provider separately.

- Why this priority: the patient paying the platform directly is the core change (REQ-03).
- Independent test: a patient opens a sent order, pays with the stand-in payment step, and sees a receipt.
- Requirements: FR-006, FR-007, FR-008, FR-009, FR-035 · Examples: AE-005, AE-006, AE-007, AE-008, AE-031

### US-3 See where every cent went (P1)

As a platform reviewer, I want each paid order to show its item cost, provider payout and platform fee to the cent,
so that I can trust the books and answer any provider's question.

- Why this priority: the assignment grades the split's correctness and auditability (REQ-04, REQ-05).
- Independent test: a reviewer opens a paid order and checks that item cost, payout and fee add up to what the patient paid.
- Requirements: FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-036 · Examples: AE-009, AE-010, AE-011, AE-012, AE-013, AE-014, AE-032

### US-4 Default prices and a deliberate price change (P2)

As a provider, I want every product to start at a default price and to change a price only through a price-change
form that records who changed it and why, so that typing mistakes are rare and every change can be audited.

- Why this priority: the human asked for defaults and an auditable price history (Q3), and for price-change notices and a checkout lock (Q4).
- Independent test: a provider changes one product's price with the form, sees the change in the price history, and a patient with an open order sees a notice.
- Requirements: FR-017, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-037 · Examples: AE-015, AE-016, AE-017, AE-018, AE-019, AE-020, AE-021, AE-035

### US-5 Practice dashboard and stock (P2)

As a provider, I want a dashboard of my practice's orders and their status, what sold and what is left in stock, with
alerts for unpaid orders and low stock, and the system never to sell more than it holds, so that I can plan protocols
without surprises.

- Why this priority: the assignment asks for the dashboard (REQ-06); the human asked that stock never be oversold (Q4) and for an order-status list with alerts (Q9, Q11).
- Independent test: after two paid orders, the provider's dashboard shows the units sold and the lower stock count.
- Requirements: FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-038, FR-045, FR-046, FR-047 · Examples: AE-022, AE-023, AE-024, AE-025, AE-026, AE-027, AE-036, AE-042, AE-043, AE-044

### US-6 Measure in-house volume and platform health (P3)

As platform staff, I want a health dashboard of in-house volume, fees and the measures that show where orders get
stuck, with alerts and without any patient's identity, so that I can see whether volume is moving in-house and fix
bottlenecks.

- Why this priority: the assignment asks that its headline metric be measurable later (REQ-09); the human asked for metrics that show issues, bottlenecks and alerts (Q9, Q11).
- Independent test: a reviewer opens the volume report for a month and sees each practice's paid amount, fees, orders sent and orders paid.
- Requirements: FR-031, FR-032, FR-048, FR-049 · Examples: AE-028, AE-029, AE-045, AE-046

### US-7 Pricing campaigns (P3)

As a platform administrator, I want to run pricing campaigns such as selling at cost to clear stock or discounting to
win early practices, so that the business can trade margin for adoption on purpose.

- Why this priority: the human wants it, after the assignment's rules are in place (Q3).
- Independent test: an administrator sets a campaign price for one product and a week, and a patient order in that week shows it.
- Requirements: FR-016, FR-033, FR-034 · Examples: AE-030, AE-033, AE-034

### US-8 Sign in as myself (P1)

As a patient, a provider or platform staff, I want to sign in with my own account and see only what my role allows,
so that nobody else can see my orders or my patients' orders.

- Why this priority: the human asked for sign-in for patients and providers in the spec (Q9), and every P1 screen depends on knowing who is looking (NFR-004, NFR-007, NFR-008).
- Independent test: Ana signs in and sees only her order; signed out, the same link shows only the sign-in page.
- Requirements: FR-039, FR-040, FR-041, FR-042, FR-043, FR-044, FR-050 · Examples: AE-037, AE-038, AE-039, AE-040, AE-041, AE-047

## Functional requirements

- **FR-001** [Event] (US-1) When a provider starts an order for a patient of their practice, the system shall list the practice's products with each product's current patient price and units in stock.
- **FR-002** [Event] (US-1) When a provider adds a product and a quantity to an order, the system shall show the line price, the order total and the provider's payout after the platform fee.
- **FR-003** [Unwanted] (US-1) If a provider tries to send an order with no items or with a quantity below 1, then the system shall refuse to send it and name the missing or invalid line.
- **FR-004** [Unwanted] (US-1) If an order's provider payout after the platform fee would be below $0.00, then the system shall refuse to send it and name the items priced below their floor.
- **FR-005** [Event] (US-1) When a provider sends an order, the system shall show it to that patient with every item, quantity, price and the total due.
- **FR-006** [Event] (US-2) When a patient confirms payment for an order in checkout, the system shall mark the order paid and show the patient a receipt with the amount paid.
- **FR-007** [Ubiquitous] (US-2) The system shall label the payment step as a test payment that moves no real money.
- **FR-008** [Unwanted] (US-2) If a patient submits payment for an order that is already paid or already being paid, then the system shall show the existing payment result without charging again.
- **FR-009** [Unwanted] (US-2) If a person opens an order that belongs to neither them nor their practice, then the system shall show that no such order exists and reveal none of its contents.
- **FR-010** [Event] (US-3) When an order is marked paid, the system shall record its split as item cost, provider payout and platform fee, each in whole cents.
- **FR-011** [Ubiquitous] (US-3) The system shall compute the platform fee once per order as 0.75% of the amount the patient paid, rounded half-up to the nearest cent.
- **FR-012** [Ubiquitous] (US-3) The system shall compute the provider payout as the amount paid minus the item cost minus the platform fee.
- **FR-013** [Unwanted] (US-3) If an order's item cost, provider payout and platform fee do not add up to the amount paid to the cent, then the system shall refuse to mark the order paid and list it for review.
- **FR-014** [Event] (US-3) When a platform reviewer opens a paid order, the system shall show each line's quantity, unit price and unit cost beside the order's amount paid, item cost, provider payout, platform fee, provider, practice and time paid.
- **FR-015** [Unwanted] (US-3) If anyone tries to change or delete a paid order's recorded amounts, then the system shall refuse and keep the original amounts unchanged.
- **FR-016** [Event] (US-7) When a platform administrator records a correction to a paid order, the system shall add it as a new dated entry naming who made it, beside the unchanged original amounts.
- **FR-017** [Ubiquitous] (US-4) The system shall start every product at a default patient price of its cost plus a 50% margin until the practice changes it.
- **FR-018** [Event] (US-4) When a provider submits the price-change form with either a new price or a margin percentage, the system shall set the practice's price for that product to the resulting price in whole cents, reading margin as a share of the patient price.
- **FR-019** [Event] (US-4) When a practice's price for a product changes, the system shall add a price history entry showing who changed it, when, the old price, the new price and the reason given.
- **FR-020** [Unwanted] (US-4) If a submitted price would leave the provider a payout below $0.00 on one unit after the platform fee, then the system shall refuse the change and show the lowest allowed price.
- **FR-021** [Unwanted] (US-4) If anyone tries to edit or delete a price history entry, then the system shall refuse and keep the entry unchanged.
- **FR-022** [Event] (US-4) When an item's price changes while an order containing it is not yet in checkout, the system shall show the person viewing that order a notice naming the item, its old price and its new price.
- **FR-023** [Event] (US-4) When a patient starts checkout, the system shall fix every item's price in that order at the price shown at that moment.
- **FR-024** [Complex] (US-4) While an order is in checkout, when its practice's price for an item changes, the system shall charge the patient the price fixed at checkout start.
- **FR-025** [Unwanted] (US-5) If a provider adds more units of a product than are in stock, then the system shall refuse the quantity and show the units available.
- **FR-026** [Unwanted] (US-5) If a patient pays for an order whose items are no longer all in stock, then the system shall refuse the payment without charging and name the items short of stock.
- **FR-027** [Event] (US-5) When an order is marked paid, the system shall reduce each product's stock by the quantity sold.
- **FR-028** [Event] (US-5) When a provider opens the practice dashboard for a chosen period, the system shall show per product the units sold, the amount patients paid and the provider payout.
- **FR-029** [Ubiquitous] (US-5) The system shall show the current units in stock for each product on the practice dashboard.
- **FR-030** [Event] (US-5) When a platform staff member records a stock adjustment with a quantity and a reason, the system shall add a stock history entry showing who made it, when, the change and the reason.
- **FR-031** [Ubiquitous] (US-6) The system shall record on every order its practice, provider, time sent and time paid.
- **FR-032** [Event] (US-6) When a platform reviewer opens the volume report for a month, the system shall show each practice's paid amount, platform fees, orders sent and orders paid for that month.
- **FR-033** [Optional] (US-7) Where pricing campaigns are offered, the system shall let a platform administrator set a campaign price per product for a date range, including at or below cost.
- **FR-034** [Optional] (US-7) Where a campaign price leaves the provider payout below $0.00, the system shall record the shortfall and the platform fee as absorbed by the platform.
- **FR-035** [Unwanted] (US-2) If the payment step fails or does not answer, then the system shall leave the order unpaid and tell the patient that no money was taken.
- **FR-036** [Ubiquitous] (US-3) The system shall record each paid line's unit cost as it stood when the order was paid.
- **FR-037** [Event] (US-4) When 30 minutes pass after a patient started checkout without paying, the system shall return the order to the practice's current prices.
- **FR-038** [Unwanted] (US-5) If a provider tries to record a stock adjustment, then the system shall refuse it and leave the stock count unchanged.
- **FR-039** [Event] (US-8) When a person signs in with their own account, the system shall show only the pages their role allows: a patient their own orders, a provider their practice, platform staff the platform pages.
- **FR-040** [Unwanted] (US-8) If someone who is not signed in opens an order, price, stock or dashboard page, then the system shall show the sign-in page and none of that page's contents.
- **FR-041** [Event] (US-8) When a signed-in person has been inactive for 15 minutes, the system shall sign them out and show the sign-in page.
- **FR-042** [Event] (US-8) When a patient signs in after opening an order notice, the system shall open the order the notice was about.
- **FR-043** [Event] (US-1) When a provider sends an order, the system shall send the patient a stand-in notice that names the practice and asks them to sign in to view and pay.
- **FR-044** [Ubiquitous] (US-1) The system shall leave item names, quantities, amounts and health details out of every notice to a patient.
- **FR-045** [Event] (US-5) When a provider opens the practice dashboard, the system shall list the practice's orders with patient, total, status, time sent and time paid.
- **FR-046** [State] (US-5) While a practice's order has been sent and unpaid for more than 3 days, the system shall flag it on the practice dashboard as awaiting payment.
- **FR-047** [State] (US-5) While a product has 3 units or fewer in stock, the system shall flag it on the practice dashboard as low stock.
- **FR-048** [Event] (US-6) When platform staff open the platform health dashboard for a period, the system shall show the sent-to-paid rate, median time to pay, failed payments, out-of-stock refusals, expired checkouts, orders needing review, and in-house paid volume and fees.
- **FR-049** [State] (US-6) While a health measure is past its alert line, the system shall mark it as needing attention on the platform health dashboard.
- **FR-050** [Ubiquitous] (US-8) The system shall show platform staff an order number in place of any patient name or contact detail.

## Non-functional requirements

- **NFR-001** [Performance] Each step of the order journey shows its result within 2 s at the 95th percentile at 60 requests per second. Source: R13 I3 (high end of the first-year range); 2 s confirmed (Q6).
- **NFR-002** [Capacity] The order journey keeps meeting NFR-001 at 60 requests per second and 270 concurrent users. Source: R13 I3 and I5 (high end of the first-year range).
- **NFR-003** [Auditability] 100 % of price changes, stock adjustments and paid-order amounts are traceable to a person and a time. Source: REQ-05, (Q3), (Q4).
- **NFR-004** [Privacy] 0 people outside an order's patient, that patient's practice and the platform reviewers can see the order, and platform reviewers see it without the patient's identity. Source: (Q4), (Q11).
- **NFR-005** [Availability] The order journey is available ≥ 99.5 % of each calendar month, with planned downtime only between 05:00 and 11:00 UTC. Source: R12 I2, R13 I6; confirmed (Q6).
- **NFR-006** [Reliability] 0 orders are lost after the patient has seen a receipt. Source: REQ-05.
- **NFR-007** [Security] 100 % of people who use the system sign in under their own personal account, with no shared accounts. Source: (Q8); HIPAA Security Rule, unique user identification, 45 CFR 164.312(a)(2)(i).
- **NFR-008** [Security] A signed-in session ends after 15 minutes without activity. Source: (Q8); 45 CFR 164.312(a)(2)(iii) automatic logoff; 15 minutes per A-9.
- **NFR-009** [Security] 100 % of traffic between people and the system is encrypted in transit. Source: (Q8); 45 CFR 164.312(e)(2)(ii).
- **NFR-010** [Privacy] The system's logs hold 0 records containing a patient's name, an order's items or payment details. Source: (Q8).
- **NFR-011** [Privacy] 0 records from real patients are used in the demo, examples or tests; every person is fictional. Source: (Q8).
- **NFR-012** [Privacy] Platform staff see 0 records containing a patient's name or contact details on any page or report. Source: (Q11).

## Success criteria

- **SC-001** North Star: in-house paid volume per adopting practitioner per month, with the 0.75% earned on it. Target about $3,000 a month (about $22.50 in fees) (aspirational), grounded in R11 I1: 80 ordering patients × $600 a year × 75% moved in-house ÷ 12 months; lagging; if bad we fix the step where practices stall, starting with the ones lowest on this number; measured from paid orders grouped by practice and month; reviewed by the platform's product owner every month. (GOAL-1)
- **SC-002** Supporting (explains SC-001): share of an adopting practice's supplement volume placed in-house rather than with outside sellers. Target 75 % or more by month 6 (aspirational), grounded in R11 assumption A-3; leading; if bad we fix whatever keeps providers sending orders to outside sellers; measured as in-house volume ÷ (in-house + outside-seller volume) per practice per month; the outside-seller baseline is to be requested from the partner (Q6). (GOAL-2)
- **SC-003** Supporting (explains SC-001): share of sent orders the patient pays, and the median time from send to payment. Target set after 30 days of real orders (aspirational), because no benchmark was found (R03, R08, R13) (Q6); leading; if bad we fix the patient's payment step; measured from each order's time sent and time paid. (GOAL-3)

Rejected as vanity: total orders since launch (only goes up and has no denominator); number of supplements in the
catalog (says nothing about use); total fee dollars without the volume beside them (hides whether volume or rate
moved). Moved out of the success criteria: "paid orders reconcile to the cent", because a test can prove it, so it is
FR-013 with AE-012, not a business outcome (Q5).

## Acceptance examples

Fictional practice: Willow Creek Wellness. Provider Dr. Maya Chen. Patients Ana Ruiz and Ben Ortiz. Products (unit
cost → default patient price): Vitamin D3 $9.00 → $18.00; Magnesium Glycinate $12.00 → $24.00; Omega-3 $15.00 → $30.00.

- **AE-001** (FR-001, FR-002) Given Dr. Chen starts an order for Ana Ruiz, When she adds 2 Vitamin D3 and 1 Magnesium Glycinate, Then she sees lines of $36.00 and $24.00, a total of $60.00 and her payout of $29.55 after the $0.45 platform fee.
- **AE-002** (FR-003) Given Dr. Chen has an order for Ana with no items, When she presses send, Then the order is not sent and she sees that the order has no items.
- **AE-003** (FR-004) Given Willow Creek's Magnesium Glycinate price is $12.00, equal to its cost, When Dr. Chen tries to send an order of 1 Magnesium Glycinate, Then the order is not sent and Magnesium Glycinate is named as below its floor, because the $0.09 fee would make her payout -$0.09.
- **AE-004** (FR-005) Given the $60.00 order from AE-001, When Dr. Chen sends it, Then Ana sees 2 Vitamin D3 at $18.00, 1 Magnesium Glycinate at $24.00 and $60.00 due.
- **AE-005** (FR-006, FR-007) Given Ana is in checkout for the $60.00 order, When she confirms the test payment, Then the order shows as paid and her receipt says $60.00 paid, with the step labelled as a test that moved no real money.
- **AE-006** (FR-008) Given Ana's $60.00 payment is being processed, When she presses pay a second time, Then she sees the first payment's result and exactly one $60.00 payment exists.
- **AE-007** (FR-009) Given Ana's order belongs to Willow Creek, When Ben Ortiz opens a link to it, Then he sees that no such order exists and none of its items or amounts.
- **AE-008** (FR-009) Given Ana's order belongs to Willow Creek, When a provider from another practice opens it, Then they see that no such order exists.
- **AE-009** (FR-010, FR-011, FR-012) Given Ana paid $60.00 for items costing $30.00, When the order is marked paid, Then its recorded split is item cost $30.00, platform fee $0.45 and provider payout $29.55.
- **AE-010** (FR-011) Given an order whose amount paid is $33.34, When its fee is computed, Then the fee is $0.25, because 0.75% of $33.34 is $0.25005 and it is rounded once per order.
- **AE-011** (FR-011, FR-012) Given an order whose amount paid is $14.00 for items costing $10.00, When its split is computed, Then the fee is $0.11 (0.75% of $14.00 is $0.105, rounded half-up) and the payout is $3.89.
- **AE-012** (FR-013) Given an order of $60.00 whose computed item cost, payout and fee add up to $59.99, When the system tries to mark it paid, Then the order stays unpaid and appears on the review list.
- **AE-013** (FR-014, FR-031, FR-036) Given Ana's paid order from AE-009, When a platform reviewer opens it, Then they see each line's quantity, unit price and unit cost, and $60.00 paid = $30.00 item cost + $29.55 payout + $0.45 fee, with Dr. Chen, Willow Creek and the time paid.
- **AE-014** (FR-015) Given Ana's paid order shows a $0.45 fee, When anyone tries to change the fee to $0.00, Then the change is refused and the fee still shows $0.45.
- **AE-015** (FR-017) Given Willow Creek has never changed the price of Omega-3, which costs $15.00, When Dr. Chen starts an order, Then Omega-3 shows at its default price of $30.00 (cost plus a 50% margin).
- **AE-016** (FR-018, FR-019) Given Omega-3 costs $15.00 and is priced at $30.00, When Dr. Chen submits the price-change form with a margin of 60% and the reason "new protocol pricing", Then Omega-3's price becomes $37.50 and the price history shows Dr. Chen, the time, $30.00, $37.50 and "new protocol pricing".
- **AE-017** (FR-018) Given Vitamin D3 is priced at $18.00, When Dr. Chen submits the price-change form with a new price of $19.50, Then Vitamin D3's price becomes $19.50.
- **AE-018** (FR-020) Given Magnesium Glycinate costs $12.00, When Dr. Chen submits a new price of $12.00, Then the change is refused and the form shows $12.09 as the lowest allowed price.
- **AE-019** (FR-021) Given the price history entry from AE-016, When anyone tries to delete it, Then it is refused and the entry still shows $30.00 → $37.50.
- **AE-020** (FR-022) Given Ana has a sent, unpaid order with Magnesium Glycinate at $24.00 and has not started checkout, When Dr. Chen changes its price to $26.00, Then Ana's order shows a notice "Magnesium Glycinate: $24.00 → $26.00" and a total of $62.00.
- **AE-021** (FR-023, FR-024) Given Ana started checkout with a total of $60.00, When Dr. Chen changes Vitamin D3 to $20.00 before Ana pays, Then Ana is charged $60.00.
- **AE-022** (FR-025) Given 2 Vitamin D3 are in stock, When Dr. Chen enters a quantity of 3, Then the quantity is refused and she sees that 2 are available.
- **AE-023** (FR-026) Given 1 Vitamin D3 is in stock and Ana's order holds 2, When Ana pays, Then the payment is refused, nothing is charged and Vitamin D3 is named as short of stock.
- **AE-024** (FR-026) Given 1 Omega-3 is left and Ana and Ben each have an order for 1, When both pay at the same moment, Then exactly one payment succeeds and the other is refused without a charge.
- **AE-025** (FR-027, FR-029) Given 10 Vitamin D3 are in stock, When Ana's order of 2 is marked paid, Then the dashboard shows 8 Vitamin D3 in stock.
- **AE-026** (FR-028) Given Willow Creek had two paid orders in October totalling 3 Vitamin D3, When Dr. Chen opens the dashboard for October, Then Vitamin D3 shows 3 units sold, $54.00 paid by patients and the payout for those lines.
- **AE-027** (FR-030) Given 8 Vitamin D3 are in stock, When a platform staff member records an adjustment of +12 with the reason "delivery received", Then stock shows 20 and the stock history shows who, when, +12 and "delivery received".
- **AE-028** (FR-031) Given Dr. Chen sends Ana's order on 2026-10-12 at 10:00 and Ana pays on 2026-10-13 at 19:30, When a reviewer looks at the order, Then both times, Dr. Chen and Willow Creek are recorded on it.
- **AE-029** (FR-032) Given Willow Creek sent 5 orders in October and 4 were paid for $240.00 in total, When a reviewer opens the October volume report, Then Willow Creek shows $240.00 paid, $1.80 in fees, 5 orders sent and 4 orders paid.
- **AE-030** (FR-033) Given Omega-3 costs $15.00, When an administrator sets a campaign price of $15.00 for 2026-11-01 to 2026-11-07, Then orders built in that week show Omega-3 at $15.00.
- **AE-031** (FR-035) Given Ana is in checkout for $60.00, When the payment step does not answer, Then her order stays unpaid and she sees that no money was taken.
- **AE-032** (FR-036) Given Vitamin D3's unit cost changes from $9.00 to $10.00 after Ana's order was paid, When a reviewer opens Ana's paid order, Then Vitamin D3's unit cost still shows $9.00.
- **AE-033** (FR-034) Given the campaign price of $15.00 for Omega-3 from AE-030, When Ana pays $15.00 for 1 Omega-3, Then the order records the $0.11 platform fee and $0.11 shortfall as absorbed by the platform and Dr. Chen's payout as $0.00.
- **AE-034** (FR-016) Given Ana's paid order from AE-009, When an administrator records a correction of -$5.00 to the payout with the reason "goodwill credit", Then a new dated entry shows that correction and who made it, and the original $29.55 still shows.
- **AE-035** (FR-037, FR-022) Given Ana started checkout at 14:00 with Magnesium Glycinate fixed at $24.00 and Dr. Chen then changed it to $26.00, When Ana returns at 14:31 without having paid, Then her order shows $26.00 with a notice "Magnesium Glycinate: $24.00 → $26.00".
- **AE-036** (FR-038) Given 8 Vitamin D3 are in stock, When Dr. Chen tries to record an adjustment of +5, Then it is refused and stock still shows 8.
- **AE-037** (FR-039) Given Ana Ruiz has her own patient account, When she signs in, Then she sees only her own orders and no practice or platform pages.
- **AE-038** (FR-040) Given nobody is signed in, When someone opens the link to Ana's order, Then they see the sign-in page and nothing about the order.
- **AE-039** (FR-041) Given Dr. Chen is signed in, When 15 minutes pass with no activity, Then she is signed out and sees the sign-in page.
- **AE-040** (FR-043, FR-042) Given Dr. Chen sends Ana's $60.00 order, When Ana opens the notice and signs in, Then the notice reads "Willow Creek Wellness sent you a supplement order. Sign in to view and pay." and her $60.00 order opens.
- **AE-041** (FR-044) Given the notice for Ana's $60.00 order of Vitamin D3 and Magnesium Glycinate, When anyone reads it, Then it contains no item name, quantity or amount.
- **AE-042** (FR-045) Given Willow Creek has Ana's paid $60.00 order and Ben Ortiz's sent $30.00 order, When Dr. Chen opens the practice dashboard, Then she sees both orders with their totals, the statuses "Paid" and "Sent", and their times.
- **AE-043** (FR-046) Given Ben's order was sent on 2026-10-10 and is still unpaid on 2026-10-14, When Dr. Chen opens the practice dashboard, Then Ben's order is flagged "Awaiting payment for 4 days".
- **AE-044** (FR-047) Given 3 Omega-3 are in stock, When Dr. Chen opens the practice dashboard, Then Omega-3 is flagged "Low stock: 3 left".
- **AE-045** (FR-048) Given that in October 10 orders were sent, 8 were paid with a median time to pay of 20 hours, 1 payment failed and 1 checkout expired, When platform staff open the health dashboard for October, Then it shows an 80% sent-to-paid rate, 20 hours, 1 failed payment and 1 expired checkout.
- **AE-046** (FR-049) Given 1 order needs review and its alert line is 1, When platform staff open the health dashboard, Then "Orders needing review: 1" is marked as needing attention.
- **AE-047** (FR-050) Given Ana's paid order number 1042, When a platform reviewer opens it, Then it shows "Order 1042" and no patient name or contact detail.

## Edge cases

- **EC-1** Empty order or a quantity of 0 → expected: the order is not sent and the bad line is named (FR-003)
- **EC-2** A price at or below cost → expected: the change or the order is refused and the lowest allowed price is shown (FR-004, FR-020)
- **EC-3** The patient presses pay twice, or retries after a timeout → expected: one payment, the first result shown (FR-008)
- **EC-4** A price changes after the order is sent but before checkout → expected: a visible notice with the old and new price (FR-022)
- **EC-5** A price changes during checkout → expected: the patient pays the price fixed at checkout start (FR-024)
- **EC-6** A patient starts checkout and walks away → expected: after 30 minutes the order returns to current prices, with a notice for any change (FR-037, FR-022)
- **EC-7** Two patients pay for the last unit at the same moment → expected: one succeeds, the other is refused without a charge (FR-026)
- **EC-8** A fee that lands on a half cent → expected: rounded half-up once per order (FR-011)
- **EC-9** Someone opens an order that is not theirs → expected: "no such order", no contents shown (FR-009)
- **EC-10** The payment step fails or never answers → expected: the order stays unpaid and the patient is told no money was taken (FR-035)
- **EC-11** A product's cost changes after an order was paid → expected: the paid order keeps the cost it was paid at (FR-036)
- **EC-12** Someone tries to edit a paid order, a price history entry or a stock history entry → expected: refused, original kept (FR-015, FR-021)
- **EC-13** A patient's session ends during checkout → expected: she signs in again and returns to her order; prices stay held until 30 minutes after checkout started (FR-041, FR-042, FR-037)
- **EC-14** Someone forwards the order notice → expected: the reader sees only the practice name and a sign-in page (FR-044, FR-040)

## Assumptions and open questions

Assumptions:
- **A-1** The platform holds the inventory; the slice is US-only; tax, shipping cost and compliance are out. — Basis: REQ-08, REQ-10.
- **A-2** The price-change form changes the practice's price for that product, used by all its later orders, not the price of one order line. — Basis: (Q3), confirmed (Q7).
- **A-3** Pricing campaigns are run by the platform, not by providers, and come after the assignment's slice. — Basis: (Q3), confirmed (Q7).
- **A-4** A provider sees only their own practice's orders; a patient sees only their own. — Basis: (Q4) for patients; confirmed for providers (Q7).
- **A-5** Each order belongs to one patient, one provider and one practice. — Basis: confirmed (Q7).
- **A-6** Sign-in, payment, email and shipping are stand-ins, and the docs list each one. — Basis: REQ-07.
- **A-7** The provider pays the platform fee out of their margin. — Basis: (Q2), R05.
- **A-9** A session ends after 15 minutes without activity. — Basis: assumed by agent; confirm at G1.
- **A-10** The practice alerts fire at more than 3 days unpaid and at 3 units or fewer in stock. — Basis: assumed by agent; confirm at G1.
- **A-11** Each health measure's alert line is set after 30 days of real orders, except orders needing review, which alerts at 1. — Basis: assumed by agent; confirm at G1.
- **A-12** Sign-in is a stand-in: each fictional person has their own account, and no real identity check runs. — Basis: REQ-07, (Q9).
- **A-8** The success targets rest on R10 and R11 estimates (an outside seller's claimed patients per provider, a $50 median monthly supplement spend, 22% first-year adoption). — Basis: R10, R11; each target is aspirational until real orders exist.

Open questions:
None: the eight from the first draft were answered at G1 (Q6).

### Interview log

Answered from sources: Problem → brief Problem, REQ-01, R02, R08, R10 · Users (bank 1, 6) → R09, brief JS-01 to JS-05 · Appetite (bank 4) → REQ-24, brief Appetite · Non-goals (bank 3) → REQ-07, REQ-08, REQ-10 · Mandated constraints (bank 7) → REQ-14 · Volume and speed (bank 9) → R13 · Graded deliverables (bank 10) → REQ-15, REQ-22 · Sensitive data (bank 8) → REQ-08 (compliance out; privacy kept as NFR-004 from Q4).

| Q# | Question | Recommended (and evidence) | Reply (verbatim) | Landed in |
|---|---|---|---|---|
| Q1 | Which of today's flows does this replace? | The assignment's provider-pays flow as the primary problem, with the Fullscript patient-pays flow as a second workaround — because REQ-01 and R02 | "ok, i like the recommendation and agree with your finding" | Problem |
| Q2 | Who pays the 75 bps platform fee? | The provider, out of their margin, as marketplaces do — because R05 and the eBay final value fee | "ok" | A-7, FR-004, FR-012, FR-020 |
| Q3 | How does the provider set the patient's price, and what is the lowest price allowed? | Price or margin % per item, payout ≥ $0.00 after the fee, no maximum — because REQ-02, R04 | "Fullscript's 35% cap is for their discount, not for their maximum price. be careful. note this down." · "I think we should have default values, as to not allow for human error, as providers are our users as well, and can make mistakes on typing in prices. I think it should be a special form to make a change to a price, thats in a ledger thats auditable later" · "i do appreciate this, as we may need to sell at cost or even sell at a loss by selling at discounts to adopt users at first. we should note this down, and can always run a a campaign like this, but for now, we'll do as the assignment says, but i want a feature where we can run campaigns like sell at cost to flush out inventory or sell at discounted rates" | JS-06, US-4, US-7, FR-017 to FR-021, FR-033, FR-034, NG-5, A-2, A-3 |
| Q4 | What is the worst thing this system could do? | No double charge, split adds up to the cent, price fixed once the patient opens the order, payout ≥ $0.00, paid amounts never edited, no cross-patient view — because REQ-05, R13 I7 | "1-6, except 3 isnt a hard rule, prices can change, and a snackbar alert can mention if a price has changed for an item while a cart was being added to. but only during checkout should prices stay final. and yes, Add “never sell more than we have in stock.”, we should consider this" | JS-07, FR-008, FR-009, FR-013, FR-015, FR-021 to FR-026, NFR-004 |
| Q5 | What targets should the success metrics have? | SC-001 about $3,000 a month per adopting practitioner, SC-002 75% in-house by month 6, SC-003 set after 30 days; reconciliation becomes a requirement — because R11 I1, A-3 | "yes" | SC-001, SC-002, SC-003, FR-013 |
| Q6 | G1 review: the eight open questions of the first draft (2 s at p95; 99.5 % a month with downtime 05:00–11:00 UTC; 30-minute checkout lock then refresh with a notice; margin as share of price; default price = cost + 50% margin; stock adjustments by platform staff only; ask the partner for the outside-seller baseline; set the SC-003 target after 30 days) | Each recommended answer as listed | "yes, all looks good here for all reccomendations" | NFR-001, NFR-005, FR-017, FR-018, FR-030, FR-037, FR-038, SC-002, SC-003, EC-6 |
| Q7 | G1 review: confirm agent assumptions A-2 to A-5 | Confirm each | "yes to each of these, also remember that this needs to be a hipaa compliant software, check me on that" | A-2, A-3, A-4, A-5 |
| Q8 | How should the PRD treat HIPAA? | HIPAA-ready, not HIPAA-compliant: compliance stays out of scope (REQ-08), add the technical safeguards of 45 CFR 164.312 as NFRs, fictional data only, list what real compliance adds — because REQ-08 and 45 CFR 164.312 | "yes, hipaa ready" | NG-10, NFR-007 to NFR-011, A-9 |
| Q9 | G-ux open questions: a stand-in sign-in screen, an order-status list, and how the patient gets the link | Add a P1 sign-in story; order-status list Later; S1 shows the link | "1. yes, def need auth flow fr patients, and providers designed and also in spec, 2. yes, we need a dashboard as this is ecommerce and order status list is needed on that dashboard, and also we should be able to track multiple metrics on that dashboard for ecommerce, that will tell us any issues or bottle necks or alerts.  3. should the patient only click the click from inside the platform how do other companies solve this today, especially for a hipaa compliant ecommerce platform?" | US-8, FR-039 to FR-042, US-5, US-6 |
| Q10 | How does the patient reach their order? | A notice with no details, then sign-in — because the Fullscript integration emails the patient (S02.3) and HHS guidance (FAQ 570, via a law-firm summary) says to limit health information in email | "ok" | FR-042, FR-043, FR-044, EC-14 |
| Q11 | Who sees the e-commerce dashboard, what is on it, and which milestone builds it? | Order-status list and practice alerts for the provider in M5; platform health dashboard for platform staff in M6; alerts on the dashboard only | "yes, thats good seperation, platform staff should also not see any pii data, just eccommerce related data" | FR-045 to FR-050, NFR-004, NFR-012, NG-11, A-10, A-11 |

## Risks

| Id | Risk | Type | Likelihood | Impact | Mitigation in this PRD |
|---|---|---|---|---|---|
| RISK-1 | Practices already order from the chart through an outside seller and see no reason to switch | value | H | H | SC-002 tracks the switch; the open question on outside-seller volume gives its baseline |
| RISK-2 | Providers resist the 0.75% fee coming out of their margin | viability | M | M | FR-002 shows the payout before sending; A-7 is confirmed at G1 |
| RISK-3 | A price changing after the order is sent confuses patients | usability | M | M | FR-022 notice and FR-023 checkout lock |
| RISK-4 | Campaigns, refills and refunds pull the slice past its appetite | feasibility | M | H | NG-5, NG-6, NG-7; US-7 sits in Later |
| RISK-5 | The first-year targets rest on wide estimates | viability | H | M | SC-001 and SC-002 are aspirational, reviewed monthly |

## Milestone cut

| Milestone | Goal (one line) | Scope (FR ids) | Proves (SC / AE ids) | Exit demo (one sentence) |
|---|---|---|---|---|
| M1 Research | Approved brief + cited research | none (docs only) | G0 approval | A reviewer reads the brief and every R01 to R13 note. |
| M2 Product | Approved PRD (+ clarifications) | none (docs only) | G1 approval | A reviewer reads docs/product/prd.md. |
| M3 Design | Approved HLD, LLD, data design, contract, diagrams | none (docs only) | G2-G3 approvals | A reviewer can read every design doc from docs/README.md. |
| M4 Tracer bullet | Each person signs in; provider sends an order, patient pays once, the split is recorded and shown to the cent | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-017, FR-031, FR-035, FR-036, FR-039, FR-040, FR-041, FR-042, FR-043, FR-044, FR-050 | AE-001 to AE-015, AE-028, AE-031, AE-032, AE-037 to AE-041, AE-047 | Dr. Chen sends Ana a $60.00 order, Ana pays it with the test payment, and a reviewer sees $30.00 + $29.55 + $0.45. |
| M5 Prices and stock | Price-change form with history, price notices, checkout lock, stock limits, practice dashboard | FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-037, FR-038, FR-045, FR-046, FR-047 | AE-016 to AE-027, AE-035, AE-036, AE-042 to AE-044 | Dr. Chen changes a price, Ana sees the notice, pays, and the dashboard shows the sale and lower stock. |
| M6 Measurement | Platform health dashboard with the monthly volume report and alerts | FR-032, FR-048, FR-049 | AE-029, AE-045, AE-046, SC-001, SC-002, SC-003 | Platform staff open October's health dashboard, see 80% sent-to-paid and one order flagged for review, with no patient names. |
| Later | Not in this appetite: pricing campaigns and corrections | FR-016, FR-033, FR-034 | — | — |

## Constraints

| Id | Constraint | Names | Mandated by | Source |
|---|---|---|---|---|
| C-1 | No technology is required or off-limits; the stack is chosen at design from the research | none | assignment | REQ-14 (project brief, §Technology) |
| C-2 | Cerbo's own stack is context for the design, not a requirement | TypeScript, JavaScript, Vue, MySQL, Postgres, AWS | assignment (no restriction) | REQ-14 (project brief, §Technology); R01 |
| C-3 | Payments, sign-in, email and shipping are stand-ins with clean seams, and the docs list each stand-in | none | assignment | REQ-07 (project brief, §PRD) |
| C-4 | The platform fee is 75 bps (0.75%) of the transaction | none | assignment | REQ-04 (project brief, §Functional requirements 3) |
| C-5 | US only; tax, shipping cost and regulatory compliance are out of scope; the platform holds the inventory | none | assignment | REQ-08, REQ-10 (project brief, §PRD, §out of scope) |
| C-6 | The AI usage log lives at docs/AI_USAGE.md, opening with an index in the assignment's three-ask order | none | assignment + human | REQ-15, REQ-22; brief (Q2) and (Q3) |
| C-7 | The earlier one-shot build in main is not an input | none | human | D22 |

### Assignment trace

| REQ | What it asks (short) | Covered by |
|---|---|---|
| REQ-01 | Working slice: provider orders, patient pays, split recorded | US-1, US-2, US-3, M4 |
| REQ-02 | Provider picks supplements and sets price or margin per item | FR-001, FR-002, FR-017, FR-018 |
| REQ-03 | Patient pays; stand-in payment is fine | FR-006, FR-007, FR-008, FR-035 |
| REQ-04 | Compute and keep item cost, provider margin, 75 bps fee | FR-010, FR-011, FR-012, C-4 |
| REQ-05 | Split correct and auditable to the cent | FR-013, FR-014, FR-015, FR-036, NFR-003 |
| REQ-06 | Dashboard of what sold; inventory updates | FR-027, FR-028, FR-029, FR-030 |
| REQ-07 | Stub external systems with clean seams; say what is stubbed | FR-007, C-3, A-6 |
| REQ-08 | Out of scope list | NG-1 to NG-4, NG-8, C-5 |
| REQ-09 | Headline metric and leading indicator measurable later | SC-001, SC-002, SC-003, FR-031, FR-032 |
| REQ-10 | Platform holds inventory, US only, compliance out | A-1, C-5 |
| REQ-11 | Smallest thing that proves understanding | Milestone cut (M4 tracer bullet), Appetite |
| REQ-13 | Make assumptions and document why | Assumptions A-1 to A-8 |
| REQ-14 | No technology restrictions | C-1, C-2 |
| REQ-15 | AI usage documentation | C-6 |
| REQ-22 | AI usage log deliverable | C-6 |
| REQ-24 | 1–2 day guidance | Appetite |

## Change log

| Date | Change | Ids affected | Gate |
|---|---|---|---|
| 2026-10-09 20:13 CDT | First draft | all | G1 |
| 2026-10-09 20:24 CDT | G1 Revise: answered the 8 open questions (Q6) and confirmed A-2 to A-5 (Q7); added FR-037 checkout lock expiry and FR-038 providers cannot adjust stock | NFR-001, NFR-005, FR-017, FR-018, FR-030, FR-037, FR-038, SC-002, SC-003, AE-015, AE-027, AE-035, AE-036, EC-6, A-2 to A-5 | G1 |
| 2026-10-09 20:27 CDT | G1 Revise: HIPAA-ready, not HIPAA-compliant (Q8); added NFR-007 to NFR-011, NG-10, A-9 | NFR-007, NFR-008, NFR-009, NFR-010, NFR-011, NG-10, A-9 | G1 |
| 2026-10-09 21:45 CDT | G1 Revise (Q9-Q11): sign-in story US-8, notices without health details, order-status list and practice alerts in M5, platform health dashboard in M6, no patient identity for platform staff | US-5, US-6, US-8, FR-039 to FR-050, NFR-004, NFR-012, AE-037 to AE-047, EC-13, EC-14, NG-11, A-10 to A-12 | G1 |

## Clarifications

None yet.
