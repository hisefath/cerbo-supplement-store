---
id: R11
question: "Winnable share: what share could Cerbo realistically capture, given its installed base and competitors?"
asked_in: human message 2026-10-09 (market research follow-up, G-L5 H3 then gather-evidence Q4)
unblocks: "Grounds the SM-01 target"
answered_when: "Cerbo's installed base and at least one competitor's base or a cited adoption benchmark give a SOM formula and a range"
status: answered
confidence: medium
supersedes: none
date: 2026-10-09
budget: 2/20 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R11 What share could Cerbo win?

## Answer

In a first year, Cerbo could plausibly move about $40M of patient spend in-house (range $3M–$140M), about $0.30M in
75 bps fees. That figure is its reachable $240M (R10) × the 22% of practitioners who said they planned to adopt a
fulfillment tool × 75% of an adopter's volume. Fullscript already sits inside Cerbo, with a claimed 125,000 providers,
so every in-house dollar is won from an incumbent. Confidence: medium, because the bases are Tier A but the only
adoption benchmark is a 2016 trade survey. (S02.1, S08.1, S09.3, S02.3)

## Takeaway

Even if only about one in five Cerbo practices switch in the first year, that is tens of millions of dollars moving
through Cerbo; the real fight is against Fullscript, which those practices already use.

## Findings

- **F1** [LB] Cerbo says it has helped more than 5,000 practitioners. — S02.1 (A), homepage
- **F2** [LB] Fullscript, the incumbent, claims 125,000 providers (undated) and is already integrated into Cerbo, where the patient orders and pays on Fullscript. — S08.1 (A), About; S02.3 (A), see R02
- **F3** In NBJ's 2016 survey of 400+ practitioners, 29% used patient fulfillment tools and 22% planned to start the next year. — S09.3 (B), Dispensing section
- **F4** [LB] The partner calls the slice a revenue line "on volume that already exists", with volume migrated off third-party marketplaces as the leading indicator. — S06.1 (A), §Business context, §Impact metrics

## Inferences

- **I1** from F1 + F3 + R10 I3: Formula: $240M reachable spend × 22% of practices adopting × 75% of their volume moved = $40M of in-house patient spend in year one (SOM). Assumptions: A-1 R10 I3's SAM; A-2 NBJ's 22% "plan to adopt next year" stands in for first-year adoption; A-3 an adopting practice moves three quarters of its volume. Range: $3M – $140M, base $40M (low = $60M × 10% × 50%; high = $480M × 29% × 100%).
- **I2** from I1: Formula: $40M × 0.0075 = $0.30M a year in platform fees. Assumptions: A-1 to A-3. Range: $0.02M – $1.0M, base $0.30M.
- **I3** from F1 + F2: Formula: 5,000 ÷ 125,000 = 4% of Fullscript's claimed providers; $40M ÷ $6.8B (R10 I1) = 0.6% of the national channel. Assumptions: A-1 to A-3; both counts are vendor claims. Range: 0.04% – 2.7% of the national channel, base 0.6%. So the share that matters is of Cerbo's own base, not of the national market.
- **I4** from F2 + F4: Formula: SM-01 = in-house supplement spend ÷ (in-house + Fullscript spend) in the same practices, so it needs both sides counted. Assumptions: Fullscript volume per practice can be observed (R03 left this partial). Range: 0% – 100% by definition; base about 75% for an adopting practice (A-3). Fairly sure.

## Gaps

- ⚠ A current adoption benchmark for an EHR-native dispensary or embedded payments — why: no Tier-A source found in 2 calls; Weave's 10-K search showed no attach rate — would close it: ask the partner for Fullscript storefront adoption among Cerbo practices, or option: run anthropic-skills:deep-research for this question
- ⚠ Share of each practice's supplement volume that goes through Fullscript today — why: no source — would close it: ask the partner

## Handoffs

- write-prd: should the SM-01 target be the share of a practice's supplement volume moved off Fullscript, with I1's 22% × 75% as the aspirational first-year number? — rests on I1, I4
- write-prd: is the SOM range wide enough that the target should be marked aspirational rather than a hard gate? — rests on I1, F3
