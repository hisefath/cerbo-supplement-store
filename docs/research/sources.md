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
