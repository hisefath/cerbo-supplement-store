---
id: R13
question: "Usage and load: when do providers and patients use it, and what are the expected users, peak concurrent users and requests per second?"
asked_in: human message 2026-10-09 (market research follow-up, G-L5 H3 then gather-evidence Q4)
unblocks: "The input design needs for sizing and maintenance windows"
answered_when: "Each role's usage hours come from a cited source (or are a stated assumption), and expected users, peak concurrent users and requests per second are given with a formula and a range"
status: answered
confidence: medium
supersedes: none
date: 2026-10-09
budget: 0/20 tool calls (built from R06, R10, R11 and R12 sources already read)
researched_by: Claude Code, claude-opus-5-5
---

# R13 When is it used, and how much load?

## Answer

At first-year scale (about 1,100 adopting practitioners, R11) the system would see about 2,200 provider-side users and
about 88,000 paying patients a year, about 160 peak concurrent users and about 31 requests per second at peak (range
14–60), averaging about 5. Providers work clinic hours on mostly Eastern and Central time; patients pay when the order
reaches them and on monthly refills. The quiet window is the US night, about 05:00–11:00 UTC. Confidence: medium,
because the user counts trace to cited bases (R10–R12), but usage hours and actions per user are stated assumptions,
not measurements. (S02.1, S09.3, S08.1, S12.1, S06.1, S06.2)

## Takeaway

This is a low-traffic system, around 30 requests a second at its busiest, so the hard part is getting every cent and
every payment right, not handling scale.

## Findings

- **F1** [LB] Cerbo has more than 5,000 practitioners. — S02.1 (A), homepage
- **F2** In NBJ's 2016 survey, 22% of practitioners planned to adopt a patient fulfillment tool the next year. — S09.3 (B), Dispensing section
- **F3** Fullscript claims 125,000 providers and 10M+ patients, about 80 patients per provider (vendor claim). — S08.1 (A for the claim)
- **F4** [LB] Supplements are "often an ongoing protocol", and refills and reminders run between appointments. — S06.1 (A), §Business context; S06.2 (A), capture refills page
- **F5** [LB] 78% of the proxy practitioners are in Eastern- or Central-time states (R12 I1, from BLS May 2025). — S12.1 (A)

## Inferences

- **I1** from F1 + F2 + F3: Formula: 5,000 practitioners × 22% adopting = 1,100 practitioners; × 2 provider-side users each (provider + one staff member, A-1) = 2,200 provider-side users; 1,100 × 80 ordering patients = 88,000 paying patients a year. Assumptions: A-1 one staff user per practitioner; A-2 Fullscript's patients-per-provider ratio holds. Range: 1,000 – 2,900 provider-side users and 20,000 – 230,000 patients, base 2,200 and 88,000 (low = 10% adopting and 40 patients; high = 29% adopting and 160 patients).
- **I2** from F4 + I1: Formula: 88,000 patients × 12 orders a year ÷ 365 days = 2,900 patient payments a day. Assumptions: A-3 one order a month per patient while on protocol (R06 left the true refill rate open). Range: 330 – 7,600 a day, base 2,900 (low = 6 orders a year at the low user count; high = 12 a year at the high count).
- **I3** from F5 + I1 + I2: Formula: peak requests per second = (330 providers in the peak hour × 20 actions + 580 patients in the peak hour × 10 actions) × 3 requests per action ÷ 3,600 × burst factor 3 = 31 per second. Assumptions: A-4 30% of provider-side users are active in the busiest hour (clinic hours, 78% on Eastern or Central time); A-5 20% of a day's patient payments fall in the busiest hour; A-6 20 actions per provider-hour, 10 per patient visit, 3 requests per action; A-7 burst factor 3. Range: 14 – 60 per second, base 31.
- **I4** from I1 + I2: Formula: average requests per second = (1,100 active providers a day × 100 actions + 2,900 patients × 10 actions) × 3 ÷ 86,400 = 4.8 per second. Assumptions: A-6, A-8 half of the 2,200 provider-side users are active on a given day, 100 actions each. Range: 2 – 8 per second, base 4.8.
- **I5** from I3: Formula: peak concurrent users = 330 providers × 20 minutes ÷ 60 + 580 patients × 5 minutes ÷ 60 = 160. Assumptions: A-4, A-5, A-9 a provider session lasts 20 minutes, a patient's 5. Range: 70 – 270, base 160.
- **I6** from F5: the busiest hours follow the US Eastern and Central clinic day (about 12:00–23:00 UTC in daylight time); the quietest common window is about 05:00–11:00 UTC (R12 I2). Fairly sure of the shape, not the exact hours (assumption A-10: clinics open 8am to 6pm local time, Monday to Friday).
- **I7** from F4: behaviours that stress correctness more than capacity: a patient double-clicking pay or retrying after a timeout (double charge risk); monthly refills bunching on one day of the month; a provider building many orders at the end of a clinic day; a price changed while a patient has the order open. Fairly sure these occur; how often is unknown.

## Gaps

- ⚠ Real usage hours and actions per user — why: no Tier-A source; A-4 to A-10 are stated assumptions — would close it: ask the partner for Cerbo's traffic by hour, or measure after launch
- ⚠ The true refill rate — why: still open from R06 — would close it: ask the partner for refill share on Cerbo's Fullscript storefront

## Handoffs

- design-hld: is sizing for about 60 requests per second at peak (the high end of I3) and 270 concurrent users enough headroom for the first year? — rests on I3, I5
- design-hld: should duplicate payment attempts and retries be handled as a correctness requirement, given I7? — rests on I7
- design-hld: should the maintenance window sit at about 05:00–11:00 UTC? — rests on I6
- write-prd: should "a patient is never charged twice for one order" be a must-never-happen requirement? — rests on I7
