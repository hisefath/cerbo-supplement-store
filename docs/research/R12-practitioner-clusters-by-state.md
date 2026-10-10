---
id: R12
question: "Clusters: where are those practitioners concentrated, by state and time zone?"
asked_in: human message 2026-10-09 (market research follow-up, G-L5 H3 then gather-evidence Q4)
unblocks: "Partly: mainly feeds R13's peak hours"
answered_when: "Registry or BLS counts by state, with per-capita rates and the date of the data, for the top 10 states"
status: answered
confidence: medium
supersedes: none
date: 2026-10-09
budget: 10/20 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R12 Where do the practitioners cluster?

## Answer

Using chiropractors as the one supplement-selling profession BLS counts by state (May 2025), the biggest clusters by
count are Florida, Texas, California and Illinois, and the densest per person are the upper Midwest and Plains (North
Dakota, Iowa, South Dakota, Nebraska) and Colorado. About 45% are in Eastern-time states and 33% in Central, so 78%
work on Eastern or Central time. Confidence: medium, because the counts are Tier A, but chiropractors only stand in
for Cerbo's functional, DPC and cash-pay customers. (S12.1, S12.2, S10.3)

## Takeaway

Most of the likely users sit on US Eastern and Central time, with the most practitioners in Florida, Texas,
California and Illinois, so the busiest hours follow the East Coast working day.

## Findings

- **F1** [LB] BLS OEWS counts 39,610 wage-and-salary chiropractor jobs across the 50 states in May 2025. — S12.1 (A), 50 state series, year 2025, period A01
- **F2** [LB] Top 10 states by count (May 2025, BLS) with chiropractors per 100,000 residents (July 2024 Census population): Florida 3,220 (13.8) · Texas 2,840 (9.1) · California 2,760 (7.0) · Illinois 2,190 (17.2) · Pennsylvania 1,770 (13.5) · Georgia 1,500 (13.4) · Ohio 1,380 (11.6) · New Jersey 1,370 (14.4) · New York 1,360 (6.8) · Colorado 1,340 (22.5). — S12.1 (A), S12.2 (A); per-capita computed from both
- **F3** [LB] Top 10 states per 100,000 residents: North Dakota 45.2 · Iowa 29.9 · South Dakota 28.1 · Nebraska 24.9 · Colorado 22.5 · Montana 21.1 · Wisconsin 20.3 · Minnesota 20.0 · Kansas 19.2 · Wyoming 18.7. — S12.1 (A), S12.2 (A)
- **F4** BLS OOH counts about 61,700 chiropractor jobs in 2025 with 36% self-employed; OEWS (F1) leaves the self-employed out, and 39,610 ÷ 0.64 ≈ 61,900 matches. — S10.3 (A), Quick facts

## Inferences

- **I1** from F1 + F2: Formula: sum of state counts per majority time zone ÷ 39,610. Assumptions: split states (Florida, Texas, Kentucky, Indiana and others) are assigned whole. Range: each share ±3 points. Result: Eastern 18,000 (45%), Central 12,970 (33%), Mountain 3,590 (9%), Pacific 4,740 (12%), Alaska and Hawaii 310 (1%). Fairly sure of the order.
- **I2** from I1: the working day of 78% of practitioners spans 8am Eastern to 6pm Central, which is 12:00–23:00 UTC in daylight time; the quietest common window is the US night, about 05:00–11:00 UTC (1am–7am Eastern, 10pm–4am Pacific, daylight time). Feeds R13.
- **I3** from F2 + F3: volume (big states) and density (Midwest) point to different places, so a launch region is a choice, not a fact. Moderately sure.

## Gaps

- ⚠ State counts for the professions Cerbo actually serves (functional MDs and DOs, naturopaths, DPC physicians, nurse practitioners) — why: BLS has no occupation code for them; NPPES counts by NUCC taxonomy need the bulk file; the Census business-patterns API needs a key — would close it: count NPPES taxonomy codes (e.g. naturopath 175F00000X) from the CMS bulk download, or ask the partner for Cerbo's customer count by state
- ⚠ Naturopaths are licensed only in some states — why: not read this pass — would close it: read the AANP licensed-states list

## Handoffs

- design-hld: should the system plan around a working-day peak that follows US Eastern and Central time, with the maintenance window in the US night (about 05:00–11:00 UTC in daylight time)? — rests on I1, I2
- write-prd: should the PRD's personas or demo data name a region, or stay national? — rests on F2, F3, I3
