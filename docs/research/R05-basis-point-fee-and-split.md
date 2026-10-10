---
id: R05
question: "How do marketplace payment platforms compute and round a basis-point platform fee and split funds between platform and seller?"
asked_in: specs/M1-in-ehr-supplement-orders/brief.md#research-questions
unblocks: "money rules: fee base, rounding, settlement model"
answered_when: "a payment provider's own docs state it"
status: partial
confidence: medium
supersedes: none
date: 2026-10-09
budget: 6/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R05 Basis-point fee and fund split on payment platforms

## Answer

On Stripe Connect, the platform charges the full amount, takes its fee as a whole number of cents it computes itself (`application_fee_amount`) or by keeping the remainder of a fixed transfer (`transfer_data[amount]`), and pays the card-processing fee out of its own balance. Stripe documents rounding only for its own processing fee (nearest cent, so 0.025 becomes 0.03); for a platform-computed fee such as 75 bps, the rounding rule is the platform's own choice. Confidence: medium, because the fund flow is Tier A, but no Tier-A source states the rounding for a platform's percentage fee. (S05.1, S05.2, S05.3)

## Takeaway

The payment processor moves the money, but the business decides how its 0.75% fee is rounded to a cent, so we must pick and document that rule ourselves.

## Findings

- **F1** [LB] With destination charges the platform creates the charge, decides whether some or all funds go to the seller's account, and its own balance is debited for Stripe fees, refunds and chargebacks. — S05.1 (A), intro list
- **F2** [LB] With `application_fee_amount`, the full charge is transferred to the seller and the application fee (capped at the charge amount, same currency as the charge) is transferred back to the platform; the platform then pays the Stripe fee. — S05.1 (A), "Collect fees → application_fee_amount"
- **F3** [LB] Worked example: a 10.00 USD charge with a 1.23 USD application fee; Stripe fees of 0.59 USD come out of the platform's balance, leaving 0.64 USD to the platform. — S05.1 (A), "Flow of funds with destination charges"
- **F4** [LB] Alternatively `transfer_data[amount]` names the integer amount sent to the seller; the platform keeps the rest and pays Stripe fees on the charge separately. — S05.1 (A), "transfer_data[amount]"
- **F5** A percentage fee on subscriptions (`application_fee_percent`) must be "between 0 and 100, with at most two decimal places"; Stripe's example computes it on the final invoice amount after discounts. — S05.2 (A), "Collect fees on subscriptions", "Calculating application fee percent"
- **F6** [LB] Stripe rounds its own processing fee to the nearest cent: 0.025 rounds up to 0.03, 0.024 rounds down to 0.02. — S05.3 (A), whole page
- **F7** Refunds: by default the platform keeps the application fee; `refund_application_fee=true` returns it, proportionally on a partial refund, and requires reversing the transfer. — S05.1 (A), "Refund application fees"

## Inferences

- **I1** from F2 + F4 + F6: a processor treats the platform fee as an integer amount the platform supplies, so the rounding of 75 bps × order total is a business rule we define, not one a processor imposes. Highly likely.
- **I2** from F1 + F3: in a destination-charge model the platform also bears card-processing fees, which the assignment's split (cost, provider margin, 75 bps) does not mention. Likely; out of scope per the assignment's payments stub, but it changes real-world margins.
- **I3** from F6: if the business wants to mirror the processor's convention, half-cent amounts round up. Moderately sure (one example, not a stated rule).

## Gaps

- ⚠ How do platforms round a percentage platform fee (half-up, half-even, floor), and per order or per line? — why: no Tier-A source found within 6 calls; Stripe documents only its own fee — would close it: a payment provider doc that states its percent-fee rounding (e.g. Adyen or PayPal marketplace docs), or option: run anthropic-skills:deep-research for this question
- ⚠ Who should bear card-processing fees in Cerbo's model? — why: not in the assignment; a business decision — would close it: ask the partner

## Handoffs

- write-prd: Which rounding rule should the 75 bps fee use (half-up to the cent, the processor's own convention, or another), and is it computed once per order on the total? — rests on F6, I1, I3
- write-prd: Does the provider or the platform bear the 75 bps fee, given the patient pays the platform the full order amount? — rests on F1, F2
- design-hld: Which money flow does the design model: platform charges the full amount and pays out the provider later (destination-charge style), with refunds able to return the fee? — rests on F1, F2, F4, F7
