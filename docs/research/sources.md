# Sources

Append-only log of every source read for `docs/research/`. One row per read; a source keeps its S-id forever
(reading it again appends a new row with the same S-id and the new date). Never edit, renumber or delete a row.

Tiers: **A** primary/official · **B** reputable secondary · **C** community or generated (never carries a
load-bearing claim). A load-bearing claim needs 1 Tier-A or 2 independent Tier-B sources.

<!-- Row shape: | S01.1 | <title, no pipes> | <url, or repo path + locator> | A | <YYYY-MM-DD> | R01 F1: <claim, 12 words max> | -->

| S-id | title | url | tier | date read | supports |
|---|---|---|---|---|---|
| S05.1 | Stripe Docs: Create destination charges (custom flow) | https://docs.stripe.com/connect/destination-charges.md?platform=web&ui=elements | A | 2026-10-09 | R05 F1-F4: fee flow, platform pays Stripe fees, fee refunds |
| S05.2 | Stripe Docs: Create subscriptions with Stripe Billing (Connect) | https://docs.stripe.com/connect/subscriptions | A | 2026-10-09 | R05 F5: percent fee, at most two decimals, worked example |
| S05.3 | Stripe Support: Rounding rules for Stripe fees | https://support.stripe.com/questions/rounding-rules-for-stripe-fees | A | 2026-10-09 | R05 F6: Stripe fee rounded to nearest cent; 0.025 → 0.03 |
| S04.1 | Fullscript Support: No-profit dispensaries (last modified 2026-07-17) | https://support.fullscript.com/hc/en-us/articles/360022316311-No-profit-dispensaries | A | 2026-10-09 | R04 F1: no-profit default; patients get fixed 10% off MSRP |
| S04.2 | Fullscript Support: Dispensary individual patient discounts (last modified 2026-09-21) | https://support.fullscript.com/articles/dispensary-individual-patient-discounts/ | A | 2026-10-09 | R04 F2-F3: discount up means profit down; 35% US cap |
| S04.3 | Fullscript Support: Profit dispensaries (last modified 2026-07-17) | https://support.fullscript.com/articles/profit-dispensaries | A | 2026-10-09 | R04 F4-F6: seller of record, 30-day payouts, Fullscript handles tax |
| S02.1 | Cerbo homepage | https://www.cer.bo/ | A | 2026-10-09 | R02 F1-F3: EHR for 5000+ practitioners; in-house inventory; Fullscript storefront |
| S02.2 | Cerbo: Integrations and Partners | https://www.cer.bo/resources/integrations-and-partners/ | A | 2026-10-09 | R02 F4: Fullscript integration; WholeScripts partner |
| S02.3 | Fullscript Support: Cerbo (by MD HQ) integration (last modified 2026-09-09) | https://support.fullscript.com/articles/cerbo-by-md-hq-integration | A | 2026-10-09 | R02 F5-F9: plan sent from Cerbo; patient emailed by Fullscript |
| S03.1 | Fullscript API overview | https://fullscript.com/fs-api | A | 2026-10-09 | R03 F1: REST API, patient history, report on patient orders |
| S03.2 | Fullscript developer index (llms.txt) | https://fullscript.dev/llms.txt | A | 2026-10-09 | R03 F2: order.placed webhook and Orders reference exist |
| S03.3 | Fullscript Docs: order.placed webhook | http://fullscript.dev/docs/how-to-guides/webhooks/available-webhooks/order-placed | A | 2026-10-09 | R03 F3: payload has clinic, patient, plans, line items; no totals |
| S03.4 | Fullscript Technical Reference: Orders | http://fullscript.dev/technical-reference/orders | A | 2026-10-09 | R03 F4: list clinic orders, filters; response fields not documented |
| S01.1 | Gauntlet portal: Cerbo company info panel (held privately by the human) | portal company info panel, §Technical stack, §Interview process | A | 2026-10-09 | R01 F1: TS/JS + Other, Vue, MySQL/Postgres, AWS, Docker |
| S01.2 | Cerbo job post: Agentic Software Engineer 1 (posted 2026-06-17) | https://provn.co/org/cerbo/jobs/b05c6930-5ab8-4c15-abae-ca41fa41adfe/agentic-software-engineer-1 | A | 2026-10-09 | R01 F2: back-end primarily PHP and Laravel |
| S01.3 | Cerbo job post: Software Engineer (posted 2026-07-01) | https://provn.co/org/cerbo/jobs/28f88819-4d6f-4c4d-b453-e3ee74129ab9/software-engineer | A | 2026-10-09 | R01 F3-F4: Java and Spring; Cerbo and OptiMantra product lines |
| S01.4 | Cerbo job post: Full Stack Engineer (posted 2026-06-09) | https://provn.co/org/cerbo/jobs/4f1b0ce3-e68c-4dc5-a98d-9c24de2ac9d3/full-stack-engineer | A | 2026-10-09 | R01 F5: full-stack PHP and Laravel; Docker, Kubernetes |
| S06.1 | Gauntlet portal: Cerbo project brief v1, §Business context (held privately by the human) | portal project brief, §Business context | A | 2026-10-09 | R06 F1: supplements are often an ongoing protocol |
| S06.2 | Fullscript: Treatment adherence just got easier (capture refills) | https://fullscript.com/lp/capture-refills | A | 2026-10-09 | R06 F2: reminders and refills run between appointments |
| S08.1 | Fullscript: About | https://fullscript.com/about | A | 2026-10-09 | R08 F1: claims 125,000 providers, 10M+ patients (undated) |
| S08.2 | Fullscript: Integrations | https://fullscript.com/integrations | A | 2026-10-09 | R08 F2: in-EHR ordering via Epic, athena, Cerbo, OptiMantra and more |
| S08.3 | OptiMantra blog: WholeScripts integration launch (2026-03-04) | https://www.optimantra.com/blog/simplifying-supplement-protocols-optimantra-launches-wholescripts-integration-for-providers | A | 2026-10-09 | R08 F3: protocol picked in chart, ships direct to patient |
| S08.4 | PlPRx (PharmaLink) homepage | https://plprx.com/ | A | 2026-10-09 | R08 F4: in-office Rx dispensing; 1,000+ practices; pay at point of care |
| S08.5 | Supplement Practice homepage | https://www.supplementpractice.com/ | A | 2026-10-09 | R08 F5: all-in-one functional practice tool; inventory; $100-160/mo |
| S08.6 | Emerson Ecologics: About us | https://www.emersonecologics.com/about-us | A | 2026-10-09 | R08 F6: a Fullscript company; 100,000+ practitioners on Fullscript |
| S02.1 | Cerbo homepage | https://www.cer.bo/ | A | 2026-10-09 | R09 F1: serves functional, DPC, IV/BHRT, med spa, cash-based practices |
| S09.1 | Cerbo: Who we serve, Functional and Integrative Medicine | https://www.cer.bo/who-we-serve/functional-and-integrative-medicine/ | A | 2026-10-09 | R09 F2-F3: small-to-midsize; cash, membership or direct-pay |
| S09.2 | AAFP: Direct primary care, what to know | https://www.aafp.org/practice-operations/practice-and-payment-models/direct-primary-care | A | 2026-10-09 | R09 F4: DPC fee $50-100/mo, no insurance, panel 413 |
| S09.3 | Nutrition Business Journal: Practitioner survey, building a strong help line (2017-05-10) | https://www.newhope.com/vitamins-and-supplements/practitioner-survey-building-a-strong-help-line | B | 2026-10-09 | R09 F5: 86% sell supplements; 57% of alternative 90%+ cash |
| S10.1 | Nutraceuticals World: US supplement sales hit $72.88 billion (2026-03-16, NBJ data) | https://www.nutraceuticalsworld.com/exclusives/u-s-supplement-sales-hit-72-88-billion-as-sports-nutrition-and-digital-discovery-drive-growth/ | B | 2026-10-09 | R10 F1: US sales $72.88B 2025; practitioner channel 9.3% |
| S10.2 | NBJ Editor's Take: The practitioner channel advantage (2025-06-02) | https://www.newhope.com/market-data-and-analysis/editors-take-the-practitioner-channel-advantage | B | 2026-10-09 | R10 F2: practitioner share 9.2% 2024; growth 7.8% |
| S10.3 | BLS Occupational Outlook Handbook: Chiropractors | https://www.bls.gov/ooh/healthcare/chiropractors.htm | A | 2026-10-09 | R10 F3: 61,700 chiropractor jobs 2025; 36% self-employed |
| S10.4 | Vitamin Retailer: CRN releases select findings from 2024 consumer survey (2024-11-11) | https://vitaminretailer.com/crn-releases-select-findings-from-2024-consumer-survey/ | B | 2026-10-09 | R10 F4: 75% of Americans use supplements; median $50/month |
| S08.1 | Fullscript: About | https://fullscript.com/about | A | 2026-10-09 | R10 F5: 125,000 providers, 10M+ patients (vendor claim) |
| S02.1 | Cerbo homepage | https://www.cer.bo/ | A | 2026-10-09 | R11 F1: more than 5,000 practitioners |
| S08.1 | Fullscript: About | https://fullscript.com/about | A | 2026-10-09 | R11 F2: competitor base 125,000 providers (vendor claim) |
| S09.3 | Nutrition Business Journal: Practitioner survey, building a strong help line (2017-05-10) | https://www.newhope.com/vitamins-and-supplements/practitioner-survey-building-a-strong-help-line | B | 2026-10-09 | R11 F3: 29% use patient fulfillment tools; 22% plan to |
| S12.1 | BLS OEWS public API: Chiropractors (29-1011) employment by state, May 2025, series OEUS<state FIPS>0000000000029101101 | https://api.bls.gov/publicAPI/v1/timeseries/data/ | A | 2026-10-09 | R12 F1-F2: 39,610 wage jobs; state counts, 50 states |
| S12.2 | US Census Bureau: State population totals 2020-2024 (NST-EST2024-ALLDATA) | https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/state/totals/NST-EST2024-ALLDATA.csv | A | 2026-10-09 | R12 F3: state populations, July 2024 estimates |
| S10.3 | BLS Occupational Outlook Handbook: Chiropractors | https://www.bls.gov/ooh/healthcare/chiropractors.htm | A | 2026-10-09 | R12 F4: 61,700 jobs incl. 36% self-employed |
| S06.2 | Fullscript: Treatment adherence just got easier (capture refills) | https://fullscript.com/lp/capture-refills | A | 2026-10-09 | R13 F4: refills and reminders run between appointments |
| S14.1 | Stripe Docs: Payout reconciliation report | https://docs.stripe.com/reports/payout-reconciliation | A | 2026-10-09 | R14 F1-F3: balance summary, reporting categories, summary vs itemized export |
| S14.2 | Stripe Docs: Reporting categories and types | https://docs.stripe.com/reports/reporting-categories | A | 2026-10-09 | R14 F4: application fees reported as platform_earning |
| S14.3 | Deloitte DART Roadmap: C.9 Principal-versus-agent considerations (ASU 2016-08) | https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/appendix-c-summary-issues-addressed-in/c-9-principal-versus-agent-considerations | B | 2026-10-09 | R14 F5: principal if it controls the good before transfer |
| S14.4 | KSM: Principal versus agent, which are you? (2018-08-17) | https://www.ksmcpa.com/insights/principal-versus-agent-which-are-you | B | 2026-10-09 | R14 F5-F6: principal gross, agent net; control indicators |
| S14.5 | IRS: How long should I keep records? (reviewed 2026-06-30) | https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records | A | 2026-10-09 | R14 F7: keep records 3 years generally, up to 7 |
| S15.1 | 45 CFR 164.514 (Cornell LII), minimum necessary (d)(2) | https://www.law.cornell.edu/cfr/text/45/164.514 | A | 2026-10-09 | R15 F1: identify workforce classes, their PHI categories, limit access |
| S15.2 | 45 CFR 164.308 (Cornell LII), administrative safeguards | https://www.law.cornell.edu/cfr/text/45/164.308 | A | 2026-10-09 | R15 F2-F3: activity review required; access authorization and termination |
| S15.3 | csf.tools: NIST SP 800-53 Rev 5 AC-5 Separation of Duties | https://csf.tools/reference/nist-sp-800-53/r5/ac/ac-5/ | B | 2026-10-09 | R15 F4: access administrators should not administer audit |
| S15.4 | csf.tools: NIST SP 800-53 Rev 5 AC-6 Least Privilege | https://csf.tools/reference/nist-sp-800-53/r5/ac/ac-6/ | B | 2026-10-09 | R15 F5: least privilege; review and log privileged use |
| S05.1 | Stripe Docs: Create destination charges (custom flow) | https://docs.stripe.com/connect/destination-charges.md?platform=web&ui=elements | A | 2026-10-09 | R14 F8: platform fee via application fee on each charge (see R05) |
