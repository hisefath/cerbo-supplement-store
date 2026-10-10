---
id: R03
question: "What data could measure the North Star and the migration share: do the outside sellers or the existing integrations expose order volume per practice that could form a baseline?"
asked_in: specs/M1-in-ehr-supplement-orders/brief.md#research-questions
unblocks: "whether NS-01 and SM-01 are measurable; PRD success criteria"
answered_when: "an integration or seller doc states what order data it exposes"
status: partial
confidence: medium
supersedes: none
date: 2026-10-09
budget: 6/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R03 Data that could measure the North Star and the in-house share

## Answer

NS-01 (in-house GMV per practice per period) needs only Cerbo's own records of paid orders, so it is measurable if every paid order stores amount, practice and payment time. For SM-01's baseline, Fullscript lets an integrated clinic list its completed orders (`GET /api/clinic/orders`, filterable by date) and pushes an `order.placed` webhook carrying clinic, patient, treatment plans and line items with quantities; the documentation read shows no dollar totals, so a unit or order-count baseline per practice is supported, while a dollar baseline is unconfirmed. Confidence: medium, because the order endpoints are Tier A but their money fields are not documented in the pages read. (S03.1, S03.2, S03.3, S03.4)

## Takeaway

We can count how many supplement orders a practice still sends to Fullscript, so "share moved in-house" is measurable by order count; whether it is measurable in dollars is still open.

## Findings

- **F1** Fullscript's REST API offers treatment-plan endpoints, patient history and "Report on patient orders" to integrators, plus webhooks. — S03.1 (A), page body
- **F2** [LB] Fullscript's developer index lists an "Order placed" webhook ("triggered when a patient places an order via Fullscript.com") and an Orders technical reference. — S03.2 (A), entries "Order placed", "Orders"
- **F3** [LB] The `order.placed` example payload contains event `id`, `type`, `created_at`, `clinic_id`, and data with order `id`, `order_number`, `completed_at`, `treatment_plan_ids`, `patient_id`, and `line_items` (each with `variant_id`, `quantity`, `type`); no total, subtotal or practitioner id appears. — S03.3 (A), example payload
- **F4** [LB] The Orders resource "contains a record of all completed or refunded orders that a patient has made"; `GET /api/clinic/orders` lists all orders for the clinic, filterable by `patient_id`, `treatment_plan_id`, `completed_at` (date ranges), `type`, `order_number`; response fields are not documented on that page. — S03.4 (A), whole page

## Inferences

- **I1** from F2 + F3 + F4: an integrated practice's outside-seller order count and unit volume per period can be read (list by `completed_at`, or count `order.placed` events per `clinic_id`), so SM-01 is measurable as a count share: in-house orders ÷ (in-house + Fullscript orders). Highly likely.
- **I2** from F3 + F4: a dollar-based share needs order totals, which the documentation read does not show. Unverified.
- **I3** from the brief's NS-01 definition: in-house GMV needs no outside data; it is computable from the slice's own paid orders. Highly likely (by definition).

## Gaps

- ⚠ Do Fullscript order responses include totals (dollar value)? — why: the Orders page documents no response schema — would close it: the 200 response schema in Fullscript's full API reference, or a sandbox call
- ⚠ Does WholeScripts expose order data to integrated EHRs? — why: not researched within budget — would close it: WholeScripts' own integration or API docs
- ⚠ Can the slice itself read Fullscript data? — why: out of scope (real integrations are stubbed per the assignment) — would close it: a design decision, not research

## Handoffs

- write-prd: Should SM-01 (share moved in-house) be defined as an order-count share, since dollar totals for outside orders are unconfirmed? — rests on F3, F4, I1, I2
- write-prd: Must every paid order record amount, practice and payment time so NS-01 is computable from day one? — rests on I3
- design-hld: Should the design leave a seam for importing outside-seller order counts per practice (e.g. from an order-placed event) without building the integration now? — rests on F2, F3
