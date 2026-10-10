---
id: R10
question: "Market size: how many US practitioners could use this, and how much supplement volume do they dispense? (total, reachable by Cerbo)"
asked_in: human message 2026-10-09 (market research follow-up, G-L5 H3 then gather-evidence Q4)
unblocks: "Grounds the North Star target"
answered_when: "A count of relevant US practitioners from a government registry or BLS, plus a cited spend-per-patient input, give a bottom-up estimate with a formula and a range"
status: partial
confidence: medium
supersedes: none
date: 2026-10-09
budget: 8/20 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R10 How big is the market?

## Answer

The US practitioner supplement channel is roughly $6–7 billion a year (2025): NBJ's 9.3% share of $72.88B is about
$6.8B, and a bottom-up count of Fullscript's 125,000 providers gives about $6.0B. The part Cerbo can reach through
its 5,000+ practitioners is about $240M a year of patient spend (range $60M–$480M), which would be about $1.8M a year
in 75 bps fees. Confidence: medium, because the spend input is one trade-association survey (B) and the patients
per practitioner come from a vendor's own claim; both are inferences, not counts. (S10.1, S10.2, S10.3, S10.4, S08.1, S02.1)

## Takeaway

Practitioners sell about $7 billion of supplements a year in the US; Cerbo's own customers might move about a quarter
of a billion of that, and 75 bps of it is roughly $2 million a year.

## Findings

- **F1** US supplement sales were $72.88B in 2025 (+5.5%), and the practitioner channel (healthcare practitioners, gyms, health clubs) held 9.3% of sales, per NBJ data reported 2026-03-16. — S10.1 (B), article body
- **F2** NBJ's editor puts the practitioner share at an estimated 9.2% in 2024, growing 7.8% that year, and projects 9.7% in 2028. — S10.2 (B), Editor's Take (same publisher's data as F1, so not independent)
- **F3** [LB] BLS counts about 61,700 chiropractor jobs in 2025, 36% self-employed: one profession that sells supplements, as a registry floor. — S10.3 (A), Quick facts, Work environment
- **F4** The CRN 2024 consumer survey (Ipsos) found 75% of Americans use supplements, with a median spend of $50 a month in 2024. — S10.4 (B), article body
- **F5** Fullscript claims "125,000 providers" and more than 10 million patients, undated; that is about 80 patients per provider (vendor claim). — S08.1 (A for the claim, C for the market)
- **F6** [LB] Cerbo says it has helped more than 5,000 practitioners. — S02.1 (A), homepage

## Inferences

- **I1** from F1: Formula: $72.88B × 9.3% = $6.8B practitioner-channel TAM (2025 USD). Assumptions: A-1 NBJ's channel share is accurate; A-2 the gyms and health clubs inside the channel are a small part. Range: $5.1B – $6.8B, base $6.8B (low takes out 25% for gyms and clubs).
- **I2** from F4 + F5: Formula: 125,000 providers × 80 ordering patients × $600 a year = $6.0B bottom-up TAM cross-check. Assumptions: A-3 each provider's 80 patients each buy for a full year; A-4 the $50 median monthly spend of all supplement users applies to practitioner patients. Range: $3.0B – $6.0B, base $6.0B (low halves A-3). Agrees with I1 within about 10%.
- **I3** from F4 + F5 + F6: Formula: 5,000 practitioners × 80 ordering patients × $600 a year = $240M a year of patient spend Cerbo can reach (SAM). Assumptions: A-3, A-4, A-5 Cerbo's practitioners order like Fullscript's average provider. Range: $60M – $480M, base $240M (low = 40 patients × $300; high = 160 patients × $600).
- **I4** from I3: Formula: $240M × 0.0075 = $1.8M a year in platform fees if every reachable dollar moved in-house. Assumptions: A-3, A-4, A-5, A-6 100% migration (R11 cuts this down). Range: $0.45M – $3.6M, base $1.8M.
- **I5** from F3 + F5: Fullscript's 125,000 is about twice BLS's chiropractor count, which fits a provider mix of chiropractors, MDs, NDs, nutritionists and others. Moderately sure.

## Gaps

- ⚠ Spend per practitioner patient — why: no Tier-A source found; F4 is all supplement users, one Tier-B survey; the CRN figure for buyers from practitioners was not in the article read — would close it: read CRN's own 2024 survey release, or ask the partner for average order value on Cerbo's Fullscript storefront
- ⚠ Registry count of all supplement-recommending practitioners (MD, DO, ND, DC, RD, NP) — why: cap planning; NPPES counts by taxonomy need a bulk download — would close it: count NPPES taxonomy codes (R12)
- ⚠ NBJ practitioner channel dollar figure, and a second independent source for the 9.3% channel share (F1 and F2 are both NBJ) — why: unread: NBJ Practitioner Channel Report 2026 (paywall); F1 and F4 each rest on one Tier-B publisher, so neither is tagged load-bearing — would close it: buy or borrow the report

## Handoffs

- write-prd: should the North Star target be set from Cerbo's reachable spend (I3, about $240M a year) or from a share of it (R11)? — rests on I3, I4
- write-prd: which year and currency should every money target state (2025 USD here)? — rests on F1, F4
