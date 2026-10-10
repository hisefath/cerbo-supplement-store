---
id: R14
question: "What financial reports and reconciliation does a payments marketplace like this need, so the operations data can produce our financial reports when needed?"
asked_in: human message 2026-10-09 (design-hld Q3 reply; route approved 22:07 CDT)
unblocks: "A financial-reporting story in the PRD (write-prd Revise), its M6 screens, and the reporting data the HLD must keep"
answered_when: "A payment provider's own docs show the standard reconciliation reports, an accounting source states how gross vs net revenue is reported, and a government source states how long financial records are kept"
status: answered
confidence: medium
supersedes: none
date: 2026-10-09
budget: 8/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R14 What financial reports and reconciliation do we need?

## Answer

Payment platforms reconcile money with two reports: a balance summary (starting balance + activity − payouts =
ending balance) and a breakdown of every transaction by category (charges, refunds, processing fees, platform
earnings, transfers, payouts), each available as a summary and as itemized rows for export. Whether the platform
reports the whole patient payment as revenue (gross) or only its 0.75% fee (net) is an accounting judgment: the rule
turns on who controls the goods before the patient gets them, and here the platform holds the stock while the
provider sets the price. Records are kept at least 3 years (up to 7 in some cases). Confidence: medium, because the
report shapes and retention are Tier A, but gross vs net rests on two Tier-B accounting summaries and needs an
accountant. (S14.1, S14.2, S14.3, S14.4, S14.5)

## Takeaway

A financial report for this store is a period summary that must balance to the cent, plus every transaction behind
it, exportable; and how we count revenue (all of the sale or just our fee) is a question for an accountant, not code.

## Findings

- **F1** [LB] Stripe's payout reconciliation report has a Balance summary: starting balance, activity, total payouts and ending balance for a date range. — S14.1 (A), Balance Summary columns
- **F2** [LB] Transactions are grouped by reporting category, such as charges, refunds and fees, each with count, gross, fee and net. — S14.1 (A), Payouts reconciliation summary
- **F3** [LB] Each report section downloads as a Summary (the totals) or Itemized (every transaction behind them), as CSV for all accounts. — S14.1 (A), Download report data
- **F4** A platform's application fees appear under the reporting category platform_earning, refunds of them under platform_earning_refund. — S14.2 (A), More descriptive category names
- **F5** [LB] Under ASC 606 (ASU 2016-08), an entity is a principal if it controls the specified good before it is transferred to the customer; principals report revenue gross, agents report their fee or commission net. — S14.3 (B), C.9; S14.4 (B), Reporting basis (independent publishers)
- **F6** Indicators of control include primary responsibility for fulfilment, inventory risk and discretion in setting the price; they are not exhaustive. — S14.4 (B), Indicators
- **F7** [LB] The IRS says to keep business records 3 years in general, 6 years if more than 25% of income went unreported, and 7 years for bad-debt or worthless-securities claims. — S14.5 (A), periods list
- **F8** The platform's fee can be taken on each charge as an application fee (destination charges). — S05.1 (A), see R05

## Inferences

- **I1** from F1 + F2 + F3: a report for this store has the same two layers: period totals that must balance, and the itemized orders behind them. Mapping: patient payments ≈ charges, platform fee ≈ platform earnings, provider payouts ≈ transfers, item cost = inventory cost. Fairly sure of the shape.
- **I2** from F5 + F6 + PRD REQ-10, FR-018: the platform holds the inventory (inventory risk, points to principal) but the provider sets the price (pricing discretion, points to agent), so gross vs net is genuinely mixed. Moderately sure that it is a judgment call; not sure which way it falls.
- **I3** from F7: financial records (paid orders, splits, payouts, price and stock history) need at least 3 years of retention, and the pilot's 24-hour backup target is separate from retention. Fairly sure.
- **I4** from F1 + PRD FR-010 to FR-013: because every paid order already records cost, payout and fee in whole cents, a period report can be built by adding them up, and its own check is the same equation at period level. Fairly sure.

## Gaps

- ⚠ Which way gross vs net falls for this store — why: needs an accountant's judgment on the full facts; only Tier-B summaries read — would close it: ask the partner's finance team, or show both views in the report
- ⚠ What the partner's finance team actually exports to (accounting software, spreadsheets) — why: no source — would close it: ask the partner
- ⚠ The FASB codification text itself — why: not read; two independent Tier-B summaries used — would close it: read ASC 606-10-55-36 to 55-40

## Handoffs

- write-prd: should the financial report show period totals (patient payments, item cost, provider payouts, platform fees) that must balance to the cent, with an itemized export behind them? — rests on F1, F2, F3, I1, I4
- write-prd: should the report show revenue both gross and net, labelled for the finance team to choose, instead of picking one? — rests on F5, F6, I2
- write-prd: should financial records be kept at least 3 years? — rests on F7, I3
- design-hld: how will the system keep 3+ years of financial records while the pilot backs up daily? — rests on F7, I3
