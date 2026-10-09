---
id: R06
question: "How common are recurring protocols and refills in functional-medicine supplement ordering?"
asked_in: specs/M1-in-ehr-supplement-orders/brief.md#research-questions
unblocks: "scope: one-off orders now vs recurring later (non-goals)"
answered_when: "an industry or dispensary source with data"
status: partial
confidence: medium
supersedes: none
date: 2026-10-09
budget: 5/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R06 How common recurring protocols and refills are

## Answer

The partner itself describes supplements as "a recurring, high-margin part of these practices' treatment plans — often an ongoing protocol rather than a one-off", and the leading dispensary builds refills, reminders and auto-refill into its product; but no independent data on how many orders are refills was found, and the dispensary's own refill statistics are vendor marketing (colour only). Confidence: medium, because the partner's statement and the product feature are Tier A, while the share of refills is unproven. (S06.1, S06.2)

## Takeaway

Cerbo says supplement orders usually repeat as part of a protocol, so repeat ordering matters, but nobody has published how often it happens.

## Findings

- **F1** [LB] The partner states supplements are "a recurring, high-margin part of these practices' treatment plans — often an ongoing protocol rather than a one-off". — S06.1 (A), §Business context (short quote cleared, brief U-01/Q3)
- **F2** [LB] Fullscript's own product page says reminders, refills, check-ins and follow-ups "run on their own" between appointments, and links to Auto Refill terms. — S06.2 (A), page body
- **F3** Fullscript's page cites "70%" patient adherence when a plan includes lab results, with no source. — S06.2 (C, colour only: vendor statistic without a source)

## Inferences

- **I1** from F1 + F2: repeat ordering is a core expectation in this market; a one-off-only slice is a deliberate scope cut, not an oversight. Likely.

## Gaps

- ⚠ What share of practitioner supplement orders are refills or auto-refills? — why: no independent data found; vendor figures (search lead: "60-70% of practitioners' business comes from refills") are marketing — would close it: an industry survey, Fullscript press or investor material, or ask the partner; option: run anthropic-skills:deep-research for this question
- ⚠ unread: https://fullscript.com/blog/improved-adherence-through-refill-reminders and https://fullscript.com/blog/automate-your-virtual-dispensary (404) — would close it: archived copies

## Handoffs

- write-prd: Is repeat ordering (refills, auto-refill) a non-goal for this slice, recorded as the first "next" item, given the partner calls supplements an ongoing protocol? — rests on F1, F2, I1
- design-hld: Should the order model leave room for a repeat order without building one now? — rests on F1
