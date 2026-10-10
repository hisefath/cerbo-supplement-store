---
id: R15
question: "What is the leanest operations team (finance, SRE, analyst and so on), and how should their access be separated?"
asked_in: human message 2026-10-09 (design-hld Q3 reply; route approved 22:07 CDT)
unblocks: "An operations-roles story in the PRD (write-prd Revise), its sign-in rules, and the HLD's trust boundaries"
answered_when: "A regulation or standard states how workforce access must be scoped and which duties must be separated"
status: answered
confidence: medium
supersedes: none
date: 2026-10-09
budget: 4/15 tool calls
researched_by: Claude Code, claude-opus-5-5
---

# R15 Lean operations roles and separation of duties

## Answer

HIPAA's minimum-necessary rule says to name each class of staff, the categories of health information each needs,
and to limit them to that; its security rule requires regular review of system activity and procedures to grant,
change and end access. NIST's separation-of-duties control adds that the people who administer access should not
also administer the audit, and least privilege says each person gets only what their tasks need, with privileged
use logged and reviewed. Confidence: medium, because the HIPAA rules are Tier A but the NIST text was read through a
Tier-B mirror. (S15.1, S15.2, S15.3, S15.4)

## Takeaway

Give each ops person only the data their job needs, never let the person who hands out access also be the one who
checks the access log, and log every privileged action.

## Findings

- **F1** [LB] Covered entities must identify the persons or classes of workforce who need access, the categories of health information each needs, and make reasonable efforts to limit them to it. — S15.1 (A), 164.514(d)(2)
- **F2** [LB] Procedures to regularly review records of information system activity are Required. — S15.2 (A), 164.308(a)(1)(ii)(D)
- **F3** [LB] Access authorization, access establishment and modification, and termination procedures are Addressable specifications. — S15.2 (A), 164.308(a)(3), (a)(4)
- **F4** NIST AC-5: identify and document duties, define access to support separation, and ensure security personnel who administer access control do not also administer audit functions. — S15.3 (B), control text and discussion
- **F5** NIST AC-6: least privilege, with enhancements to review user privileges and log the use of privileged functions. — S15.4 (B), control text and enhancements

## Inferences

- **I1** from F1 + PRD NFR-012: since platform staff see no patient identity at all, the ops roles differ only in which business data and which actions they get. Fairly sure.
- **I2** from F4 + F5: a lean team of four (finance lead, operations specialist, SRE, data analyst) can separate duties if the SRE grants and removes roles, a different role reviews the access log, and only finance can run and export financial reports. Moderately sure; NIST read through a mirror.
- **I3** from F2 + F3: every grant, change and removal of a role, and every privileged action, needs a log entry someone other than the actor reviews. Fairly sure.

## Gaps

- ⚠ The official NIST SP 800-53 Rev 5 text — why: read through csf.tools (Tier B) — would close it: read AC-5 and AC-6 on csrc.nist.gov
- ⚠ Cerbo's own ops team shape — why: no source — would close it: ask the partner

## Handoffs

- write-prd: should the operations side have four roles (finance lead, operations specialist, SRE, data analyst), each limited to the data and actions its job needs? — rests on F1, F5, I2
- write-prd: who reviews the log of role grants and removals, given the SRE grants them? — rests on F4, I3
- design-hld: where is the trust boundary between operations roles, and how is privileged use logged? — rests on F2, F5, I3
