---
id: R09
question: "Ideal customer: which practice types, sizes and payment models dispense supplements most, and what triggers them to switch?"
asked_in: human message 2026-10-09 (market research follow-up, G-L5 H3 then gather-evidence Q4)
unblocks: "The PRD's primary user and personas"
answered_when: "Cerbo's own customer description plus a professional body or registry source describe practice type, size and payment model"
status: partial
confidence: medium
supersedes: none
date: 2026-10-09
budget: 8/20 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R09 Who is the ideal customer?

## Answer

Cerbo's own pages describe its customer as a small-to-midsize, cash-pay or membership practice: functional and
integrative medicine, direct primary care, IV and hormone clinics, med spas and other cash-based practices, more than
5,000 practitioners in all. The AAFP confirms that direct primary care runs on a $50–100 monthly fee without insurance,
with about 413 patients per panel. Which of these types dispenses supplements most is only shown by one 2016 trade
survey, so that part stays partial. Confidence: medium, because practice type, size and payment model rest on Tier-A
pages, but the dispensing rate rests on a single Tier-B survey. (S02.1, S09.1, S09.2, S09.3)

## Takeaway

The ideal customer is a small clinic paid in cash or by membership, not insurance, where the doctor already sells
supplements and is tired of fronting the money and chasing patients to pay it back.

## Findings

- **F1** [LB] Cerbo lists the practices it serves as Functional and Integrative Medicine, Direct Primary Care, IV and BHRT, Med Spa and Aesthetics, and Cash-Based Practices, and says it "has helped more than 5000 practitioners". — S02.1 (A), homepage, Who we serve
- **F2** [LB] Cerbo says its interface is "designed for small-to-midsize practices". — S09.1 (A), Functional and Integrative Medicine page
- **F3** [LB] Cerbo says it is "optimized for cash-based, membership, or direct-pay billing models", and offers "inventory management and dispensing for supplements". — S09.1 (A), same page
- **F4** [LB] The AAFP says direct primary care practices typically do not accept insurance, charge $50–100 a month in membership fees, and average a panel of 413 patients (2024 data brief). — S09.2 (A), Direct primary care page
- **F5** In an NBJ survey of 400+ practitioners linked to supplement sellers (Nov–Dec 2016), 86% sold supplements in the office or online, 57% of alternative practitioners relied on cash for more than 90% of their business, supplements were more than 20% of income for 31%, and most sales happened in-office. — S09.3 (B), whole article
- **F6** [LB] The switching trigger the partner names: the provider fronts the money, chases reimbursement, and none of it reaches the clinical record or the practice's finances. — S06.1 (A), §Problem

## Inferences

- **I1** from F1 + F3 + F4: the customer is paid directly by patients, so a patient paying for supplements in one place where they already pay for care fits the way these practices already take money. Fairly sure.
- **I2** from F2 + F4: a typical customer is a handful of clinicians with a few hundred to a few thousand patients, so per-practice order volume is small and the provider is often also the person who manages stock. Moderately sure; Cerbo gives no size tiers.
- **I3** from F5 + F6: practices that already sell from stock are the most likely early users, because they already do the work the slice automates. Low to moderate confidence: F5 is one dated trade survey.

## Gaps

- ⚠ Which of Cerbo's practice types dispenses supplements most — why: only one Tier-B source (S09.3, 2016, sampled through supplement sellers); no professional body publishes a dispensing rate — would close it: ask the partner for dispensary usage by practice type, or a second independent survey
- ⚠ Practice size distribution for functional and integrative practices — why: no Tier-A source found; AAFP's 2024 data brief PDF returned 404 — would close it: ask the partner, or read the AAFP 2024 DPC data brief
- ⚠ AANP practice data — why: unread: https://naturopathic.org/news/681241/The-Data-Speaks-Naturopathic-Doctors-Are-Thriving-Professionally.htm (403) — would close it: open it in a browser

## Handoffs

- write-prd: is the primary persona the provider in a small cash-pay or membership practice who already sells supplements? — rests on F1, F2, F3, I3
- write-prd: are med spas and IV clinics in or out of the first persona set? — rests on F1
