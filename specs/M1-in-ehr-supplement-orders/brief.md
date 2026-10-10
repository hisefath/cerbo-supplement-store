---
milestone: M1
slug: in-ehr-supplement-orders
artifact: brief
written_by: sharpen-brief (software-factory-kit 0.1)
written_at: 2026-10-09 17:28 CDT (UTC-0500)
assignment: "Cerbo · ECommerce Supplement Store, project brief Version 1 (last updated 8/7/2026), Gauntlet portal, held by the human" and "Cerbo company info panel, Gauntlet portal, held by the human"
track_recommended: Full
track_decided_in: "G0 row in .handoff/TRACKER.md ## Approvals; this brief holds only the recommendation"
problem_allowlist: Cerbo
gate: G0
---

# M1 brief: in-EHR supplement orders for Cerbo

## Ask

> Rebuild, from a clean start and through every gate of the software factory, a small working slice in which a provider orders supplements for a patient, the patient pays the platform directly, and every cent of the split is recorded, so that Cerbo's team is impressed by the judgment behind it.

The human's original words: "what ever is in the cerbo repo right now, we should start from scratch on a new branch, and follow the new ai workflow from the start" (D18) · "i want a clean start, and to work through the new ai workflow end to end" (G-init) · "the whole idea of these hiring partner projects is to impress them specifically, through the project work as a medium" (2026-10-09 chat) · on the earlier attempt in `main`: "we did the project in a one shot manner before, because ai is so powerful, and wanted to see if it would work, but then scratched that and started again with a full auditable work flow" (2026-10-09, D22)

## Problem

- (paraphrase, U-01) Providers who recommend supplements as part of a treatment plan place the order on the patient's behalf with an outside seller, pay for it up front, and later collect repayment from the patient through some other channel. (project brief, §PRD)
- (paraphrase, U-01) Every step causes friction: the provider fronts money and chases repayment, the patient's experience is cut off from their care, and none of it shows up in the clinical or financial record. (project brief, §PRD)
- (paraphrase, U-01) Supplements are usually a recurring part of a protocol, so the clumsy flow suppresses volume, repayments go missing or arrive late, and all margin and fees go to an outside party. (project brief, §Business context)

**Restated, no solution or tech words:** functional-medicine providers who prescribe supplement protocols act as unpaid middlemen today: they buy for their patients, wait to be repaid, and lose track of it, while patients buy outside the place where their care lives and Cerbo earns nothing on spending its own users already do every day.

- **Who has it:** providers (they front money and chase repayment), patients (a disjointed buying step), Cerbo (revenue that leaks to outside sellers)
- **What they do today instead:** order through an outside supplement seller, pay at checkout, collect from the patient later by some other means
- **Cost of doing nothing:** provider cash tied up and repayments missed or late; patients drop protocols; Cerbo's 75 bps on volume that already exists goes uncaptured (see REQ-09)

## Job stories

| ID | When… | I want… | so I can… | Who | Source |
|---|---|---|---|---|---|
| JS-01 | I decide a patient needs a supplement protocol | to put the order in front of them at the price I choose without paying for it myself | stop fronting money and chasing repayment | provider | REQ-01, REQ-02 |
| JS-02 | my provider recommends supplements for me | to see what I owe and pay once | follow my treatment without a separate shopping trip and repayment | patient | REQ-03 |
| JS-03 | a patient has paid | to see exactly where every cent went | trust the books and the provider's payout | Cerbo finance | REQ-04, REQ-05 |
| JS-04 | I review my practice's supplement business | to see what sold and keep stock right | plan protocols without surprises | provider | REQ-06 |
| JS-05 | the business asks whether this was worth building | to see how much order volume moved in-house and what it earned | decide whether to invest further | Cerbo leadership | REQ-09 |

## Hiring partner

Who we are building for and what should impress them (`docs/METRICS.md` §5). Facts with a source; unknowns go to
Research questions.

