---
id: R02
question: "Who is Cerbo: product, customers, how practices use it day to day, and which outside supplement sellers it integrates with today and how those flows work?"
asked_in: specs/M1-in-ehr-supplement-orders/brief.md#research-questions
unblocks: "job stories, the workflow we replace, the demo story"
answered_when: "Cerbo's site/docs and the integration partners' own docs describe it"
status: answered
confidence: high
supersedes: none
date: 2026-10-09
budget: 4/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R02 Cerbo, its practices, and today's supplement integrations

## Answer

Cerbo is an all-in-one EHR for cash-based practices (functional and integrative medicine, direct primary care, IV therapy and hormone therapy, med spas) used by over 5,000 practitioners, with charts, a patient portal, practice management and in-house inventory for supplements they sell themselves. Today it integrates with Fullscript (two-way) and lists WholeScripts as a partner: the provider builds a supplement plan inside a Cerbo encounter, sends it to Fullscript, and Fullscript emails the patient, who completes the purchase with Fullscript; no order or payment status flows back into Cerbo. Confidence: high, because Cerbo's own site and Fullscript's own integration article state it. (S02.1, S02.2, S02.3)

## Takeaway

Cerbo providers already write supplement plans inside Cerbo, but the sale happens on Fullscript's side, so Cerbo never sees the order or the money.

## Findings

- **F1** [LB] Cerbo calls itself a "do-it-all EHR solution" that has helped more than 5,000 practitioners; practice types listed: functional and integrative medicine, direct primary care, IV & BHRT, medical spas and aesthetics, cash-based practices. — S02.1 (A), homepage
- **F2** [LB] Cerbo offers inventory management to "Manage supplements, prescriptions, and supplies you sell in-house." — S02.1 (A), homepage features
- **F3** Cerbo says practices can "integrate with online storefronts like Fullscript". — S02.1 (A), homepage
- **F4** [LB] Cerbo lists Fullscript as an Integration and WholeScripts as a Partner. — S02.2 (A), list
- **F5** [LB] Setting up the Fullscript integration needs Cerbo super-admin access; the practice authorizes the connection on a Fullscript page, then Cerbo shows its dispensary details. — S02.3 (A), "Setup"
- **F6** [LB] From a patient's encounter the provider adds a supplement, uses Fullscript's plan builder (or Cerbo's Alternate Plan database routed to Fullscript), reviews and sends; the plan then appears in Cerbo under Plan Rx/Orders. — S02.3 (A), "Building and sending"
- **F7** [LB] "The patient will receive an email from Fullscript with the plan and instructions to access it." — S02.3 (A), "Building and sending"
- **F8** The integration is "bidirectional": plans and final lab results come back into Cerbo; chart notes do not go to Fullscript; disconnecting removes matches and order history. — S02.3 (A), "Data flow"
- **F9** [LB] The article describes no syncing of order status or purchase data back to Cerbo. — S02.3 (A), whole page (absence)

## Inferences

- **I1** from F6 + F7 + F9: in today's Fullscript flow the patient buys from Fullscript, not from Cerbo, and Cerbo records the plan but not the sale. This matches the assignment's statement that the transaction runs through systems Cerbo doesn't own. Highly likely.
- **I2** from F7 vs the assignment §PRD (provider orders and pays up front, patient repays later): the assignment describes a practitioner-pays flow that differs from Fullscript's patient-pays flow; the practitioner-pays flow may be WholeScripts or another seller. Moderately sure; the flow behind the assignment's description is unverified.
- **I3** from F2 + F6: Cerbo already has two building blocks the slice touches: supplement inventory for in-house sales, and a plan inside the encounter. Likely.

## Gaps

- ⚠ Which seller or workflow does the assignment's "provider pays up front, patient reimburses" describe? — why: Fullscript's documented flow has the patient pay Fullscript directly — would close it: WholeScripts' own docs, or ask the partner
- ⚠ How do practices use Cerbo day to day beyond the feature list (encounter flow, billing)? — why: marketing pages only within budget — would close it: Cerbo help center or a demo video

## Handoffs

- write-prd: Should the new flow start from the existing place providers already work (a supplement plan inside a patient encounter) rather than a separate store? — rests on F6, I3
- write-prd: Which current flow are we replacing in the job stories: the patient-pays Fullscript flow, the provider-pays flow the assignment describes, or both? — rests on F7, I2
- design-hld: Where do in-house sale records connect to Cerbo's existing inventory and plan/order records? — rests on F2, F6, F9
