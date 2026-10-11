# UX flows — In-EHR supplement orders

status: complete
Milestones: M4, M5, M6 · PRD: docs/product/prd.md@998ed94 (G1 re-approved 2026-10-10)
Updated: 2026-10-10 11:05 CDT

## Scope

- UI-critical because: all four P1 stories are done by a person on a screen: everyone signs in (US-8), the provider builds and sends an order (US-1), the patient pays (US-2), and a reviewer reads the split (US-3).
- Primary width: 1280 px for the provider, the reviewer and platform staff (clinic and office computers, PRD P-1 and P-3); 375 px for the patient (they open the order from the practice's message on a phone, PRD P-2) — the human's answer to Q2.
- Runs inside: the provider's order screen imitates a section of the patient's chart in the EHR (a chart header with the fictional patient's name above it); every other screen runs in its own browser tab — the human's answer to Q3.
- Demo spine story: US-1 — Build and send a supplement order, continuing through US-2 and US-3.
- Stories covered: US-1, US-2, US-3, US-4, US-5, US-8 (M4 and M5, the human's answer to Q1); US-6, US-9, US-10 (M6, added after the G1 of 2026-10-09 22:16; operations screens are 1280 px in their own tab)
- Stories with no screen: US-7 — Later. (US-6 has no screen in M4 and M5, only times recorded in the background, FR-031; its M6 screen is S10.)
- Inputs read: AGENTS.md, docs/product/prd.md@ab9f181, docs/research/R14, R15, specs/M1-in-ehr-supplement-orders/brief.md, docs/research/R02, R08, R09, R13 · absent: docs/audit/AUDIT.md (greenfield)

## Screen inventory

| Screen | Name | Purpose (user words, one line) | Stories | Key screen |
|---|---|---|---|---|
| S1 | Supplement order (in the patient's chart) | Pick supplements for this patient at the practice's prices, see my payout, and send it | US-1, US-4, US-5 | yes |
| S2 | Your supplement order (patient) | See what I owe, see any price change, and pay once | US-2, US-4, US-5 | yes |
| S3 | Paid orders (reviewer) | Find a paid order by its number, or one that needs review, without seeing who the patient is | US-3, US-8 | no |
| S4 | Paid order breakdown (reviewer) | See where every cent of one paid order went, by order number only | US-3, US-8 | yes |
| S5 | Practice prices | See my practice's prices, change one on purpose, and see who changed what | US-4 | no |
| S6 | Practice dashboard | See my practice's orders and their status, cancel a sent order, see what sold, what is left in stock, and what needs attention | US-5, US-1 | no |
| S7 | Stock adjustments (platform staff) | Record stock that arrived or was written off, with a reason | US-5 | no |
| S8 | Sign in | Sign in as myself and land where my role works | US-8 | no |
| S9 | Order notice (stand-in message) | Learn that my practice sent me an order, without any details | US-1, US-8 | no |
| S10 | Platform health dashboard | See where orders get stuck, what needs attention, and in-house volume per practice, as totals | US-6, US-10 | yes |
| S11 | Financial report | Run a period's report that balances to the cent, see gross and net revenue and each provider's payouts, and export it | US-9 | yes |
| S12 | Operations access | See who holds which operations role, and grant or remove one with a reason | US-10 | yes |
| S13 | Access log | Review every role grant and removal in a period | US-10 | no |
| S14 | System health | See availability, errors and slow pages for a period | US-10 | no |
| S15 | Your home | Land somewhere safe after sign-in and see which pages the role can open | US-8 | no |
| S16 | Your orders | See every order sent to me, newest first, and open one | US-2, US-8 | no |

## Flows

### F1 Build and send an order from the chart — US-1, US-4, US-5

Actor: provider (Dr. Maya Chen) · Trigger: she decides patient Ana Ruiz needs a supplement protocol, with Ana's chart open · Goal: put the order in front of Ana without paying for it herself

1. [S1] Opens the Supplements section of Ana's chart → sees the practice's products, each with its current price and units in stock, and an empty order
2. [S1] Adds 2 Vitamin D3 and 1 Magnesium Glycinate → sees each line, the $60.00 total, the $0.45 platform fee and her $29.55 payout
   - 2a. [S1 · Error] she types a quantity above the units in stock → the quantity is refused with "Only 2 in stock" → she lowers it
   - 2b. [S1 · Error] a product is priced so low her payout would fall below $0.00 → [Send] stays blocked and the product is named as below its lowest allowed price → she removes it, or changes its price on S5
3. [S1] Presses [Send to Ana Ruiz] → sees "Sent. Ana Ruiz will get a notice to sign in and pay." with the total due
   - 3a. [S1 · Error] the order has no items or a quantity of 0 → the order is not sent and the empty or bad line is named → she adds an item or fixes the line
   - 3b. [S1 · Permission denied] the patient belongs to another practice, or her session ended after 15 minutes idle → she sees no order details and is asked to sign in again

Ends when: Dr. Chen sees the order marked sent, and Ana's notice exists.

### F2 Review and pay the order — US-2, US-4, US-5

Actor: patient (Ana Ruiz) · Trigger: a notice from her practice arrives on her phone · Goal: see what she owes and pay once

1. [S9] Reads "Willow Creek Wellness sent you a supplement order. Sign in to view and pay." and taps [Sign in to view] → sees the sign-in page
   - 1a. [S9 · Edge data] someone else reads a forwarded notice → they see only the practice name and the sign-in page
2. [S8] Signs in as herself → her order opens
   - 2a. [S8 · Error] her sign-in details are not recognised → sees what to check and can try again
3. [S2] Reads the order → sees each item, quantity and price, the total due, and that the payment is a test that moves no real money
   - 3a. [S2 · Edge data] a price changed since the order was sent → a notice names the item, its old and new price, and the total updates
   - 3b. [S2 · Permission denied] the order belongs to someone else → sees "We can't find this order" and nothing about it
   - 3c. [S2 · Edge data] the practice cancelled the order → sees "This order was cancelled by your practice." and no way to continue to payment (FR-066)
4. [S2] Starts checkout → sees her prices held for 30 minutes and the amount to pay
   - 4a. [S2 · Edge data] she comes back after 30 minutes without paying → her order shows current prices again, with a notice for any change
   - 4b. [S2 · Permission denied] she was idle for 15 minutes and was signed out → signs in again and returns to her order
5. [S2] Presses [Pay $60.00] → sees a receipt: "Paid $60.00", the items and the time
   - 5a. [S2 · Edge data] she presses pay twice, or retries after a timeout → sees the first payment's result; only one payment exists
   - 5b. [S2 · Error] an item ran out of stock before she paid → the payment is refused, nothing is charged, and the item is named
   - 5c. [S2 · Error] the payment step fails or does not answer → sees that no money was taken and can try again

Ends when: Ana sees "Paid $60.00" on her receipt.

### F3 Check where every cent went — US-3

Actor: platform reviewer · Trigger: a provider asks about a payout, or a weekly check · Goal: confirm one order's split adds up to the cent

1. [S3] Opens Paid orders → sees paid orders, newest first, with order number, practice, provider, amount and time paid, plus a "Needs review" count; no patient name or contact detail anywhere
   - 1a. [S3 · Edge data] an order's split did not add up → it is listed under Needs review, not as paid
2. [S3] Opens order 1042 ($60.00) → [S4] sees $60.00 paid = $30.00 item cost + $29.55 provider payout + $0.45 platform fee, and each line's quantity, price and unit cost
   - 2a. [S4 · Permission denied] someone who is not a platform reviewer opens it → sees no amounts

Ends when: the reviewer sees the three parts add up to the amount paid.

### F4 Change a price on purpose — US-4

Actor: provider (Dr. Chen) · Trigger: she wants a different price for a product than the default · Goal: change it without a typing slip, with a record of why

1. [S5] Opens Practice prices → sees each product's cost, current price and margin, and whether it is still the default
2. [S5] Chooses [Change price] on Omega-3 → a form asks for either a new price or a margin %, and a reason
3. [S5] Enters a 60% margin and "new protocol pricing", presses [Save new price] → sees Omega-3 at $37.50 and a new price history line: who, when, $30.00 → $37.50, the reason
   - 3a. [S5 · Error] the new price would leave her payout below $0.00 on one unit → the change is refused and the lowest allowed price is shown

Ends when: the new price shows on the product and in its price history.

### F5 Check orders, sales and stock — US-5, US-1

Actor: provider (Dr. Chen) · Trigger: monthly planning · Goal: see what sold and what is left

1. [S6] Opens Practice dashboard → sees what needs attention first (orders unpaid for more than 3 days, products with 3 or fewer left), then her orders with patient, total, status and times, then this month's sales per product and units in stock
   - 1a. [S6 · Edge data] Ben Ortiz's order has been unpaid for 4 days → it is flagged "Awaiting payment for 4 days"
2. [S6] Picks another month → sees that month's orders and sales; stock always shows today's count
   - 2a. [S6 · Empty] nothing was sent in that month → sees that there were no orders in it
3. [S6] Presses [Cancel order] on Ben Ortiz's sent, unpaid order and confirms → sees the order marked "Cancelled" and "Order 1043 cancelled. Ben Ortiz will see that your practice cancelled it." (FR-066)
   - 3a. [S6 · Error] the patient has already started checkout, or paid → the cancel is refused: "This order can't be cancelled: the patient has started checkout." (FR-067)

Ends when: she sees her orders' status, sales and stock for the month she chose, with any order she cancelled marked "Cancelled".

### F6 Record a stock change — US-5

Actor: platform staff member · Trigger: a delivery arrives or stock is written off · Goal: make the stock count match the shelf, with a reason

1. [S7] Opens Stock adjustments → sees each product's units in stock and its recent stock history
2. [S7] Records +12 Vitamin D3 with the reason "delivery received" → sees stock 20 and a new history line: who, when, +12, the reason
   - 2a. [S7 · Permission denied] a provider tries to open it → sees that only platform staff can change stock

Ends when: the new count and its history line show.

### F7 Sign in, and be signed out when idle — US-8

Actor: any person (patient, provider, reviewer, platform staff) · Trigger: they open any page · Goal: get to their own work, and nobody else's

1. [S8] Opens any page while signed out → sees the sign-in page and nothing of the page they asked for
2. [S8] Signs in as herself → lands on the page she asked for, or her role's home: a patient her orders, a provider the practice dashboard, a reviewer Paid orders, staff Stock adjustments
   - 2c. [S15] her role has no work page yet (patient, site reliability, data analyst) → sees her home with what to do instead, never a missing page
   - 2d. [S15] she opens an address with no page → sees "We couldn't find that page" and "Go to your home"
   - 2e. [S16] she is a patient → lands on Your orders, her orders newest first, each opening its order page (M6.1)
   - 2a. [S8 · Error] sign-in details not recognised → sees what to check, and her typed name is kept
   - 2b. [S8 · Permission denied] she asked for a page her role does not allow → sees that her account can't open it and where her own work is
3. [S8] Is inactive for 15 minutes → is signed out and sees the sign-in page with "You were signed out after 15 minutes without activity."

Ends when: she is on her own work, or signed out after being idle.

### F8 Find where orders get stuck — US-6, US-10

Actor: data analyst (Dana Ito) · Trigger: monthly business review prep · Goal: see where orders stall and how much volume moved in-house, without opening single orders

1. [S10] Opens the platform health dashboard → sees what needs attention first, then October's order funnel (sent, checkout started, paid, payment failed, checkout expired), median time to pay, out-of-stock refusals, the review count, and in-house volume and fees per practice
   - 1a. [S10 · Edge data] orders needing review is 1, at its alert line → it is marked "Needs attention"
   - 1b. [S10 · Empty] no orders in the chosen month → every measure shows 0 and the funnel says there were no orders
2. [S10] Picks September → sees September's figures
   - 2a. [S10 · Permission denied] she tries to open a single order from a total → she sees that her role shows totals only

Ends when: she has the month's funnel, alerts and volume.

### F9 Close the month — US-9

Actor: finance lead (Fran Fields) · Trigger: month end, or an auditor's question · Goal: a report that balances to the cent, ready to hand over

1. [S11] Opens Financial report and picks October → sees patient payments $90.00, item cost $45.00, provider payouts $44.32, platform fees $0.68, and "Balanced: $90.00 = $45.00 + $44.32 + $0.68"
   - 1a. [S11 · Edge data] one order is a cent short → sees "Not balanced: $0.01 short" with that order named
   - 1b. [S11 · Empty] nothing was paid in the period → every total is $0.00 and the report is balanced
2. [S11] Reads revenue two ways → sees gross $90.00 and net $0.68, each labelled, and each provider's payout total
3. [S11] Presses [Export October] → gets the totals and one line per paid order, by order number, with no patient names
   - 3a. [S11 · Permission denied] anyone other than the finance lead opens or exports it → sees that only the finance lead can

Ends when: Fran holds a balanced October export.

### F10 Grant or remove an operations role — US-10

Actor: SRE (Sam Reyes) · Trigger: someone joins, changes job or leaves · Goal: give each person only the role their work needs

1. [S12] Opens Operations access → sees each operations person and their role
2. [S12] Chooses Dana Ito, picks Data analyst, enters the reason "new hire", presses [Save role] → sees Dana as Data analyst and "Saved. The finance lead will see this in the access log."
   - 2a. [S12 · Error] no reason entered → sees that a reason is required
   - 2b. [S12 · Permission denied] he tries to change his own role → it is refused
   - 2c. [S12 · Permission denied] someone who is not the SRE opens the page → sees that only the SRE can change roles

Ends when: the new role shows and its log entry exists.

### F11 Review the access log — US-10

Actor: finance lead (Fran Fields) · Trigger: monthly review · Goal: check every role change was expected

1. [S13] Opens Access log for October → sees each grant and removal: who acted, for whom, which role, when, and the reason
   - 1a. [S13 · Empty] no changes in the period → sees that no roles changed

Ends when: she has read every change in the period.

### F12 Check system health — US-10

Actor: SRE (Sam Reyes) · Trigger: on-call check or a slow-page complaint · Goal: see whether the system met its targets

1. [S14] Opens System health for October → sees availability, error rate and the share of pages slower than 2 s, each beside its target
   - 1a. [S14 · Permission denied] he follows a link to Order 1042's breakdown → it is refused and shows no amounts

Ends when: he knows whether October met its targets.

## Traceability

| Story | Priority | Flows | Screens |
|---|---|---|---|
| US-1 | P1 | F1, F2, F5 | S1, S2, S6, S9 |
| US-2 | P1 | F2 | S2 |
| US-3 | P1 | F3 | S3, S4 |
| US-8 | P1 | F1, F2, F3, F7 | S3, S4, S8, S9, S15, S16 |
| US-6 | P3 | F8 | S10 |
| US-9 | P3 | F9 | S11 |
| US-10 | P3 | F8, F10, F11, F12 | S10, S12, S13, S14 |
| US-4 | P2 | F1, F2, F4 | S1, S2, S5 |
| US-5 | P2 | F1, F2, F5, F6 | S1, S2, S6, S7 |

## Open questions

- ⚠ How is an order's single platform fee shared across its products on the practice dashboard (FR-028 per-product payout)? Recommended: in proportion to each line's amount — a clarify-spec question on FR-028
- The three questions from the first draft were settled at G1 (PRD Q9-Q11): sign-in became US-8, the order-status list joined the practice dashboard (S6), and the patient reaches the order through a detail-free notice and sign-in (S9, S8).