| Aspect | What we know | Source | What the project should show them |
|---|---|---|---|
| Who they are | EHR for functional-medicine providers (root causes, richer intake, longitudinal data, protocol-driven care); replaces a stack of disjointed tools with one configurable product; 51–200 employees, engineering team 26–50; healthcare | company info panel, §About and header | a slice that fits inside their product's workflow, not a standalone shop |
| Their stack | TypeScript/JavaScript and "Other"; MySQL and Postgres; Vue; REST; AWS, CI/CD, Docker. ⚠ what is "Other", and which parts are legacy vs new? (→ R01) | company info panel, §Technical stack | design choices their engineers can read and extend; the stack is decided at M3 design with this evidence |
| How they work | mixed greenfield and legacy code; primary focus rapid feature delivery and iteration; async/remote-first 5/5, high autonomy 5/5, ambiguous problem solving 4/5, cross-functional 3/5, customer-facing 1/5 | company info panel, §Engineering environment | autonomous, well-documented decisions made under ambiguity, delivered fast in small milestones |
| How they hire | 1–2 interview rounds; coding assessment = paired coding exercise; primary languages "Other" and TypeScript/JavaScript | company info panel, §Interview process | that the human can explain and extend this code live with a partner |
| What they grade | (paraphrase, U-01) technical judgment (data model, clean seams, correct money handling, pragmatic scoping), effective use of AI and knowing when to override it, clear communication of decisions and honest limits | project brief, §Performance benchmarks | every decision journalled with its trade-off; AI course corrections logged candidly |
| Their existing supplement integrations | ⚠ which outside sellers do they integrate with today, and how? (→ R02) | — | that we understand the workflow we are replacing |

## Value and metrics

Candidates for `write-prd`, not decisions (`docs/METRICS.md` §1-3). Targets are set in the PRD.

- **Underlying problem in the business's terms:** (paraphrase, U-01) revenue that already exists leaks out of Cerbo's ecosystem; the partner names its headline metric as GMV processed in-house plus the 75 bps earned on it, and its leading indicator as volume migrated off outside marketplaces, and asks that the slice make those measurable later. (project brief, §Impact metrics)

| ID | Candidate metric | Role | Actionable or vanity ("if bad, what would we fix?") | Leading or lagging | Data that would measure it |
|---|---|---|---|---|---|
| NS-01 | GMV processed in-house per period, per practice (patient payments settled through Cerbo) and the 75 bps earned on it | North Star (the partner's own headline) | actionable only when split by practice and period: a practice with low in-house GMV tells us whom to ask why; a single running total would be vanity | lagging | the slice's own paid-order records, if every paid order carries amount, practice and time |
| SM-01 | share of a practice's supplement volume placed in-house rather than through outside sellers | explains NS-01 (the partner's leading indicator) | actionable: a low share points at the providers still using outside sellers | leading | ⚠ needs a baseline of outside-seller volume (→ R03) |
| SM-02 | share of sent orders the patient pays, and time from send to payment | explains NS-01 | actionable: a low share or long delay points at the patient payment step | leading | the slice's order and payment records |
| SM-03 | paid orders whose recorded split reconciles to the cent with zero discrepancies | guards NS-01 (GMV is worthless if the money is wrong) | actionable: any discrepancy names the order and the broken rule | lagging | the slice's audit check over its own records |

Vanity traps considered and rejected: total orders since launch (only goes up; no denominator); number of supplements in the catalog (says nothing about use); total fee dollars without the GMV beside them (hides whether volume or rate moved).

## Appetite and deadlines

- **Now:** 2026-10-09 17:28 CDT (UTC-0500)
- **Appetite:** not timeboxed: the human waived the deadline ("dont worry about the deadline", 2026-10-09); the goal is practising the full workflow. The assignment's own guidance is 1-2 days (project brief, §Time constraints), so scope still stays small: cut at each milestone gate rather than extend.
- **Timebox:** start 2026-10-08 22:33 CDT (restart) → no fixed end: the human waived the deadline ("dont worry about the deadline", 2026-10-09)

