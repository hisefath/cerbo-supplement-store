---
id: R04
question: "How do existing practitioner supplement dispensaries set the patient price and the practitioner's margin (markups, caps, discounts), and who pays their fees?"
asked_in: specs/M1-in-ehr-supplement-orders/brief.md#research-questions
unblocks: "FR1 price-or-margin rules; who bears the 75 bps"
answered_when: "a dispensary's own docs or terms state it"
status: partial
confidence: medium
supersedes: none
date: 2026-10-09
budget: 5/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R04 How dispensaries set patient price and practitioner margin

## Answer

On Fullscript, the patient price is the product's retail price (MSRP) minus a discount the practitioner chooses; the practitioner's margin is whatever the discount leaves, so a bigger patient discount means less margin, and the combined discount is capped at 35% in the US. Practitioners who never set up a profit account earn nothing and their patients get a fixed 10% off MSRP; profit accounts are paid out every 30 days, and no practitioner fee is mentioned. Confidence: medium, because one dispensary's own docs settle how it works (Tier A), but no second dispensary was read and fees are only shown by absence. (S04.1, S04.2, S04.3)

## Takeaway

On the leading dispensary, practitioners don't type a price: they choose how much of a fixed retail price to give back to the patient, and their margin is what's left.

## Findings

- **F1** [LB] New provider accounts are "no-profit" by default and earn no margin; their patients get 10% off MSRP, a discount that cannot be adjusted. — S04.1 (A), whole page
- **F2** [LB] "When you increase your dispensary discount, your profit goes down—and when you decrease it, your profit goes up." — S04.2 (A), body
- **F3** [LB] Combined discounts "can't exceed the regional maximum: 35% in the US and 25% in Canada"; discounts are calculated off MSRP and apply to supplements only. — S04.2 (A), body
- **F4** On profit accounts, the practitioner picks a dispensary discount from a menu; discounts stack, and the maximum discount means 0% profit. — S04.3 (A), body
- **F5** Profit account holders become the "seller of record" and report income to the IRS; Fullscript handles all applicable sales tax on patient orders. — S04.3 (A), body
- **F6** By default available earnings are paid every 30 days; earnings accumulate as orders ship. — S04.3 (A), body
- **F7** Neither the no-profit nor the profit article mentions any fee charged to practitioners. — S04.1 (A), S04.3 (A)

## Inferences

- **I1** from F2 + F3 + F4: Fullscript expresses the practitioner's choice as a discount off a fixed retail price, which is equivalent to "price = MSRP × (1 − discount)" with margin = price − cost; the assignment's "set the price (or margin)" asks for the same lever expressed directly. Highly likely.
- **I2** from F1: a dispensary can operate with zero practitioner margin, so a design that forbids a zero-margin order would differ from the market's default. Likely.
- **I3** from F5 + F6: practitioner payouts are batched (every 30 days) after shipping, not paid at the moment the patient pays. Likely for Fullscript; unverified for others.

## Gaps

- ⚠ How does a second dispensary (e.g. Wholescripts, Emerson) set margin and fees? — why: only one dispensary read; a market claim needs a second source — would close it: read Wholescripts' or Emerson's own help pages
- ⚠ Does Fullscript take a fee or margin of its own from practitioner orders, and how? — why: no fee is mentioned, which is absence, not evidence — would close it: Fullscript terms of service or pricing page
- ⚠ Is there a price ceiling (patient price above MSRP)? — why: not stated in the pages read — would close it: Fullscript pricing terms

## Handoffs

- write-prd: Should the provider set the patient price directly, a margin percentage, or a discount off a retail price, given the leading dispensary uses a capped discount off MSRP? — rests on F2, F3, I1
- write-prd: Is a zero-margin (at-cost) order allowed, given dispensaries default to no-profit accounts? — rests on F1, I2
- write-prd: Is a cap on provider margin or patient price part of scope? — rests on F3
- design-hld: Are provider payouts recorded per order now and settled in a later batch? — rests on F6, I3
