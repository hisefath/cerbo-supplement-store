---
status: draft
cut: grader (silent video + live read)
length: "1:52"
video: docs/demo/out/demo.mp4
---

# Demo script — Cerbo supplement store

The video is silent. Read each line while its shot is on screen. Start reading when the clock in the left column
shows. The video circles and points at each thing as you mention it. Speak slowly, as if to a friend. Every line is short enough to say in one breath;
pause briefly between lines.

## Teleprompter

| Clock | On screen | Say |
|---|---|---|
| 0:00 | The GitLab repo | Meet the supplement store for Cerbo, the app doctors use to run their practice. Everything lives right here. |
| 0:07 | Dr. Chen builds Ana's order | A doctor picks what her patient needs. As she adds each item, she sees the total, our small fee, and exactly what she keeps. One click, and it's on its way. |
| 0:20 | Ana opens her order and pays | Now the patient. She opens her order, checks the price, and pays. Tap pay twice by accident? She's still charged once. And here's her receipt. |
| 0:34 | Fran's financial report | Behind the scenes, finance sees every dollar split three ways, and one simple answer: it all adds up. |
| 0:42 | High-level design diagrams | How does it work? One app, one database. Payments and messages plug in through clean doors, so the real ones can slide in later. |
| 0:54 | Data model, then the pay sequence | Here's the data. Money is written down once, and never erased. And if someone presses pay twice, the app simply replays its first answer. No double charge. |
| 1:08 | My answers in the product spec | AI helped build this, but I made the calls. When the research mixed up a competitor's price cap, I set it straight, and asked for a price-change form with a paper trail. When the AI wanted to leave the order dashboard for later, I pulled it forward. |
| 1:26 | The decision ledger | Every decision lives in this ledger: what we chose, and what we didn't. |
| 1:32 | The planted-bug check | The AI wrote the code. Tests it couldn't touch decided when it was done. |
| 1:38 | The top of payments.ts | The heart of it: payments happen in two quick steps, so a slow bank never jams the store. |
| 1:45 | The reviewer guide | And if you're reviewing: start here. Every promise links to the test that proves it. Thank you. |

## Shot list (what the video does)

| Shot | Time | Screen | Action |
|---|---|---|---|
| S01 | 0:00-0:07 | GitLab project root | Points at `docs`, then `AGENTS.md` (the rules every AI agent follows). |
| S02 | 0:07-0:20 | S1 Supplement order for Ana Ruiz (Dr. Chen) | Adds 2 × Vitamin D3 and 1 × Magnesium, circles total, fee and payout, presses Send. |
| S03 | 0:20-0:34 | S16 Your orders → S2 order → Receipt (Ana) | Opens the order, Continue to payment, Pay $60.00, circles the receipt. |
| S04 | 0:34-0:42 | Financial report (Fran) | Circles "Balanced: yes" under $60.00 = $30.00 + $29.55 + $0.45. |
| S05 | 0:42-0:54 | `docs/architecture/hld.md` | Context diagram: our system, the payment stand-in; then the container diagram. |
| S06 | 0:54-1:08 | `docs/architecture/lld.md` | Zooms into `ledger_entries` on the ERD; then the pay sequence, "Pay pressed again with the same key → replay the stored response". |
| S07 | 1:08-1:26 | `docs/product/prd.md` Interview log | Circles the human answers in Q3 (price cap, price-change form, ledger) and Q9 (dashboard now). |
| S08 | 1:26-1:32 | `docs/decisions/REVIEW.md` | Circles "By topic". |
| S09 | 1:32-1:38 | `docs/ops/MUTATION.md` | Circles "SURVIVED" in the explanation of the planted-bug check. |
| S10 | 1:38-1:45 | `server/services/payments.ts` | Circles the header comment (two short transactions, D42) and the money imports. |
| S11 | 1:45-1:52 | `docs/REVIEWER_GUIDE.md` | Circles "Start here (10 minutes)". |

## Claims and where they come from

| Claim | Evidence |
|---|---|
| The doctor sees total, fee and payout before sending | `app/components/order-builder/OrderPanel.vue:45-47`; FR-002 |
| Pay twice, charged once | FR-008; M4_AT_006 (`tests/acceptance/M4/pay-order.test.ts`); D41 |
| Finance sees the three-way split and that it balances | FR-060, FR-061; `app/pages/ops/finance.vue` |
| One app, one database, payments and messages as stand-ins | `docs/architecture/hld.md` §2-§3; D33, D34 |
| Money written once and never erased | INV-4; `db/migrations/1760000002000_payments-ledger.sql` (triggers, insert-only grant) |
| Pay pressed again replays the first answer | `docs/architecture/lld.md` SEQ-2; D41 |
| Price cap correction, price-change form with a paper trail | `docs/product/prd.md` Interview log Q3 (the human's words) |
| Dashboard pulled forward | `docs/product/prd.md` Interview log Q9: recommendation "order-status list Later", answer "we need a dashboard" |
| Every decision with what lost | `docs/decisions/DECISION_JOURNAL.md`, `docs/decisions/REVIEW.md` |
| Tests the AI couldn't touch decided done | `AGENTS.md` Never rules (`tests/acceptance/**` is QA-owned); `scripts/scope-guard.sh`; `docs/ops/MUTATION.md` |
| Two quick steps, so a slow bank never jams the store | `server/services/payments.ts:1-3`; D42 |
| Every promise links to its test | `docs/REVIEWER_GUIDE.md`; `scripts/evidence-table.sh` |

## Recording notes

- The app shots ran on a local copy of the same code (`main` plus the receipt fix), on synthetic demo people only
  (`db/seed/demo.ts`). The live site is https://web-v2-production-6640.up.railway.app.
- Repo shots are the public GitLab pages, with GitLab's sidebars hidden for room.
- Recording this video surfaced a real bug: the receipt never showed after paying (`specs/bugs/blank-receipt.md`),
  fixed before the final take.
