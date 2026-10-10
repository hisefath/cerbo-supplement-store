---
id: R08
question: "Has it been built already? Which products already let a provider order supplements for a patient inside an EHR or practice tool, how many users do they have, and what do they leave unsolved?"
asked_in: human message 2026-10-09 (market research follow-up, G-L5 H3 then gather-evidence Q4)
unblocks: "Our problem framing and differentiation: if a solution exists, they change"
answered_when: "At least 3 existing products are identified from their own pages, each with what it does, who it serves and a stated user count (or 'not disclosed')"
status: answered
confidence: high
supersedes: none
date: 2026-10-09
budget: 9/20 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R08 Has the in-EHR supplement order already been built?

## Answer

Yes, in pieces. Fullscript (which says it serves 125,000 providers) already lets providers recommend and order
from inside 20+ EHRs, Cerbo included, and WholeScripts does the same inside OptiMantra; but in both the patient pays
the marketplace, not the EHR, and the margin and fee stay with the marketplace. All-in-one practice tools
(Supplement Practice) and in-office dispensing tools (PlPRx) let the practice sell from its own stock, but for
prescriptions or without the EHR-owner taking a platform fee. Confidence: high, because every product claim comes
from the company's own page. (S08.1, S08.2, S08.3, S08.4, S08.5, S02.1, S02.3)

## Takeaway

The "order supplements from inside the chart" part already exists through marketplaces like Fullscript; what does
not exist is the EHR itself being the store, so the patient pays the EHR and the EHR keeps a fee.

## Findings

- **F1** [LB] Fullscript states it serves "125,000 providers" and more than 10 million patients; no as-of date. Emerson Ecologics, "a Fullscript company", says "100,000+ practitioners on Fullscript", also undated. — S08.1 (A), About; S08.6 (A), About us
- **F2** [LB] Fullscript lists EHR integrations including Epic, athenahealth, Elation, Practice Better, Jane, Charm, OptiMantra, Healthie, Cerbo and others: "Recommend, order, and follow-up without leaving your preferred EHR workflow." — S08.2 (A), Integrations page
- **F3** [LB] In Cerbo's Fullscript integration the plan is sent from Cerbo and Fullscript emails the patient, who orders and pays on Fullscript. — S02.3 (A), see R02
- **F4** [LB] OptiMantra (a Cerbo product line, R01 F4) launched a WholeScripts integration on 2026-03-04: providers pick supplements "directly within the patient's chart" and WholeScripts ships to the patient; patient payment is not described. — S08.3 (A), blog post
- **F5** [LB] Cerbo itself already offers in-house supplement inventory alongside its Fullscript storefront. — S02.1 (A), see R02
- **F6** PlPRx sells in-office dispensing software for prescription medications (barcodes, labels, inventory, Stripe checkout or pay at point of care), claiming 1,000+ practices and 2,200+ prescribers since 2007, undated; supplements are not mentioned. — S08.4 (A), homepage
- **F7** Supplement Practice is an all-in-one tool for chiropractors, nutritionists, naturopaths, acupuncturists and functional medicine doctors, with protocols, inventory (Pro plan) and Stripe or Square invoicing, at $100 or $160 per month; no user count is stated and it replaces rather than integrates with EHRs. — S08.5 (A), homepage, pricing

## Inferences

- **I1** from F1 + F2 + F3: the incumbent for "order from the chart" is a marketplace whose economics live outside the EHR; Cerbo's own customers already have it, so the new slice is not a new capability for providers but a change of who is paid. Fairly sure; no source compares them directly.
- **I2** from F5 + F6 + F7: selling from practice-held stock with checkout already exists in standalone tools, so a provider-set price on held inventory is familiar to the target user. Moderately sure; neither tool names a platform fee.
- **I3** from F1: Fullscript's 100,000–125,000 provider claim is the largest stated base found; the two undated figures disagree, so treat it as a range of vendor claims, not a market count.

## Gaps

- ⚠ How many users WholeScripts has — why: wholescripts.com returned no readable content — would close it: read WholeScripts' or XYMOGEN's own about page
- ⚠ What share of Fullscript's providers order through an EHR integration rather than Fullscript's own site — why: no Tier-A source found — would close it: ask the partner (Cerbo sees its own integration usage)
- ⚠ Other in-EHR dispensaries not checked (Wellevate, Designs for Health, Thorne, practice storefronts) — why: kept to the answered-when bar — would close it: option: run anthropic-skills:deep-research for this question

## Handoffs

- write-prd: is the problem statement "providers can't order from the chart" (already solved) or "the patient pays a third party and the practice's revenue leaves Cerbo" (unsolved)? — rests on F2, F3, I1
- write-prd: should the PRD name Fullscript's flow as the baseline the slice is compared against? — rests on F1, F3