| Checkpoint | As written in the source | Local time (converted by date) | Source |
|---|---|---|---|
| Assigned | "Assigned Oct 5, 2026, 9:46 AM" | not converted: the human waived it ("dont worry about this", 2026-10-09) | portal project list |
| Time constraint | "1-2 days" | not a date | project brief, §Time constraints |
| Submission deadline | none found on either portal page | waived by the human: "dont worry about the deadline" (2026-10-09) | — |

## Spec is law

Sources read in full: project brief Version 1 (12 sections: PRD, Business context, Impact metrics, Functional requirements and out of scope, Performance benchmarks, Time constraints, Technical contact, Technology, AI usage documentation, Required deliverables, Attachments/Links, Submit); company info panel (5 sections: header, About, Technical stack, Engineering environment, Interview process).
Requirements extracted: 24. Second pass: no new rows.

| ID | Requirement (verbatim; uncleared source: `(paraphrase, U-##) <text>`) | Source | Deliverable (assignment's exact filename, or observable proof) | Owning phase / skill | Due | Status |
|---|---|---|---|---|---|---|
| REQ-01 | (paraphrase, U-01) build a working vertical slice: a provider assembles a supplement order for a patient, the patient pays, the system computes and records the money split | project brief, §PRD | the deployed slice runs this journey end to end in the demo | 9 implement-task (planned by 3 write-prd) | — (deadline waived) | mapped |
| REQ-02 | (paraphrase, U-01) FR1: the provider selects one or more supplements and sets the patient-facing price or margin per item | §Functional requirements 1 | observable in the slice | 3 write-prd → 9 implement-task | — (deadline waived) | mapped |
| REQ-03 | (paraphrase, U-01) FR2: the patient pays for the order; a stubbed payment step is fine | §Functional requirements 2 | observable in the slice | 3 write-prd → 9 implement-task | — (deadline waived) | mapped |
| REQ-04 | (paraphrase, U-01) FR3: compute and persist the split: item cost, provider margin, 75 bps platform fee | §Functional requirements 3 | observable in the slice | 3 write-prd → 6 design-lld → 9 implement-task | — (deadline waived) | mapped |
| REQ-05 | (paraphrase, U-01) FR4: the split is correct and auditable; a paid order shows where every cent went | §Functional requirements 4 | observable in the slice | 3 write-prd → 7 define-acceptance | — (deadline waived) | mapped |
| REQ-06 | (paraphrase, U-01) FR5: a provider dashboard shows what has sold and updates inventory | §Functional requirements 5 | observable in the slice | 3 write-prd → 4 map-ux-flows | — (deadline waived) | mapped |
| REQ-07 | (paraphrase, U-01) stub or fake anything external (payments, auth, email, shipping), keep the seams clean and say what is stubbed | §PRD | a stated list of stubs in the docs, and seams in the design | 5 design-hld + 14 garden-docs | — (deadline waived) | mapped |
| REQ-08 | (paraphrase, U-01) out of scope: real payments, auth and shipping integrations; catalog browsing, search, imagery, styling (a seeded list is fine); compliance, tax, shipping cost; multi-state and international (US only); inventory beyond what is needed | §Functional requirements, out of scope | non-goals in the PRD | 3 write-prd | — | mapped |
| REQ-09 | (paraphrase, U-01) make the headline metric (GMV in-house and the 75 bps) and the leading indicator (volume migrated off outside marketplaces) measurable later | §Impact metrics | success criteria in the PRD; data the slice records | 3 write-prd (metric tree) | — | mapped |
| REQ-10 | (paraphrase, U-01) the platform holds the inventory, US only, compliance out of scope | §PRD | assumptions in the PRD | 3 write-prd | — | mapped |
| REQ-11 | (paraphrase, U-01) build the smallest thing that proves the problem is understood, and explain the thinking; not graded on design, breadth or test coverage for its own sake | §Functional requirements, closing | milestone cut and decision journal | 3 write-prd + X log-decision | — | mapped |
| REQ-12 | (paraphrase, U-01) graded on technical judgment (data model, seams, money handling, scoping), effective AI leverage, clear communication and honesty about limits | §Performance benchmarks | evidence in docs, journal and demo | all phases; 12 report-milestone | — | mapped |
| REQ-13 | (paraphrase, U-01) make assumptions and document why | §Technical contact | assumptions in the PRD, D-rows in the journal | 3 write-prd + X log-decision | — | mapped |
| REQ-14 | (paraphrase, U-01) no restrictions on technology; nothing off-limits | §Technology | no stack mandate (constraint: none) | 5 design-hld | — | mapped |
| REQ-15 | (paraphrase, U-01) AI usage documentation: key decisions and trade-offs; what was cut and what is next; tools used, what worked, what didn't, and how the work was steered when AI misled | §AI usage documentation | `docs/AI_USAGE.md` (Q2), opening with an index in the assignment's three-ask order linking to the evidence (Q3) | supervisor keeps it as work happens, dated entries in one fixed format; each milestone's 12 report-milestone adds an "AI usage this milestone" section (Q2) | each milestone | mapped |
| REQ-16 | "Video Demo" (also listed as "Demo Video") | §Required deliverables | a recorded video, link in README | 17 write-demo-script + 18 record-demo + U-03 | — (deadline waived) | mapped |
| REQ-17 | "Github Repository" | §Required deliverables | public repo URL loads for someone signed out | U-04 (push, visibility) | — (deadline waived) | mapped |
| REQ-18 | "Deployed Application Url" | §Required deliverables | public URL loads and the journey works | 13 ship-milestone + U-05 | — (deadline waived) | mapped |
| REQ-19 | "Documentation" | §Required deliverables | `README.md` + `docs/README.md` index | 14 garden-docs | — (deadline waived) | mapped |
| REQ-20 | "Source Code" | §Required deliverables | the repository | 9 implement-task | — (deadline waived) | mapped |
| REQ-21 | "Technical Documentation" | §Required deliverables | `docs/architecture/hld.md`, `lld.md`, diagrams, API contract | 5 design-hld + 6 design-lld + 6b draw-diagrams | — (deadline waived) | mapped |
| REQ-22 | "AI Usage Log" | §Required deliverables | `docs/AI_USAGE.md` (same file as REQ-15) | see REQ-15 | each milestone | mapped |
| REQ-23 | (paraphrase, U-01) submit from the portal page; the submission is tied to this project version | §Submit this project | submission made in the portal | U-02 | — (deadline waived) | mapped |
| REQ-24 | "1-2 days" | §Time constraints | appetite line above | G0 | — | mapped (deadline waived by the human) |

Conflicts between sources: none.

## User-owned steps

Things only the human can do. Earliest-blocking first.

| ID | Step | Why only the human | Due | Blocks |
|---|---|---|---|---|
| U-01 | Quote clearance: answered (Q3) — short quotes allowed in repo docs; no full copy committed (the full text stays in the human's private folder) | partner material; the repo is public | done | — |
| U-05 | Approve each deploy and any spend (Railway hosting already runs on the human's account) | money and public action | each ship-milestone (G-live) | REQ-18 |
| U-04 | Approve every push; make the GitLab repo public (the agent's token cannot) | account authority; visibility | first milestone merge | REQ-17 |
| U-03 | Record or approve the demo video and upload it | their face/voice and their account | before submission | REQ-16 |
| U-02 | Submit in the Gauntlet portal | their account | when the human chooses (deadline waived) | REQ-23 |

## Track

**Recommended: Full**, because WORKFLOW.md §3: "Full: new product, graded project, or capstone"; this is a graded partner project, restarted clean (D18).
Greenfield or brownfield: greenfield (only the factory scaffold is tracked; v1 lives in `main@778e788`).
Track announced by the supervisor: Full (`.handoff/TRACKER.md` Log, 2026-10-08 22:33 CDT).
Existing PRD: none.

| Option | What you get | What it costs, in plain words | Fits this ask? |
|---|---|---|---|
| Full | Every phase from this brief to ship: PRD, UX, HLD, LLD, diagrams, acceptance, tasks, gates | the most time: many gates and documents before code, well past the assignment's 1-2 days | yes: the stated goal is to practise the whole workflow and impress the partner with judgment |
| Standard | Starts from an existing PRD: design delta, acceptance, tasks, build | faster, but there is no v2 PRD to start from | no: nothing to delta against |
| Fix | One failing repro and the smallest fix, ≤2 files, no API/data/auth/payment change | minutes | no: this touches payments and the data model |
| Do nothing | No build; v1 stays the submission | zero time; no practice, and v1's ungated decisions stand | no: contradicts D18 |

## Research questions

For `gather-evidence`. Questions only: no answers, no recommended solutions.

| ID | Question | Decision it unblocks | Answered when | From |
|---|---|---|---|---|
| R01 | What is Cerbo's production stack in practice: what is the portal's "Other" language, and which parts are legacy vs new? | the stack choice at M3 design | Cerbo's own job posts, engineering pages or the portal state it, dated | Hiring partner table; conflict line |
| R02 | Who is Cerbo: product, customers, how practices use it day to day, and which outside supplement sellers it integrates with today and how those flows work? | job stories, the workflow we replace, the demo story | Cerbo's site/docs and the integration partners' own docs describe it | Hiring partner table |
| R03 | What data could measure the North Star and the migration share: do the outside sellers or the existing integrations expose order volume per practice that could form a baseline? | whether NS-01 and SM-01 are measurable; PRD success criteria | an integration or seller doc states what order data it exposes | Value and metrics, SM-01 |
| R04 | How do existing practitioner supplement dispensaries set the patient price and the practitioner's margin (markups, caps, discounts), and who pays their fees? | FR1 price-or-margin rules; who bears the 75 bps | a dispensary's own docs or terms state it | REQ-02, REQ-04 |
| R05 | How do marketplace payment platforms compute and round a basis-point platform fee and split funds between platform and seller? | money rules: fee base, rounding, settlement model | a payment provider's own docs state it | REQ-04, REQ-05 |
| R06 | How common are recurring protocols and refills in functional-medicine supplement ordering? | scope: one-off orders now vs recurring later (non-goals) | an industry or dispensary source with data | Problem (recurring protocols) |
| R07 | What do Cerbo's engineers say they value and test in interviews (paired coding in TypeScript/JavaScript, rapid delivery, legacy code)? | what the build, docs and demo emphasise | Cerbo job posts or engineering content state it | Hiring partner table |

## Parking lot

Solution ideas heard during discovery, kept verbatim and not evaluated. Design phases may pick them up.

| ID | Idea (verbatim) | Raised by | When | Need behind it |
|---|---|---|---|---|
| P-01 | "later we'll build a ci pipeline and tests when we get to that" | human | 2026-10-09 | automated proof the slice stays correct (REQ-05, REQ-12) |
| P-02 | withdrawn 2026-10-09 by the human ("whatevers in main branch, just dont worry about it", D22): the earlier one-shot build is not an input to v2 | agent (v1 build) | 2026-10-05 | none |

## Interview log

One question at a time, each with a recommendation; answers verbatim, with secret or personal values replaced by
`[redacted: <what it was>]`. Pass 1, 2026-10-09.

| Q# | Question | Recommended (and why) | Answer (verbatim) | Landed in |
|---|---|---|---|---|
| Q1 | What do you most want Cerbo's team to remember about you after the demo? | judgment on money integrity, candid AI leverage, and that you'd be productive on their team fast, because those are the assignment's grading lines and the portal's working-style signals | "yes i take your recommendations" | Hiring partner (What the project should show them), Value and metrics |
| Q2 | Where should the AI usage log live, and who keeps it? | `docs/AI_USAGE.md`, kept by the supervisor as work happens plus a section in each milestone report, because no phase skill owns it and a log written at the end loses the details | "yes for option 1" (the human also asked to see how other Cerbo projects did it) | REQ-15, REQ-22 |
| Q3 | May the brief quote the Cerbo portal pages word for word, and may a copy be committed? | short quotes yes, no full copy, because every other Cerbo repo already quotes it while the full document is the partner's | "yes, and i like the clever indexing idea." | U-01, REQ-15 |
