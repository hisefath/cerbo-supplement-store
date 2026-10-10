---
id: R01
question: "What is Cerbo's production stack in practice: what is the portal's \"Other\" language, and which parts are legacy vs new?"
asked_in: specs/M1-in-ehr-supplement-orders/brief.md#research-questions
unblocks: "the stack choice at M3 design"
answered_when: "Cerbo's own job posts, engineering pages or the portal state it, dated"
status: partial
confidence: medium
supersedes: none
date: 2026-10-09
budget: 5/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R01 Cerbo's stack in practice

## Answer

Cerbo's own sources name several stacks: its portal panel lists TypeScript/JavaScript plus "Other", Vue, MySQL and Postgres, REST, AWS, CI/CD and Docker, while its 2026 job posts name PHP with Laravel (two posts) and Java with Spring (one post), with Docker and Kubernetes. The company now runs two product lines, Cerbo and OptiMantra, which may explain the different stacks; no source read says which stack is legacy or new. Confidence: medium, because every claim is from Cerbo's own material (Tier A), but none states how the stacks divide. (S01.1, S01.2, S01.3, S01.4)

## Takeaway

Cerbo works across several stacks: TypeScript and Vue on the front, PHP/Laravel and Java/Spring in back-end job posts, on MySQL or Postgres in the cloud, so no single language is "their" stack.

## Findings

- **F1** [LB] The portal panel lists languages TypeScript/JavaScript and "Other"; data stores MySQL and Postgres; front end Vue; REST; infrastructure AWS, CI/CD, Docker; coverage "Mixed greenfield and legacy". — S01.1 (A), §Technical stack, §Engineering environment
- **F2** [LB] Agentic Software Engineer 1 (posted 2026-06-17): "Your work is primarily back-end in PHP and Laravel, with room to grow across the stack." — S01.2 (A), role description
- **F3** [LB] Software Engineer (posted 2026-07-01): "full-stack applications using Java and Spring"; tools Git, Docker, Kubernetes; cloud "AWS, Azure, or Google Cloud". — S01.3 (A), role description
- **F4** The company is listed as "Cerbo · OptiMantra": Cerbo "architected for clinical depth", OptiMantra "structured for scale". — S01.3 (A), S01.4 (A), company header
- **F5** [LB] Full Stack Engineer (posted 2026-06-09): "Develop and maintain full-stack applications using PHP and Laravel"; Git, Docker and Kubernetes. — S01.4 (A), role description
- **F6** No job post read names a front-end framework or a database. — S01.2 (A), S01.3 (A), S01.4 (A) (absence)

## Inferences

- **I1** from F1 + F2 + F5: the portal's "Other" very likely includes PHP, since two of three back-end posts name PHP/Laravel and the portal lists no other back-end language. Likely, not stated.
- **I2** from F3 + F4: Java/Spring may belong to the OptiMantra product line rather than Cerbo's EHR. Unverified guess; no source says so.
- **I3** from F1 + F6: the front end most likely to match Cerbo's own is TypeScript with Vue; Postgres and MySQL are both in use. Likely.

## Gaps

- ⚠ Which stack serves which product, and which is legacy vs new? — why: no source read states it — would close it: Cerbo engineering blog or talks, or ask the partner
- ⚠ Is "Other" exactly PHP, or PHP and Java? — why: inferred only — would close it: ask the partner

## Handoffs

- design-hld: Given Cerbo's front end is TypeScript/Vue, its back-end posts name PHP/Laravel and Java/Spring, and the assignment mandates no stack (brief REQ-14), which stack best serves a slice their engineers can read, and how is the choice explained against D22? — rests on F1, F2, F3, F5, I1, I3
