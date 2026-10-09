---
id: R07
question: "What do Cerbo's engineers say they value and test in interviews (paired coding in TypeScript/JavaScript, rapid delivery, legacy code)?"
asked_in: specs/M1-in-ehr-supplement-orders/brief.md#research-questions
unblocks: "what the build, docs and demo emphasise"
answered_when: "Cerbo job posts or engineering content state it"
status: answered
confidence: high
supersedes: none
date: 2026-10-09
budget: 1/15 tool calls (plus four sources already read for R01)
researched_by: Claude Code, claude-opus-5-5
---

# R07 What Cerbo's engineers value and test

## Answer

Cerbo's 2026 job posts test candidates with a required 45-minute "API Rate Limiter Design Under Constraints" challenge and ask for demonstrated use of AI coding assistants plus the judgment to catch subtle bugs, inefficiencies and security issues in AI-generated code; they also value clean, readable, testable code and clear written communication in a remote, async team. The portal adds a paired coding exercise in 1-2 interview rounds and rates high autonomy, ambiguous problem solving and rapid feature delivery as their environment. Confidence: high, because each claim comes from Cerbo's own posts or panel. (S01.1, S01.2, S01.3, S01.4)

## Takeaway

Cerbo hires engineers who use AI to move fast but check its output critically, design under constraints, and explain their work in writing.

## Findings

- **F1** [LB] Required "API Rate Limiter Design Under Constraints" challenge (about 45 minutes) to be considered. — S01.2 (A), S01.3 (A), S01.4 (A), "challenge" section
- **F2** [LB] Engineers "use AI coding assistants on your work and validate what they produce against clear criteria"; candidates should understand AI limits such as hallucinations and outdated patterns. — S01.2 (A), responsibilities
- **F3** [LB] "AI Tool Competency" requires demonstrated AI-assistant use and critical review to spot "subtle bugs, inefficiencies, or security issues in generated code". — S01.3 (A), S01.4 (A), "AI Tool Competency"
- **F4** Clean, readable, testable code; constructive response to code review; clear written communication in a remote, Slack-first, async environment. — S01.2 (A), qualifications
- **F5** [LB] Interview process: 1–2 rounds; coding assessment is a paired coding exercise; environment rated async/remote-first 5/5, high autonomy 5/5, ambiguous problem solving 4/5; primary focus rapid feature delivery and iteration. — S01.1 (A), §Interview process, §Engineering environment

## Inferences

- **I1** from F2 + F3: an AI usage log that shows where AI output was checked, caught or overridden speaks directly to a stated hiring criterion. Highly likely.
- **I2** from F1 + F5: they assess design under constraints and live collaboration, so a slice whose trade-offs are written down and defensible maps to what they test. Likely.

## Gaps

- ⚠ Does the paired exercise use the rate-limiter problem or a different one? — why: sources describe them separately — would close it: ask the partner or the interviewer
- ⚠ Cerbo has no careers or engineering-culture page found; a same-named manufacturer ("Nolato Cerbo") appears in searches and is unrelated — why: within budget — would close it: a Cerbo engineering blog or talk, if one exists

## Handoffs

- write-prd: Should "AI use made visible and verified" be a stated success measure for the submission (e.g. every AI correction logged), given Cerbo tests critical review of AI output? — rests on F2, F3, I1
- write-prd: Should the deliverables emphasise written trade-offs and design under constraints over breadth? — rests on F1, F4, I2
