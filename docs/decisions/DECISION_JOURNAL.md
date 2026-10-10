# Decision journal

Why each design choice was made and what it cost (software-factory-kit WORKFLOW.md §9). Committed, append-only.

- Written only by the `log-decision` skill, after every gate. It records decisions the **human** made; an entry is
  never `accepted` without the human's quoted words.
- Never renumber or delete an entry. Change your mind by adding a new D-row and marking the old one
  `superseded-by D<m>`. Rejected options stay visible.
- One-way (Type 1) decisions are also promoted to `docs/decisions/NNNN-<slug>.md`.
- Who said yes, word for word, lives in `.handoff/TRACKER.md ## Approvals`; this file holds the reasoning.

## Entry schema

Copy this block for each new entry (D-ids increase by one, starting at D1):

```markdown
### D<n> <title>  [status: proposed | accepted | superseded-by D<m> | rejected]
- Date (`date`) · phase · milestone · Decided by: human · Proposed by: <skill> (<harness>, <model>) · artifact@<sha>
- Context and forces (FR/NFR ids)
- Options: always includes "do nothing" and the agent's first proposal ("instead of")
- Choice · Why (Y-statement: in context C, facing F, we chose X over Y to get Z, accepting W)
- Cost accepted · Reversibility (Type 1 one-way / Type 2 two-way) · Confidence (low/med/high)
- Revisit if · Evidence (file:line, R/S ids) · Interview line (one sentence you'd say out loud)
```

## Entries

<!-- log-decision appends D1 below this line. -->

> **D1–D17 are imported v1 decisions, all `proposed`.** They come from the private journal of the v1 build
> (2026-10-05/06), when Claude worked autonomously and no human gate existed. Imported 2026-10-08 on the human's
> instruction (`.handoff/TRACKER.md ## Approvals`, 22:34 CDT); the original is backed up outside the repo. None is
> `accepted`: nobody approved them at a gate. The v2 gates (G1 PRD, G2 HLD, G3 LLD) re-decide each one by adding a
> new D-row that accepts or supersedes it. Evidence points at the v1 tree on `main@778e788`.

### D1 Stack: Laravel 13 / PHP 8.5  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet (agent choice, never gated) · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: any stack allowed; 1–2 day slice graded on judgment, money correctness and clean seams. Cerbo's job posts list PHP/Laravel as the core stack (some Java/Spring).
- Options: do nothing (n/a) · Python/Flask + SQLite (the agent's first proposal, smallest codebase) · Next.js + Prisma + Postgres · **Laravel + Blade**
- Choice · Why: in a graded partner evaluation, facing reviewers who live in PHP/Laravel, chose Laravel over Python/Flask to remove translation cost and get transactions, row locks, migrations, validation, CSRF, a service container and a log mailer natively, accepting more skeleton files and a local PHP install.
- Cost accepted: skeleton noise, brew install of PHP. · Reversibility: Type 1 once code exists (rewrite) · Confidence: high
- Revisit if: Cerbo says the slice should be framework-agnostic or in Java. · Evidence: `composer.json`, `docs/ARCHITECTURE.md` §Stack
- Interview line: "I built in Laravel because it's Cerbo's own stack, so their engineers read it in their idiom."

### D2 Database: Postgres in prod, SQLite in dev/tests, suite run on both  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: the money flow relies on row locks, CHECK constraints and partial unique indexes; reviewers should be able to clone and run with no setup.
- Options: do nothing (n/a) · Postgres everywhere (Docker locally) · SQLite everywhere (prod on a volume) · **split**
- Choice · Why: chose Postgres in prod + SQLite locally over Postgres-everywhere to get zero-setup clones while prod keeps real locks and constraints, accepting two engines (CHECKs are Postgres-only behind a driver guard; SQLite uses `transaction_mode=IMMEDIATE` because it ignores `FOR UPDATE`).
- Cost accepted: portability discipline; CHECKs not exercised on SQLite. · Reversibility: Type 2 · Confidence: med
- Revisit if: a portability bug appears → Postgres everywhere. · Evidence: `config/database.php`, `database/migrations/2026_10_05_000000_create_store_tables.php`, `.github/workflows/tests.yml`
- Interview line: "Prod gets Postgres guarantees; a reviewer gets a one-command SQLite setup; CI runs both."

### D3 Fee: 75 bps of the order subtotal, once per order, half-up, borne by the provider  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: the brief says "take a 75 bps platform fee on the transaction"; base, rounding and bearer are unspecified.
- Options: do nothing (n/a) · fee on margin · per-line fee summed · patient pays the fee on top · platform absorbs · **on subtotal, per order, half-up, out of provider payout**
- Choice · Why: chose subtotal/per-order/half-up/provider-borne so the patient pays exactly the quoted price and payout is the residual (`subtotal = cogs + fee + payout` exact), accepting that at-cost dispensing gives a negative payout and is blocked.
- Cost accepted: at-cost orders rejected (open product question). · Reversibility: Type 2 · Confidence: med
- Revisit if: Cerbo wants the platform to absorb the fee for at-cost providers. · Evidence: `app/Money/Split.php`, `tests/Unit/SplitTest.php`
- Interview line: "75 bps on the transaction means on the gross; the provider bears it so the patient pays exactly the quote."

### D4 Persisted split on the order AND a settlement ledger  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: "see exactly where every cent went" for a paid order; refunds and payouts are future events.
- Options: do nothing (split on order only) · ledger only · **both, cross-checked**
- Choice · Why: chose both over order-only so the order holds the quote and the ledger holds what moved, with `ledger:verify` cross-checking them, accepting some duplication.
- Cost accepted: two records of one fact. · Reversibility: Type 2 · Confidence: high
- Revisit if: a real accounting system takes over the ledger. · Evidence: `app/Services/Ledger.php`, `routes/console.php`
- Interview line: "The order row is the quote, the ledger is what happened; checking one against the other is the audit."

### D5 Payment: reserve (txn) → charge (no txn) → settle (txn)  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: a real processor call takes 300 ms to seconds and can hang.
- Options: do nothing (charge inside one transaction, the simple first draft) · **three short phases**
- Choice · Why: chose reserve/charge/settle over one transaction so no DB lock is held across network I/O, accepting an intermediate `processing` state and a reconcile job for crashes (detected, not built).
- Cost accepted: one extra state; stuck payments need reconciliation. · Reversibility: Type 2 · Confidence: high
- Revisit if: the gateway gets webhooks (settle moves there). · Evidence: `app/Services/CheckoutService.php`
- Interview line: "Never hold a database lock across a network call."

### D6 Stock: column + movement log, conditional decrement, reserved at payment  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: the platform holds inventory; oversell and unpaid links holding stock are both risks.
- Options: do nothing (no stock) · stock = Σ movements only · reserve at send · decrement after charge · **column + log, reserve at payment**
- Choice · Why: chose an atomic `UPDATE … WHERE stock >= qty` plus a movement row, reserved at payment, so oversell is impossible and unpaid links hold nothing, accepting a column/log invariant to verify.
- Cost accepted: `stock == Σ movements` must be checked. · Reversibility: Type 2 · Confidence: high
- Revisit if: warehouses or lots are modelled. · Evidence: `app/Models/Product.php`, `scripts/race-check.sh`
- Interview line: "The conditional decrement can't oversell, and every stock change leaves an audit row."

### D7 Stubs and their seams  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: the brief says stub payments, auth, email and shipping but keep the seams clean.
- Options: do nothing (inline fakes) · **interface/driver seams**: `PaymentGateway` + `FakePaymentGateway` (no card fields anywhere), an "acting as" auth switcher with real query scoping, a 40-char patient token link, Laravel's `log` mailer, a fulfillment log line
- Choice · Why: chose explicit seams so a real adapter replaces one binding, accepting a public demo where anyone can act as a demo provider.
- Cost accepted: stubbed auth on a public URL (demo data only). · Reversibility: Type 2 · Confidence: high
- Revisit if: real auth or Stripe arrives. · Evidence: `app/Payments/`, `app/Http/Middleware/ActingProvider.php`
- Interview line: "Authentication is stubbed, authorization is real."

### D8 Deliberately out of scope  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: 1–2 day time box; the brief grades integrity over breadth.
- Options: do nothing (build everything) · **cut drafts, refunds, payouts, recurring protocols, tax/shipping, catalog UX**
- Choice · Why: cut breadth to prove the core flow, accepting that recurring protocols (the real volume lever) are absent.
- Cost accepted: no refunds/payouts/recurring. · Reversibility: Type 2 · Confidence: high
- Revisit if: a milestone has spare appetite. · Evidence: `docs/PRD.md` §10
- Interview line: "I cut breadth to make the money path airtight."

### D9 Diagrams as .mmd sources plus embedded copies  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: the human asked for a separate Mermaid syntax document.
- Options: do nothing (inline only) · **`docs/diagrams/*.mmd` + embedded copies in SYSTEM_DESIGN.md**
- Choice · Why: chose sources plus embeds so diagrams render on GitHub and paste into mermaid.live, accepting drift risk (regenerate, never edit both).
- Cost accepted: two copies. · Reversibility: Type 2 · Confidence: med
- Revisit if: v2 adopts the factory's `scripts/embed-diagrams.sh`, which supersedes this. · Evidence: `docs/diagrams/README.md`
- Interview line: "One source per diagram, embedded by a script, validated by rendering."

### D10 Design-review panel → accepted changes  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 design-review workflow (5 critics + 5 adversarial verifiers; 39 findings, 26 survived) · artifact@778e788
- Context: the first audit was circular (it compared the stored split only to copies of itself).
- Options: do nothing · accept all 26 · **accept most, reject 3**
- Choice · Why: accepted recompute-from-snapshots, immutable order lines, `UNIQUE(payment_id, account)`, product lock order, trusted proxies, cancel, advisory stock check; rejected cutting the markup helper (brief says "price (or margin)"), cutting the client idempotency key (double-click on a decline) and dropping checkout movements.
- Cost accepted: more code than the panel's minimum. · Reversibility: Type 2 · Confidence: med
- Revisit if: v2 PRD drops margin entry. · Evidence: `docs/AI_USAGE.md`
- Interview line: "I let reviewers attack the design, then overrode three cuts with reasons."

### D11 One stock path: `Product::adjustStock()`  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: seed, checkout reserve/release and the dashboard all change stock.
- Options: do nothing (each caller writes SQL) · a service class · **one model method (atomic relative UPDATE + movement in one txn)**
- Choice · Why: chose one method so every stock change is atomic and audited, accepting an active-record method on the model.
- Cost accepted: model holds a little logic. · Reversibility: Type 2 · Confidence: high
- Revisit if: inventory becomes its own module. · Evidence: `app/Models/Product.php`
- Interview line: "Stock changes in exactly one place, so the invariant has one guardian."

### D12 Cancel built (scope add)  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 design-review panel · artifact@778e788
- Context: a sent link could not be withdrawn.
- Options: do nothing · **cancel unpaid orders under the same row lock as pay**
- Choice · Why: chose cancel (~15 lines + a test) so cancel and pay can't both win, accepting a fourth state.
- Cost accepted: one more status. · Reversibility: Type 2 · Confidence: high
- Revisit if: refunds arrive (cancel of paid orders). · Evidence: `app/Services/OrderService.php`
- Interview line: "Cancel takes the same lock as pay, so only one can win."

### D13 Deploy: Railway + Dockerfile (FrankenPHP) + Railway Postgres  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet (the deploy itself ran on the human's standing autonomy instruction) · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: a deployed URL is a hard deliverable.
- Options: do nothing · Railpack auto-detect · **Dockerfile (FrankenPHP 1.12, PHP 8.5)**
- Choice · Why: chose a Dockerfile for reproducibility and portability; boot runs migrate → seed (no-op unless empty) → caches → serve, accepting Railway-specific env wiring and an always-on cost.
- Cost accepted: one small service + Postgres on the human's account. · Reversibility: Type 2 · Confidence: high
- Revisit if: cost or vendor changes. · Evidence: `Dockerfile`
- Interview line: "One reproducible image; the platform is swappable."

### D14 Neutral branding on the public demo  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: a public URL with the partner's name could pass for an official product.
- Options: do nothing (`cerbo-…` domain, "Cerbo keeps" copy) · **neutral domain + "platform" copy + not-affiliated footer**
- Choice · Why: chose neutral branding so the demo can't be mistaken for Cerbo's, accepting a less "on-brand" demo.
- Cost accepted: none material. · Reversibility: Type 2 · Confidence: high
- Revisit if: Cerbo asks to brand it. · Evidence: `resources/views/layout.blade.php`
- Interview line: "It's a demo for Cerbo, never presented as Cerbo."

### D15 GitLab visibility is the human's step  [status: superseded-by D22]
- 2026-10-05 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (Claude Code, claude-opus-5-5) · artifact@778e788
- Context: push-to-create makes a private project; the only GitLab token is a project bot for another project.
- Options: do nothing (stay private) · sign in as the human (never) · **hand the one click to the human**
- Choice · Why: left visibility to the human, accepting that GitLab links 404 for others until flipped.
- Cost accepted: blocked links until flipped. · Reversibility: Type 2 · Confidence: high
- Revisit if: a scoped token appears. · Evidence: README links
- Interview line: "Visibility changes are human-only."

### D16 Code-review panel → accepted changes  [status: superseded-by D22]
- 2026-10-06 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 code-review workflow (5 lenses + adversarial verifiers; 32 findings, 15 survived) · artifact@778e788
- Context: a double-clicked "Send" created two payable orders; the audit missed money captured but never booked.
- Options: do nothing · **accept: idempotent send (`request_key`), canonical product keys, movement-vs-line and captured-but-unbooked audit checks, snapshot-consistent verify, trusted proxies narrowed to proto/for, PHP ≥ 8.4** · decline: removing the skeleton's `shouldRenderJsonWhen`, a ledger `payment_id` check
- Choice · Why: accepted the integrity fixes, declined skeleton churn and a redundant check, accepting a second migration.
- Cost accepted: more audit code. · Reversibility: Type 2 · Confidence: med
- Revisit if: v2 design changes the send flow. · Evidence: `docs/AI_USAGE.md` §Code review
- Interview line: "Send is idempotent too, so a double-click can't create two payable links."

### D17 Never edit a migration that already ran in prod  [status: superseded-by D22]
- 2026-10-06 · v1 build · pre-factory · Decided by: nobody yet · Proposed by: v1 autonomous build (self-caught mistake) · artifact@778e788
- Context: a column was added by editing the original migration after production had run it.
- Options: do nothing (boot migrate never adds the column; order creation breaks) · reset prod · **new nullable+unique migration, upgrade path replayed from git**
- Choice · Why: chose a forward migration so prod upgrades cleanly, accepting nullable history rows.
- Cost accepted: nullable `request_key` for pre-existing rows. · Reversibility: Type 2 · Confidence: high
- Revisit if: never; this is a standing rule. · Evidence: `database/migrations/2026_10_06_000000_add_request_key_to_orders.php`
- Interview line: "Migrations that ran in production are immutable; fixes go forward."

### D18 Restart from scratch on a milestone branch  [status: accepted]
- 2026-10-09 16:27 CDT · phase 0 (setup) · M1 · Decided by: human, decision 2026-10-08 23:59 CDT: "what ever is in the cerbo repo right now, we should start from scratch on a new branch, and follow the new ai workflow from the start" · Proposed by: supervisor (Claude Code, claude-opus-5-5), listed as an open question, no options card · artifact@main 778e788 → commit 8949ae4
- Context and forces: v2 redo of a graded partner project under software-factory-kit; v1 had no human gates; the human wants to practice the workflow end to end. Keeping v1 code on the branch would make it brownfield (adds `audit-codebase`).
- Options:
  - Do nothing — ⚠ not offered at the gate (keep v1 on the branch: brownfield, audit-codebase before write-prd)
  - Delete v1 at the first implementation milestone (agent's first proposal — no instead-of recorded) — rejected: the human wanted a clean start now
  - Delete everything tracked except `.gitignore` now, keep v1 in `main@778e788` — chosen
- Choice · Why: in a redo meant to practise the whole workflow, facing a v1 built without gates, we chose a clean greenfield branch over keeping v1 as brownfield to run every phase from sharpen-brief, accepting that v1 code is reachable only through history.
- Cost accepted: v1 is no longer browsable on the branch; the first milestone merge removes it from main's tip (history keeps it). · Reversibility: Type 2 (`git checkout 778e788 -- <path>`) · Confidence: high
- Revisit if: a v1 component is worth reusing (bring it forward via a task that owns it). · Evidence: commit 8949ae4; approval decision 2026-10-08 23:59 CDT · Interview line: "I restarted on a branch so every v2 decision passes a gate, while git history keeps v1 one checkout away."

### D19 Docs-only rules until the stack is designed  [status: accepted]
- 2026-10-09 16:27 CDT · phase 0 (G-init) · M1 · Decided by: human, G-init 2026-10-09 16:26 CDT: "lets do 1, because i want a clean start, and to work through the new ai workflow end to end." · Proposed by: supervisor (Claude Code, claude-opus-5-5) · artifact@1ed9fd1 (AGENTS.md, Makefile)
- Context and forces: after D18 no stack exists; `make check` must be a real green/red gate the pre-push hook can pass for docs milestones.
- Options:
  - Do nothing / simplest (shown as "Stop / do nothing") — rejected: scaffold uncommitted, nothing can start
  - Docs-only rules: project named, stack "decided at M3", `make check` = script syntax + diagram embed sync (agent's recommendation; agent's first proposal — no instead-of recorded) — chosen
  - Keep the Laravel commands — rejected: presumes the M3 design decision; `make check` stays red, nothing pushes
  - Revise — rejected: not needed
- Choice · Why: in a clean restart, facing an undecided stack, we chose docs-only checks over keeping Laravel commands so the rulebook states only decided facts, accepting a light `make check` until code exists.
- Cost accepted: `make check` proves little until M3 adds stack tools. · Reversibility: Type 2 · Confidence: high
- Revisit if: the M3 design gate picks a stack (add its lint/types/test to `make check`). · Evidence: AGENTS.md, Makefile @1ed9fd1; approval G-init 2026-10-09 16:26 CDT · Interview line: "The rulebook only states what's decided, so checks cover docs until the stack is chosen."

### D20 Route harness findings F1-F3 at M1 close  [status: accepted]
- 2026-10-09 16:32 CDT · phase 0 (setup) · M1 · Decided by: human, 2026-10-09 16:32 CDT: "for the decision, 1, then /sharpen-brief after" · Proposed by: supervisor (Claude Code, claude-opus-5-5) · artifact@7cf0d04 (.handoff/TRACKER.md ## Log)
- Context and forces: three real workflow failures (F1 log-decision can't create a missing journal; F2 G-init approves uncommitted files; F3 a decision asked without an options card). Skill edits are human-only and go through route-failure → G-L5.
- Options:
  - Do nothing — rejected: the next brownfield repo hits F1 again
  - At M1 close, via the milestone-close chain (agent's recommendation; agent's first proposal — no instead-of recorded) — chosen
  - Now, before sharpen-brief — rejected: jumps ahead of the workflow; none of F1-F3 blocks M1
- Choice · Why: in a project run to practise the workflow, facing three non-blocking skill gaps, we chose to route them at M1 close over fixing now to practise route-failure in its proper place, accepting unfixed skills for a few hours.
- Cost accepted: workarounds stay until M1 closes. · Reversibility: Type 2 · Confidence: high
- Revisit if: a finding blocks M1 work. · Evidence: .handoff/TRACKER.md ## Log F1-F3 · Interview line: "Fixes to the factory come from logged failures, batched at milestone close and approved at their own gate."

### D21 Adopt North Star metrics and partner lens (H1)  [status: accepted]
- 2026-10-09 17:28 CDT · route-failure (G-L5) · M1 · Decided by: human, G-L5 2026-10-09 17:21 CDT 2026-10-09 17:27 CDT: "approved" · Proposed by: route-failure (Claude Code, claude-opus-5-5) · artifact: software-factory-kit HARNESS_CHANGELOG.md H1@19d8e18b0765 (applied ee2e6a2)
- Context and forces: the human asked every project to start from a North Star metric and the hiring partner's view (Byron Mackay, "Defining Metrics", 2026-09-15); the Cerbo portal's stack list contradicted v1's Laravel pick, a partner signal no phase had captured. Kit FINDINGS F3.
- Options:
  - Do nothing / simplest (shown as "Stop / reject") — rejected: future projects repeat the gap
  - Approve H1: shared docs/METRICS.md + sections in sharpen-brief, gather-evidence, write-prd (agent's recommendation; agent's first proposal — no instead-of recorded) — chosen
  - Revise (e.g. partner lens as its own skill) — rejected: not asked for
  - Put everything in sharpen-brief only (offered earlier as option 2) — rejected: the brief would set targets the PRD gate should own
- Choice · Why: in a factory reused on every hiring-partner project, facing briefs that proved engineering but not value, we chose candidates in the brief, evidence in research and a locked metric tree in the PRD over one bloated skill, to keep one job per phase, accepting two more brief sections per project.
- Cost accepted: more to fill in every brief and PRD. · Reversibility: Type 2 (revert ee2e6a2) · Confidence: high
- Revisit if: briefs routinely leave NS-01 as ⚠ after research, or the PRD's metric tree gets ignored downstream. · Evidence: software-factory-kit FINDINGS.md F3, docs/METRICS.md; approval G-L5 2026-10-09 17:21 CDT 2026-10-09 17:27 CDT · Interview line: "My factory makes every project name one North Star in the partner's business terms before design, because proving value is the job, not building."

### D22 Set the one-shot build in main aside  [status: accepted]
- 2026-10-09 18:19 CDT · sharpen-brief (M1) · M1 · Decided by: human, 2026-10-09 18:19 CDT: "actually the whole laravel thing, i dont want, since we're started from scratch. whatevers in main branch, just dont worry about it" and "for anything to do with the main branch, we should just say how we did the project in a one shot manner before, because ai is so powerful, and wanted to see if it would work, but then scratched that and started again with a full auditable work flow with me being very intimately involved in the planning stage as ai can catch whats broken but cant catch whats wrong, and solving the wrong problem is highly probable for a non deterministic model." · Proposed by: human · artifact@main 778e788
- Context and forces: D1–D17 (v1, proposed) kept pulling v1 choices (Laravel, its payment design) into v2 research and design; the human wants v2 decided from evidence alone.
- Options:
  - Do nothing — ⚠ not offered at the gate (keep D1–D17 as proposed inputs to G2/G3)
  - Keep D1–D17 as candidate inputs for M3 design (agent's first proposal — no instead-of recorded) — rejected: v2 should start from evidence, not from an ungated one-shot build
  - Set main aside entirely; describe it only as the earlier one-shot experiment — chosen
- Choice · Why: in a redo meant to show an auditable, human-gated process, facing seventeen ungated v1 decisions, we chose to set main aside over reusing its choices, so every v2 decision passes a gate on fresh evidence, accepting that good v1 ideas must be re-derived.
- Cost accepted: v1 work is not reused. · Reversibility: Type 2 · Confidence: high
- Revisit if: never for this project. · Evidence: AGENTS.md "Project specifics"; brief P-02 withdrawn · Interview line: "I first let AI one-shot it to see if it could; it built something that worked, but AI catches what's broken, not what's wrong, so I restarted with me gating every planning decision."

### D23 Full track for the M1 brief  [status: accepted]
- 2026-10-09 18:22 CDT · sharpen-brief (G0) · M1 · Decided by: human, G0 2026-10-09 18:22 CDT: "approve" · Proposed by: sharpen-brief (Claude Code, claude-opus-5-5) · artifact@e8c6621 (specs/M1-in-ehr-supplement-orders/brief.md)
- Context and forces: graded hiring-partner project restarted clean (D18, D22); problem, North Star candidate (in-house GMV per practice per period), 24 requirements and 7 research questions in the brief; deadline waived by the human.
- Options:
  - Do nothing — rejected: no rebuild, no practice, no auditable record
  - Full: every phase from brief to ship with gates (agent's recommendation; agent's first proposal — no instead-of recorded) — chosen
  - Standard — rejected: no v2 PRD exists to start from
  - Fix — rejected: touches money and the data model
- Choice · Why: in a graded partner project meant to practise the whole workflow, facing a high risk of solving the wrong problem, we chose Full over shortcuts to get a gated, auditable record from brief to ship, accepting more documents before code.
- Cost accepted: slower start; many gates. · Reversibility: Type 2 (a track may move up, never down) · Confidence: high
- Revisit if: appetite changes (a deadline appears). · Evidence: brief §Track; approval G0 2026-10-09 18:22 CDT · Interview line: "I ran the full gated track because the expensive failure is building the wrong thing, and gates are where I catch that."

### D24 Adopt market, competitor and load-profile research (H3)  [status: accepted]
- 2026-10-09 19:42 CDT · route-failure (G-L5) · M1 · Decided by: human, G-L5 2026-10-09 19:42 CDT: "approve, then /gather-evidence" · Proposed by: route-failure (Claude Code, claude-opus-5-5) · artifact: software-factory-kit HARNESS_CHANGELOG.md H3@255e96814097 (applied 071beeb)
- Context and forces: the human paused write-prd after Q2: success targets and later system sizing had no market or usage evidence (kit FINDINGS F4). The human then added competitors and their users, expected share, usage timing for maintenance windows, and load for instance sizing, throughput and stack choices.
- Options:
  - Do nothing / simplest (shown as "Stop / reject") — rejected: targets and sizing would be guessed
  - Approve H3: market-research reference (competitors, ICP, TAM/SAM/SOM bottom-up, share, clusters, usage and load profile) + required brief questions + checks (agent's recommendation; agent's first proposal was H2 without competitors and load, superseded after the human's Revise) — chosen
  - H2 (market and ICP only) — rejected by the human's Revise: missed competitors, usage timing and load
  - Revise again — rejected: not asked for
- Choice · Why: in a factory reused across hiring-partner projects, facing PRD targets and design sizing with no evidence, we chose a bottom-up market and load method with stated formulas and ranges over guessed round numbers, so targets and machine sizing trace to evidence, accepting two more required brief questions and a heavier research pass.
- Cost accepted: longer research before the PRD. · Reversibility: Type 2 (revert 071beeb) · Confidence: high
- Revisit if: market questions routinely end as gaps with no public data. · Evidence: software-factory-kit FINDINGS.md F4, skills/gather-evidence/references/market-research.md; approval G-L5 2026-10-09 19:42 CDT · Interview line: "Before designing, I size the market and the expected load bottom-up with stated assumptions, so my targets and my machine sizing come from evidence, not round numbers."

### D25 PRD scope: money path first, HIPAA-ready, campaigns later  [status: accepted]
- 2026-10-09 20:29 CDT · write-prd (G1) · M2 · Decided by: human, G1 2026-10-09 20:29 CDT: "approve, then /map-ux-flows" · Proposed by: write-prd (Claude Code, claude-opus-5-5) · artifact: docs/product/prd.md@425e09c
- Context and forces: REQ-01 to REQ-06 ask for one order journey with an auditable split; the human added default prices with an auditable price-change form (Q3), must-never-happen rules including no overselling and prices locked only at checkout (Q4), targets grounded in R10 and R11 (Q5), and HIPAA treatment (Q8). FR-001 to FR-038, NFR-001 to NFR-011, SC-001 to SC-003.
- Options:
  - Do nothing — rejected: no requirements, design would guess
  - Agent's first draft (5fe5a0f) with 8 open questions and no HIPAA safeguards — revised by the human: questions answered (Q6), assumptions confirmed (Q7), HIPAA-ready added (Q8)
  - Claim full HIPAA compliance — rejected (Q8): the assignment puts compliance out of scope and compliance is organisational (BAAs, risk analysis, policies)
  - Put stock limits and pricing in the tracer bullet — not chosen: the money path (order, one payment, split to the cent) is what the partner grades
  - Approved PRD 425e09c — chosen
- Choice · Why: in a 1–2 day graded slice facing a partner who grades money integrity and judgment, we chose a tracer bullet of order → single payment → split recorded to the cent, with pricing and stock in M5, measurement in M6 and campaigns Later, over a broader first build, to prove the core promise first, accepting that stock limits arrive one milestone later.
- Cost accepted: no overselling protection until M5; campaigns, refunds and refills deferred; HIPAA safeguards are partly stand-ins because sign-in is stubbed. · Reversibility: Type 2 (PRD edit + new G1) · Confidence: medium
- Revisit if: the partner's feedback weights stock or campaigns over the split, or real patient data is ever in scope. · Evidence: docs/product/prd.md (Milestone cut, NG-10, Interview log Q1-Q8); R08-R13 · Interview line: "I scoped the first build to the money path because that's what they grade, and made it HIPAA-ready rather than claiming compliance, because compliance is an organisational status."

### D26 PRD revision: sign-in, patient notices without health details, dashboards, no patient identity for platform staff  [status: accepted]
- 2026-10-09 21:50 CDT · write-prd (G1) · M2 · Decided by: human, G1 2026-10-09 21:50 CDT: "approve, then /map-ux-flows" · Proposed by: write-prd (Claude Code, claude-opus-5-5) · artifact: docs/product/prd.md@930a8d7
- Context and forces: map-ux-flows pass 1 surfaced three gaps (no story owned sign-in; no order-status view; how the patient reaches the order). The human asked for sign-in in the spec, an e-commerce dashboard with order status and bottleneck alerts, and no PII for platform staff (Q9-Q11). FR-039 to FR-050, NFR-004, NFR-012.
- Options:
  - Do nothing — rejected: sign-in and order status would be designed with no requirement behind them
  - Agent's first proposal: sign-in story, order-status list Later, S1 shows the patient's link — revised by the human: order-status list and metrics wanted now; the link question researched
  - Magic link that opens the order directly — rejected (Q10): anyone holding the email sees health details
  - Details in the email — rejected (Q10): health information sits in the inbox, against the HIPAA-ready stance (D25)
  - Everything in M5, or everything in M6 — rejected (Q11) for an M5 practice view and an M6 platform view
  - Approved PRD 930a8d7 — chosen
- Choice · Why: in an EHR store whose patients' supplement lists are health information, facing a demo that switches people and a business that needs to see bottlenecks, we chose personal sign-in, detail-free notices, a practice order-status view with alerts in M5, and a de-identified platform health dashboard in M6, over link-only access and a single dashboard, to keep each person to the minimum they need, accepting one more P1 story in the tracer bullet.
- Cost accepted: M4 grows by sign-in; alert thresholds are agent picks (A-10, A-11) until real data exists. · Reversibility: Type 2 (PRD edit + new G1) · Confidence: medium
- Revisit if: the partner expects the order to open from the message without sign-in, or alert lines prove noisy. · Evidence: docs/product/prd.md Interview log Q9-Q11; Fullscript support (S02.3); HHS FAQ 570 via Holland & Hart summary · Interview line: "The notice says only who sent an order; the patient signs in to see it, and operations staff audit orders by number without ever seeing who the patient is."

### D27 Screen layouts: live payout builder, two-step patient checkout, equation-first audit  [status: accepted]
- 2026-10-09 21:52 CDT · map-ux-flows (G-ux, variant half) · M3 · Decided by: human, G-ux 2026-10-09 21:52 CDT: "go, then run pass 2" · Proposed by: map-ux-flows (Claude Code, claude-opus-5-5) · artifact: docs/design/screens.md@91997dc
- Context and forces: three key screens carry the demo: the provider's order (FR-001, FR-002, FR-025), the patient's order and checkout (FR-022, FR-023, FR-037), and the reviewer's breakdown (FR-014, FR-050).
- Options:
  - Do nothing — rejected: define-acceptance needs a G-ux approval
  - S1-V2 two steps, S1-V3 search lines — rejected: hide the payout until the end, or hide stock while browsing
  - S2-V1 one page — rejected: the 30-minute price hold has no visible moment; S2-V3 pay first — rejected: hides the price-change notice (FR-022)
  - S4-V2 money in and out, S4-V3 item by item — rejected: items hidden, or the check spread over three rows
  - S1-V1, S2-V2, S4-V1 (agent's recommendation) — chosen
- Choice · Why: for a demo that must show money integrity, facing a price rule that is final only at checkout, we chose a live payout panel, a separate checkout step and an equation-first audit view over denser or faster layouts, so each screen shows its rule at a glance, accepting one extra tap for the patient.
- Cost accepted: the patient taps once more; the provider builder needs desktop width. · Reversibility: Type 2 · Confidence: high
- Revisit if: patients abandon at the checkout step (SC-003). · Evidence: docs/design/screens.md S1, S2, S4 Variants · Interview line: "Each key screen shows its rule at a glance: the provider sees her payout as she builds, the patient sees prices locked when checkout starts, and the auditor sees one equation that adds up."

### D28 UX contract: 9 screens, six states each, 90-second demo  [status: accepted]
- 2026-10-09 21:57 CDT · map-ux-flows (G-ux) · M3 · Decided by: human, G-ux 2026-10-09 21:57 CDT: "approve, then /design-hld" · Proposed by: map-ux-flows (Claude Code, claude-opus-5-5) · artifact: docs/design/screens.md@96f2f5f
- Context and forces: M4 and M5 stories US-1 to US-5 and US-8 need screens; the human asked to review both journeys together (Q1); provider desktop, patient phone (Q2); provider order inside the chart (Q3).
- Options:
  - Do nothing — rejected: define-acceptance needs G-ux
  - M4 only (agent's first recommendation) — rejected by the human: review both journeys at once
  - Happy-path screens only — rejected by the skill's rule: most bugs live in the other five states
  - 9 screens with six states, copy, accessibility and a 1:30 demo — chosen
- Choice · Why: for a slice judged on judgment and a live demo, we chose a full state contract for every screen over happy-path mock-ups, so tests and the build have no gaps to guess, accepting a longer design pass.
- Cost accepted: one open question (fee share per product on S6, FR-028) goes to clarify-spec. · Reversibility: Type 2 · Confidence: high
- Revisit if: the partner's demo feedback changes the spine. · Evidence: docs/design/flows.md, docs/design/screens.md · Interview line: "Every screen was designed in six states before any code, so the tests come straight from the design."

### D29 PRD revision: financial report with gross and net, four least-privilege operations roles  [status: accepted]
- 2026-10-09 22:16 CDT · write-prd (G1) · M2 · Decided by: human, G1 2026-10-09 22:16 CDT: "approve, then /map-ux-flows" · Proposed by: write-prd (Claude Code, claude-opus-5-5) · artifact: docs/product/prd.md@ab9f181
- Context and forces: the human asked that operations data produce financial reports and that operations access be managed with a lean team (Q12). R14 (report shape, gross vs net, 3-year retention) and R15 (minimum necessary, separation of duties, least privilege). FR-051 to FR-065, NFR-013, NFR-014.
- Options:
  - Do nothing — rejected: no way to close the books or control staff access
  - Pick gross or net revenue in the product — rejected: an accountant's judgment (R14 I2); show both, labelled
  - One "platform staff" role for everyone — rejected: breaks minimum necessary and separation of duties (R15)
  - Finance lead, operations specialist, SRE, data analyst; SRE grants roles, finance reviews the access log (agent's proposal, revised after R15 F4) — chosen
- Choice · Why: for a platform that must close its books and pass an audit, facing a mixed principal-versus-agent case and HIPAA's minimum-necessary rule, we chose a balancing period report with gross and net side by side and four least-privilege roles with separated grant and review, over a single admin role, to keep every person to the data their job needs, accepting four more role screens in M6.
- Cost accepted: M6 grows; a single SRE is a bottleneck for role changes (EC-15). · Reversibility: Type 2 · Confidence: medium
- Revisit if: the partner's finance team settles gross vs net, or the team grows beyond four roles. · Evidence: docs/research/R14, R15; docs/product/prd.md US-9, US-10 · Interview line: "The person who hands out access never reviews the access log, and nobody on the ops team ever sees who a patient is."

### D30 Operations layouts: order funnel, balance-first financial report, people-list access  [status: accepted]
- 2026-10-09 22:31 CDT · map-ux-flows (G-ux, variant half) · M3 · Decided by: human, G-ux 2026-10-09 22:31 CDT: "go, then run pass 2" · Proposed by: map-ux-flows (Claude Code, claude-opus-5-5) · artifact: docs/design/screens.md@9282682
- Context and forces: the human asked to see bottlenecks and alerts (Q9, Q11), to produce financial reports (Q12) and to manage operations access (Q12). FR-048, FR-049, FR-060 to FR-065, FR-054 to FR-056.
- Options:
  - Do nothing — rejected: define-acceptance for M6 needs G-ux
  - S10-V1 alert tiles, S10-V3 measures against alert lines — rejected: neither shows where orders stall
  - S11-V2 statement lines, S11-V3 totals over every order — rejected: harder for non-accountants, or unreadable in a busy month
  - S12-V2 role cards — rejected: moving a person takes two actions
  - S10-V2, S11-V1, S12-V1 (agent's recommendation) — chosen
- Choice · Why: for operations users who need bottlenecks, a balancing month and safe access changes, we chose a funnel, the same balance equation as the order breakdown, and a people list with required reasons, over denser tables, so each screen answers its user's first question, accepting that itemized orders live in the export.
- Cost accepted: the funnel looks jumpy with few orders. · Reversibility: Type 2 · Confidence: high
- Revisit if: finance asks for itemized orders on screen. · Evidence: docs/design/screens.md S10-S12 Variants · Interview line: "The ops dashboard is a funnel because the bottleneck is literally the step where the count drops."

### D31 UX contract extended to M6: 14 screens, demo covers every key screen  [status: accepted]
- 2026-10-09 22:33 CDT · map-ux-flows (G-ux) · M3 · Decided by: human, G-ux 2026-10-09 22:33 CDT: "approve, then /design-hld" · Proposed by: map-ux-flows (Claude Code, claude-opus-5-5) · artifact: docs/design/screens.md@675f650
- Context and forces: M6 stories US-6, US-9, US-10 added operations screens (S10-S14); the 90-second demo must show every key screen.
- Options:
  - Do nothing — rejected: M6 acceptance needs G-ux
  - Keep the provider dashboard beat and a 2-minute demo — rejected: breaks the 1:30 limit
  - Nine beats in 1:30 covering all six key screens (agent's proposal) — chosen
- Choice · Why: for a demo that must show both the money path and the operations side, we chose nine short beats over a longer video, accepting a tight pace that the demo script may split later.
- Cost accepted: about 7 seconds per operations beat. · Reversibility: Type 2 · Confidence: medium
- Revisit if: the demo script cannot fit the beats. · Evidence: docs/design/screens.md Demo layout · Interview line: "Every screen has six designed states, and the demo walks the money from the provider's click to the finance lead's balanced report."

### D32 Application language: TypeScript on Node.js with server-rendered Vue  [status: accepted]
- 2026-10-09 22:45 CDT · design-hld (G2) · M3 · Decided by: human, G2 2026-10-09 22:45 CDT: "approve" · Proposed by: design-hld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/hld.md D32 @a5bc4ea
- Context and forces: no stack mandated (C-1, REQ-14); Cerbo's portal is TypeScript/JavaScript with Vue (R01) and its paired interview is in TypeScript/JavaScript (R07); money must stay whole cents (AGENTS.md:57).
- Options:
  - Do nothing / simplest: clickable mock-up with no server — rejected: no money handling to grade
  - TypeScript on Node.js with server-rendered Vue (agent's recommendation) — chosen
  - PHP with Laravel — rejected: the human set the earlier build aside (D22); a second language from the portal's
  - Java with Spring — rejected: heaviest setup for the appetite
- Choice · Why: In the context of a 1-2 day slice for a partner whose portal runs TypeScript and Vue and who pair-programs in TypeScript, facing the need to show money integrity live, we choose TypeScript on Node.js with server-rendered Vue over Laravel or Spring to get one language the interviewers read and write, accepting that cents must be kept as whole numbers by discipline and tests.
- Cost accepted: TypeScript numbers are floats, so whole cents rely on tests plus database checks (INV-1, INV-3). · Reversibility: Type 1 · Confidence: med
- Revisit if: the partner says the work would land in their PHP back end. · Evidence: R01, R07; hld.md §9 D32 · Interview line: "I picked TypeScript and Vue because that's Cerbo's portal stack and the language of their paired interview, and I kept every amount in whole cents because TypeScript numbers are floats."

### D33 Database: PostgreSQL managed by the host  [status: accepted]
- 2026-10-09 22:58 CDT · design-hld (G2) · M3 · Decided by: human, G2 2026-10-09 22:58 CDT: "approve" · Proposed by: design-hld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/hld.md D33 @a5bc4ea
- Context and forces: INV-1 to INV-5 must hold whatever code path runs; NFR-013 3-year retention; Cerbo runs MySQL and Postgres (R01); host Railway.
- Options:
  - Do nothing / simplest: SQLite file inside the app — rejected: one machine's file breaks on restart or a second instance
  - PostgreSQL managed by the host (agent's recommendation) — chosen
  - MySQL managed by the host — rejected: weaker cross-check support for INV-1
- Choice · Why: In the context of a money system that must refuse a split that doesn't add up, facing invariants that must hold whatever code path runs, we choose managed PostgreSQL over SQLite or MySQL to get database-enforced checks and permissions, accepting a second container to run and back up.
- Cost accepted: about $7 a month and a backup to confirm (Q-1). · Reversibility: Type 1 · Confidence: high
- Revisit if: the partner wants the slice on their MySQL. · Evidence: R01; hld.md §7, §9 D33 · Interview line: "The database itself refuses a paid order whose parts don't add up, so no bug in the app can write bad money."

### D34 One app: pages and logic deploy together  [status: superseded-by D36]
- 2026-10-09 23:00 CDT · design-hld (G2) · M3 · Decided by: human, G2 2026-10-09 23:00 CDT: "approve" · Proposed by: design-hld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/hld.md D34 @a5bc4ea
- Context and forces: peak 31 req/s (R13), NFR-001 2 s p95, $20 a month ceiling, 1-2 day appetite.
- Options:
  - Do nothing / simplest: one app that renders pages and holds the logic (agent's recommendation) — chosen
  - Separate single-page front end and API — rejected: two containers, cross-origin sessions, double deploy and security work
  - Separate services per area — rejected: nothing in §8 needs it
- Choice · Why: In the context of 31 requests a second at peak and a $20 ceiling, facing a 1-2 day appetite, we choose one app over a split front end and API to get one deploy and one security perimeter, accepting that the front end can't ship separately.
- Cost accepted: no independent front-end releases. · Reversibility: Type 2 · Confidence: high
- Revisit if: a mobile app or partner integration needs the API on its own. · Evidence: hld.md §8, §9 D34 · Interview line: "At 31 requests a second, splitting into services would add failure points without solving any problem I have."

### D35 Money recording: split on the paid order plus an append-only ledger  [status: accepted]
- 2026-10-09 23:04 CDT · design-hld (G2) · M3 · Decided by: human, G2 2026-10-09 23:04 CDT: "D35, B is approved" · Proposed by: design-hld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/hld.md D35 @a5bc4ea
- Context and forces: FR-010 to FR-015, FR-060 to FR-065, NFR-013, NFR-014; R14 (providers report money as summed categories); refunds and corrections later (NG-7).
- Options:
  - Do nothing / simplest: split amounts on the paid order only — rejected: reports re-add every order; corrections would edit money in place
  - Split on the order plus an append-only ledger of payment, item cost, payout and fee (agent's recommendation) — chosen
  - Full double-entry bookkeeping — rejected: more concepts than the slice needs
- Choice · Why: In the context of a split that must be auditable to the cent and a finance lead who closes periods, facing future refunds and corrections, we choose an append-only ledger beside the order's split over split-only or full double-entry to get reports that sum categories the way payment providers report them, accepting four extra records per order.
- Cost accepted: about 2 GB a year more at first-year scale; order and ledger must agree (INV-1, INV-9). · Reversibility: Type 1 · Confidence: med
- Revisit if: finance asks for double-entry accounts or a refund flow is built. · Evidence: R14 F1, F2, F4; hld.md §9 D35 · Interview line: "The order shows the split; the ledger proves it, and corrections are new lines, never edits."

### D36 One deployable, built API-first  [status: accepted]
- 2026-10-09 23:14 CDT · design-hld (G2, revision) · M3 · Decided by: human, G2 2026-10-09 23:14 CDT: "approved" (after "c, then /design-hld") · Proposed by: design-hld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/hld.md D34 @fea2e18 · ids differ: hld.md D34 = journal D36; supersedes D34
- Context and forces: the feature will live inside Cerbo's Vue portal (R01); Cerbo's front-end and back-end teams are separate; HIPAA-ready access and an activity review (R15 F2, NFR-014); 31 req/s; $20 ceiling; 1-2 day appetite.
- Options:
  - Do nothing / simplest: one app, server-rendered pages reading the database directly (first approved as D34) — revised by the human after comparing it with a split front end and API
  - One deployable, API-first: the Vue front end reads and acts only through our own JSON API on the same web address — chosen
  - Separate single-page front end and API, two deploys — rejected: two pipelines, token sign-in, cross-origin rules, patient data in the browser
  - Separate services per area — rejected: nothing needs it
- Choice · Why: In the context of an EHR add-on that will one day live inside Cerbo's Vue portal, built by a small team for 31 requests a second under a $20 ceiling, facing HIPAA-ready access rules and an activity review, we choose one deployable built API-first over server-rendered pages alone or a split front end and API to get today's small attack surface and single deploy together with an API Cerbo can embed later, accepting a thin API layer whose shape we must keep stable.
- Cost accepted: about half a day more; the API shape becomes a contract. · Reversibility: Type 2 · Confidence: high
- Revisit if: Cerbo's front-end team takes over the screens, or a second client needs the API. · Evidence: R01, R15; hld.md §9 D34 · Interview line: "I kept one deployable for security and ops simplicity, but built it API-first, because inside an EHR the feature eventually becomes their screens calling our API."

### D37 Sign-in: seeded test accounts with server-side sessions  [status: accepted]
- 2026-10-09 23:14 CDT · design-hld (G2) · M3 · Decided by: human, G2 2026-10-09 23:14 CDT: "approve" · Proposed by: design-hld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/hld.md D36 @fea2e18 · ids differ: hld.md D36 = journal D37
- Context and forces: FR-039 to FR-041, NFR-007, NFR-008, C-3 (sign-in is a stand-in), A-12; every API call checks the signed-in role (D36).
- Options:
  - Do nothing / simplest: a "choose who you are" picker — rejected: anyone can be anyone; breaks NFR-007
  - Email and password for seeded test accounts, server-side sessions, 15-minute idle limit (agent's recommendation) — chosen
  - An outside identity provider — rejected: outside account and cost beyond the stand-in rule
- Choice · Why: In the context of a stand-in sign-in that must still be personal and time out, facing a demo that switches between nine fictional people, we choose seeded test accounts with server-side sessions over a picker or an outside provider to get real per-person access rules at no cost, accepting no two-factor sign-in in the slice.
- Cost accepted: no two-factor and no password reset. · Reversibility: Type 2 · Confidence: high
- Revisit if: the slice moves toward real users. · Evidence: hld.md §9 D36, §10 Authentication · Interview line: "Sign-in is a stand-in, but every person still has their own account and session, because the access rules are what I'm proving."

### D38 Web framework: Nuxt 3  [status: superseded-by D44]
- 2026-10-10 09:52 CDT · design-lld (G3) · M3 · Decided by: human, G3 2026-10-10 09:52 CDT: "approve" · Proposed by: design-lld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/lld.md D38 @9af3b07
- Context and forces: D32 (TypeScript, server-rendered Vue), D36 (one deployable, API-first), NFR-001, appetite 1-2 days; Cerbo's front end is Vue (R01).
- Options:
  - Do nothing / simplest: plain Node with Vue's server renderer wired by hand — rejected: about 2 days of routing, rendering, hydration and build glue
  - Nuxt 3 (agent's recommendation) — chosen
  - Express API plus Vue with Vite server rendering — rejected: two halves to glue, about a day more
- Choice · Why: In the context of one deployable that must serve server-rendered Vue pages and a same-origin JSON API, facing a 1-2 day appetite, we choose Nuxt 3 over a hand-wired server or Express plus Vite to get pages and API routes in one app with no glue, accepting Nuxt's conventions.
- Cost accepted: Nuxt and Nitro conventions. · Reversibility: Type 1 · Confidence: high
- Revisit if: Cerbo wants the API in another back end. · Evidence: lld.md Decisions D38, §2 Layering · Interview line: "Nuxt gave me server-rendered Vue and the JSON API in one process, which is the one-deployable, API-first shape I chose."

### D39 Database access: Kysely with plain SQL migrations  [status: accepted]
- 2026-10-10 09:56 CDT · design-lld (G3) · M3 · Decided by: human, G3 2026-10-10 09:56 CDT: "approve" · Proposed by: design-lld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/lld.md D39 @9af3b07
- Context and forces: INV-1 to INV-5 and LINV-1 to LINV-6 rely on partial unique indexes, deferred constraint triggers, insert-only grants and composite foreign keys; D33 (PostgreSQL); AGENTS.md:57.
- Options:
  - Do nothing / simplest: pg driver with raw SQL strings — rejected: queries not type-checked
  - Kysely plus plain SQL migration files (agent's recommendation) — chosen
  - Prisma ORM — rejected: needs raw-SQL escapes for the very features the money rules use, and hides transaction boundaries
- Choice · Why: In the context of a design whose money rules live in PostgreSQL constraints, triggers and grants, facing the need to also type-check queries in TypeScript, we choose Kysely with SQL migrations over raw strings or Prisma to get typed queries without hiding the database features we rely on, accepting a type-regeneration step after each migration.
- Cost accepted: regenerate types after each migration. · Reversibility: Type 2 · Confidence: med
- Revisit if: the team standardises on another data layer. · Evidence: lld.md Decisions D39, §1, §7 · Interview line: "The money rules are database constraints, so I kept the migrations in plain SQL and used a typed query builder rather than an ORM that would hide them."

### D40 Primary keys: bigint identity, order number = id, random tokens for outside links  [status: accepted]
- 2026-10-10 09:58 CDT · design-lld (G3) · M3 · Decided by: human, G3 2026-10-10 09:58 CDT: "approved" · Proposed by: design-lld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/lld.md D40 @9af3b07
- Context and forces: screens show "Order 1042" (S3, S4, S11); FR-009 (guessing must reveal nothing); every read is access-checked (INV-7, HLD TH-4); the notice link is the only link that leaves the system (FR-044).
- Options:
  - Do nothing / simplest: bigint identity ids, order number = id from 1001, random 32-byte tokens only for notice links (agent's recommendation) — chosen
  - UUID v7 ids everywhere plus a separate readable number — rejected: two identifiers and larger indexes for no safety gain
- Choice · Why: In the context of a small system where every read is access-checked and staff talk about "Order 1042", facing the risk of guessable ids, we choose bigint identity ids with random tokens for outside links over UUIDs everywhere to get readable numbers and small indexes, accepting that ids reveal volume to people who can already see orders.
- Cost accepted: ids reveal order volume to authorised viewers. · Reversibility: Type 1 · Confidence: high
- Revisit if: ids ever appear in links that skip the access check. · Evidence: lld.md Decisions D40, §1 `orders`, `notices` · Interview line: "Guessing an order number gets you 'not found', because every read is checked; the only link that leaves the system carries an unguessable token."

### D41 Idempotency: one shared idempotency_keys table plus database backstops  [status: accepted]
- 2026-10-10 09:59 CDT · design-lld (G3) · M3 · Decided by: human, G3 2026-10-10 09:59 CDT: "approve, but also explain to me this solution over using a mesage broker like rabbitmq" · Proposed by: design-lld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/lld.md D41 @9af3b07
- Context and forces: FR-008; HLD §10 Idempotency; INV-2; five repeatable mutations EP-19, EP-23, EP-28, EP-32, EP-37.
- Options:
  - Do nothing / simplest: disable the button after one press — rejected: retries and second tabs still send twice
  - One idempotency_keys table plus natural backstops (agent's recommendation) — chosen
  - Natural unique key per operation only — rejected: retries get errors instead of the first answer; rules differ per endpoint
  - Message broker (raised by the human at the gate) — not an option for this problem: a broker delivers messages at least once, so consumers still need idempotency keys; the payment is synchronous; adding one is an HLD container change
- Choice · Why: In the context of five mutations that patients and staff can repeat, facing double presses and network retries on a payment, we choose one stored-key table plus database backstops over button-disabling or per-endpoint keys to get identical replay behaviour everywhere and no double charge, accepting a small table with a 24-hour life.
- Cost accepted: one more table; expired rows purged on write (LLD Q-5). · Reversibility: Type 2 · Confidence: high
- Revisit if: a mutation needs a key that lives longer than 24 hours, or a broker is added for outbound work (keys stay). · Evidence: lld.md Decisions D41, §4 Idempotency, BE-5, SM-3 · Interview line: "Every mutation carries an Idempotency-Key, and behind it the database still allows only one successful payment per order."

### D42 Payment timing: synchronous charge with short transactions on either side; hybrid with webhooks as the production path  [status: accepted]
- 2026-10-10 10:49 CDT · design-lld (G3, revise) · M3 · Decided by: human, G3 2026-10-10 10:49 CDT: "approve" (after "a, add D42") · Proposed by: design-lld (Claude Code, claude-opus-5-5) · artifact: proposed as docs/architecture/lld.md D42 @6733116
- Context and forces: FR-006, FR-035, S2 Loading state, NFR-001, INV-2, INV-5, HLD L-3; tolerance by persona (patients forgive seconds but not uncertainty about money; providers forgive no lag; finance forgives slow reports); the human asked at G3 for sync vs async, lock-up risk, broker comparison and broader holistic-care load to be weighed.
- Options:
  - Do nothing / simplest: A, one transaction holding locks across the provider call — rejected: lock-ups, pool exhaustion, charge without a record on commit failure
  - B, synchronous with short transactions around the call (implied by PRD, UX and HLD L-3; agent's recommendation) — chosen for the slice
  - C, fully asynchronous queue and worker — rejected: patient left uncertain; new container; still needs idempotency keys
  - D, hybrid with a pending state and webhooks — chosen as the production path, not built now
- Choice · Why: In the context of a patient who must know on the spot whether they paid and a stub provider that never answers ambiguously, facing the risk of database lock-ups from slow providers, we choose a synchronous charge with short transactions on either side over holding locks across the call, a fully queued payment, or a hybrid built now, to get a definite answer without lock contention or new infrastructure, accepting crash-recovery logic between the steps and a planned move to the hybrid when a real provider arrives.
- Cost accepted: FM-7 reconcile logic; ambiguous timeouts once a real provider exists. · Reversibility: Type 2 · Confidence: high
- Revisit if: a real payment provider, recurring charges or refills, third-party fulfillment (pharmacy, gym), insurance claims, or more than about 100 payments a second for one product. · Evidence: lld.md D42, SEQ-2, BE-10, FM-2, FM-7; R05 · Interview line: "Locks live for milliseconds on either side of the card call, never across it; the patient waits for a definite answer because uncertainty about money is the one thing they won't forgive, and in production I'd add a pending state settled by the provider's webhook."

### D43 Broader holistic-care products parked as a future non-goal (NG-12)  [status: accepted]
- 2026-10-10 10:58 CDT · clarify-spec (3b) · M2 · Decided by: human, clarify-spec CQ-3 2026-10-10 10:58 CDT: "A, non goals, can revisit later, and marked as was considered for the future of the product" · Proposed by: clarify-spec (Claude Code, claude-opus-5-5) · artifact: docs/product/prd.md@998ed94 NG-12
- Context and forces: the human raised prescriptions, medical supplies, gym memberships and other holistic-care services at G3; lld.md D42 and Q-7 showed they need product types, a payee per order line, work with no patient present (recurring charges, claims, partner updates) and, for prescriptions, regulation the slice rules out (NG-3, NG-10).
- Options:
  - Do nothing: leave lld.md Q-7 open — not chosen
  - A: park as a non-goal with "revisit later" and a Later-row line (agent's recommendation) — chosen
  - B: add a P3 user story now — rejected: invites design before anyone is ready
  - C: do not record — rejected: the thinking would not be visible in the PRD
- Choice · Why: In the context of a supplement-only slice whose design (D35 ledger, D41 keys, D42 payment timing) already anticipates broader care, facing the risk of scope creep, we choose to park holistic-care products as a recorded future non-goal over writing stories now or not recording them, to keep the slice small while showing the product's direction, accepting that a later milestone must revisit product types and multi-payee orders.
- Cost accepted: none now; a future PRD and design pass. · Reversibility: Type 2 · Confidence: high
- Revisit if: a milestone takes on prescriptions, services or recurring charges (lld.md D42 triggers). · Evidence: prd.md NG-12, ## Clarifications Pass 1 CQ-3; lld.md D42, Q-7 · Interview line: "I parked prescriptions and services on purpose: they need multiple payees and background billing, and the ledger and idempotency design already leave room for them."

### D44 Web framework: Nuxt 4 (supersedes D38's Nuxt 3)  [status: accepted]
- 2026-10-10 11:30 CDT · design-lld (G3, revise) · M3 · Decided by: human, G3 Revise 2026-10-10 11:30 CDT: "a" · Proposed by: supervisor at toolchain bootstrap (Claude Code, claude-opus-5-5) · artifact: docs/architecture/lld.md D38 (revised) · ids differ: lld.md D38 = journal D44; supersedes D38
- Context and forces: D38 approved "Nuxt 3", written from model memory; the npm registry check at bootstrap (2026-10-10) showed Nuxt 4 is the current major (4.6.1) and Nuxt 3 the previous major (3.21.11, still patched). The design (route handlers, page guards, file routes, per-page fetch) is the same on both.
- Options:
  - Do nothing: setup waits — rejected
  - Keep Nuxt 3.21.11 as approved — rejected: starts greenfield work on the previous major, so an upgrade is likely within the project's life
  - Revise to Nuxt 4 (agent's recommendation) — chosen
- Choice · Why: In the context of a greenfield build on a framework whose current major is 4, facing an approved decision written from out-of-date memory, we choose Nuxt 4 over the approved Nuxt 3 to avoid upgrade debt on day one, accepting a Node 22.22+ engine floor.
- Cost accepted: Node 22.22+ (local Node 26; Railway pins a supported version). · Reversibility: Type 1 · Confidence: high
- Revisit if: a Nuxt 4 feature the design needs is missing. · Evidence: npm registry (nuxt dist-tags and release times, 2026-10-10); lld.md D38 · Interview line: "The AI suggested Nuxt 3 from memory; checking the registry before installing showed 4 was current, so I revised the decision before writing a line of code."

### D45 Build M4 as 9 vertical slices, tracer first  [status: accepted]
- Date 2026-10-10 12:06 CDT · phase 8 slice-tasks · milestone M4 · Decided by: human, G4 (option a: 9 vertical slices, tracer bullet first, T006 and T007 parallel, all claude; Q-5 to Q-9 take the recommendations in the STOP) 2026-10-10 12:06 CDT: "approve a, yes to vue-tsc, then go M4" · Proposed by: slice-tasks (Claude Code, claude-opus-5-5) · artifact: specs/M4-tracer-bullet/tasks@538db57
- Context and forces: M4 has 29 FRs and 43 red acceptance tests to turn green. Small, checkable tasks with disjoint file ownership are easy to verify, but the send handler and BE-9 OrderService are shared by five slices, which forces most tasks to run one after another (FR-001 to FR-068 in scope; INV-1 to INV-7).
- Options:
  - Do nothing / simplest (shown as "d) Do nothing"): build M4 in one session without task files — cost: fastest start; no scope-guard or per-step pass/fail check — rejected: "done" rests on one long self-report
  - a) 9 vertical slices, tracer bullet first, T006 and T007 in parallel (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: 770 min agent time, 1 seam task, one merge for the parallel pair — chosen
  - b) Same tasks, all serial on Claude — cost: about 90 min more wall-clock — rejected: little gain, since only one pair can run in parallel anyway
  - c) Fewer, bigger tasks — cost: larger diffs, harder to verify, a failure throws away more work — rejected: harder to verify
- Choice: a) · Why: In the context of a greenfield payment slice with 43 acceptance tests, facing shared order code that limits parallel work, we chose 9 vertical slices with a tracer bullet first over all-serial, bigger tasks or no tasks to get early end-to-end proof and a pass/fail check per task, accepting 770 minutes of agent time and mostly serial waves.
- Cost accepted: most tasks run one at a time; one seam task (T009) and one parallel merge. · Reversibility: Type 2 two-way — task files can be re-sliced at a G4 Revise before each dispatch · Confidence: med
- Revisit if: M4-T001 ends in relaunch or overruns its 120-minute budget (split off the notice). · Evidence: specs/M4-tracer-bullet/tasks/T001.md to T009.md; slice-tasks analyze RESULT: PASS; approval G4 (option a: 9 vertical slices, tracer bullet first, T006 and T007 parallel, all claude; Q-5 to Q-9 take the recommendations in the STOP) 2026-10-10 12:06 CDT · Interview line: "I sliced by user-visible behaviour, fired a tracer bullet through every layer first, and put payments right after it so the riskiest work failed early."

### D46 Type-check app code in make check  [status: accepted]
- Date 2026-10-10 12:06 CDT · phase 8 slice-tasks · milestone M4 · Decided by: human, Ask-first: add devDependency vue-tsc (pinned) and set Makefile types to npx nuxi typecheck (human-only Makefile edit, done by supervisor on this yes) 2026-10-10 12:06 CDT: "approve a, yes to vue-tsc, then go M4" · Proposed by: slice-tasks (Claude Code, claude-opus-5-5) · artifact: specs/M4-tracer-bullet/tasks@538db57
- Context and forces: make check's types step was a no-op, so implementers' TypeScript and Vue code would not be type-checked; a type error would surface only if an acceptance test happened to hit it. Adding a checker means a new devDependency, which is Ask-first.
- Options:
  - Do nothing / simplest: keep types as a no-op — cost: none now — rejected: type errors slip through every task's gate
  - Add vue-tsc (pinned) and run npx nuxi typecheck in make check (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: one devDependency, a root tsconfig.json, about a minute per make check — chosen
- Choice: vue-tsc 3.3.11 with nuxi typecheck · Why: In the context of AI workers whose only gate is make check, facing untyped app code passing that gate, we chose a pinned vue-tsc type check over no type check to catch type errors in every task, accepting one devDependency and a slower make check.
- Cost accepted: one more devDependency to keep current; make check takes longer. · Reversibility: Type 2 two-way — remove the recipe and the package · Confidence: high
- Revisit if: nuxi typecheck makes make check too slow for the build loop, or Nuxt ships a built-in checker. · Evidence: Makefile types recipe; package.json devDependencies vue-tsc 3.3.11 (published 2026-08-21); commit 354033d; approval Ask-first: add devDependency vue-tsc (pinned) and set Makefile types to npx nuxi typecheck (human-only Makefile edit, done by supervisor on this yes) 2026-10-10 12:06 CDT · Interview line: "The gate claimed to check types but did nothing, so I added a pinned vue-tsc check before any app code existed."

### D47 Negative payout at payment goes to review  [status: accepted]
- Date 2026-10-10 13:01 CDT · phase 9 implement-task review · milestone M4 · Decided by: human, R2 decision (review M4-pass2): a negative payout at payment time moves the order to needs_review before charging (option A) 2026-10-10 13:01 CDT: "a, then start T003" · Proposed by: implement-task M4-T002 (Claude Code, claude-opus-5-5), surfaced by verifier pass 2 R2 · artifact: server/services/payments.ts@eb3f87d
- Context and forces: FR-004 refuses a negative payout at send using the cost at that moment, but cost is recorded again at payment (FR-036), so a cost rise between send and pay can make the payout negative. INV-6 (ck_orders_payout_nonneg) refuses to store it, so the code must act before charging; no approved artifact said how (FR-004, FR-036, FR-034, INV-6, SM-1).
- Options:
  - Do nothing / simplest: keep the behaviour unrecorded — cost: none now — rejected: design, code and tests disagree and the choice can't be defended
  - A) Move the order to needs_review before charging and record it (agent's recommendation) (agent's first proposal) — cost: SM-1 guard update in lld.md and one acceptance test; that order can't be paid until corrections exist (Later) — chosen
  - B) Refuse the payment with a problem and leave the order in checkout — cost: order stuck until the 30-minute hold expires (FR-067 blocks cancel), new S2 copy, more design change — rejected: more change, worse stuck state
  - C) Charge and let the platform absorb the shortfall (FR-034) — cost: new ledger category and loosening INV-6 — rejected: money-model change belonging to Later campaigns
  - D) Lock unit cost at send like the price — cost: FR-036 change, G1 re-approval, new column — rejected: cleanest long term but out of M4
- Choice: A · Why: In the context of a cost that can rise between send and pay, facing a database that refuses negative payouts, we chose to send the order to needs_review before charging over refusing, absorbing or locking cost, to never take money we can't record, accepting that the patient can't pay that order until a correction tool exists.
- Cost accepted: rare frozen orders until corrections (Later); an LLD SM-1 catch-up and one acceptance test after M4. · Reversibility: Type 2 two-way — one branch in BE-10.pay; D (cost locked at send) can replace it later · Confidence: med
- Revisit if: needs_review orders from negative payouts appear in production, or M6 adds cost editing. · Evidence: server/services/payments.ts:82; lld.md SM-1 needs_review row; hld.md INV-6; prd.md FR-034; .handoff/reviews/M4-pass2.md R2; approval R2 decision (review M4-pass2): a negative payout at payment time moves the order to needs_review before charging (option A) 2026-10-10 13:01 CDT · Interview line: "When a cost rise made a payout negative after send, we held the order for review before charging rather than take money our ledger couldn't record."

### D48 Merge stacked milestones M1 to M4 in order  [status: accepted]
- Date 2026-10-10 15:39 CDT · phase 12 report-milestone · milestone M4 · Decided by: human, report-milestone DV-1: M4 stays stacked on milestone/m1-research; merge M1, M2, M3, M4 to main in order, one MR each (option a) 2026-10-10 15:39 CDT: "a, stack and merge M1 to M4 in order" · Proposed by: report-milestone (Claude Code, claude-opus-5-5) · artifact: milestone/m4-tracer-bullet@ec96fdf
- Context and forces: milestone/m4-tracer-bullet was cut from the unmerged milestone/m1-research, so it carries M1 to M3 (research, PRD, HLD/LLD, toolchain) and the v1 removal: 160 commits that are not M4's. AGENTS.md "Git" asks for one branch and one MR per milestone, and G5 clause 4 asks for a one-revert rollback per milestone.
- Options:
  - Do nothing / simplest (shown as "c) don't know"): leave it unrecorded — cost: G5 leans to Revise — rejected: the merge path stays undecided
  - a) Keep the stack; merge M1, M2, M3, M4 to main in order, one MR each (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: four MRs and reviews, M4's MR shows only M4 once M1 to M3 are on main — chosen
  - b) One combined MR for M1 to M4 now — cost: one huge review; one revert undoes all four — rejected: breaks one-milestone-one-revert
- Choice: a · Why: In the context of four milestones built on one unmerged branch stack, facing a rule of one MR and one revert per milestone, we chose to merge M1 to M4 in order over one combined MR to keep each milestone reviewable and revertible on its own, accepting four MRs and that M4 waits for M1 to M3.
- Cost accepted: M4 cannot merge before M1, M2 and M3 are on main; four reviews instead of one. · Reversibility: Type 2 two-way — merge order can change before any MR merges · Confidence: high
- Revisit if: an M1 to M3 MR needs rework that conflicts with M4 code. · Evidence: docs/milestones/M4.md DV-1; AGENTS.md "Git"; approval report-milestone DV-1: M4 stays stacked on milestone/m1-research; merge M1, M2, M3, M4 to main in order, one MR each (option a) 2026-10-10 15:39 CDT · Interview line: "Later milestones were stacked on unmerged planning branches, so we merge them to main in order, one MR each, keeping every milestone reviewable and revertible on its own."

### D49 Accept node-forge advisory in Nuxt dev tooling  [status: accepted]
- Date 2026-10-10 15:48 CDT · phase 12 check-security (G5) · milestone M4 · Decided by: human, G5 SEC-2 2026-10-10 15:48 CDT: "Approve, accept SEC-2" · Proposed by: check-security (Claude Code, claude-opus-5-5) · artifact: docs/security/CHECKLIST.md@239c922
- Context and forces: npm audit reports node-forge (GHSA-86w9-cpqp-85rv, high: forged RSA PKCS#1 v1.5 signatures accepted), pulled in by listhen, the Nuxt development server. The app verifies no signatures, and a build check (npx nuxi build, Log 2026-10-10 15:48 CDT VERIFY SEC-1 Q1) shows node-forge is absent from .output/server; npm's only offered fix is a downgrade to Nuxt 3.7.4 (against D44).
- Options:
  - Do nothing / simplest (shown as "default: pending G5"): leave it undecided — cost: the milestone cannot merge — rejected: blocks G5 with no benefit
  - fix: upgrade once a Nuxt release ships a patched dev server — cost: none available today; npm's downgrade undoes D44 — rejected: no fix exists that keeps D44
  - accept, revisit on a trigger (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: a high advisory stays in the developer toolchain — chosen
  - investigate — cost: about 10 minutes — rejected: already done for SEC-1 (node-forge not in the built server)
- Choice: accept · Why: In the context of a high advisory in the Nuxt development server, facing no upstream fix that keeps Nuxt 4, we chose to accept it over a downgrade or waiting, because the vulnerable code is not in the shipped server, accepting that developer machines keep it until Nuxt updates.
- Cost accepted: the advisory stays in package-lock.json and in local dev servers until Nuxt ships a patched dependency. · Reversibility: Type 2 two-way — upgrade when a patched release exists · Confidence: high
- Revisit if: node-forge appears in .output/server, the app starts verifying signatures (for example real payment webhooks), or a Nuxt 4 release removes the advisory. · Evidence: docs/security/CHECKLIST.md SEC-2; npm audit CMD-16; .handoff/TRACKER.md Log SEC-1 Q1 build check; approval G5 SEC-2 2026-10-10 15:48 CDT · Interview line: "The advisory was in the dev server only; a build check proved it never ships, so we accepted it with a trigger tied to adding signature checks."

### D50 Accept braces advisory in build tooling  [status: accepted]
- Date 2026-10-10 15:49 CDT · phase 12 check-security (G5) · milestone M4 · Decided by: human, G5 SEC-3 2026-10-10 15:49 CDT: "Approve, accept SEC-3" · Proposed by: check-security (Claude Code, claude-opus-5-5) · artifact: docs/security/CHECKLIST.md@239c922
- Context and forces: npm audit reports braces (GHSA-vfj7-8cjw-p6xm, high: stack-exhaustion denial of service on crafted glob patterns), pulled in by micromatch, fast-glob and globby under Nuxt build tooling and kysely-codegen. The app never passes user input to glob matching, and the build check shows braces and micromatch absent from .output/server; npm's only offered fix downgrades kysely-codegen to 0.6.1.
- Options:
  - Do nothing / simplest (shown as "default: pending G5"): leave it undecided — cost: the milestone cannot merge — rejected: blocks G5 with no benefit
  - fix: upgrade once patched releases exist — cost: none available today; the kysely-codegen downgrade leaves the Nuxt path open — rejected: no real fix exists
  - accept, revisit on a trigger (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: a high advisory stays in the build toolchain — chosen
  - investigate — cost: about 10 minutes — rejected: already done (braces not in the built server)
- Choice: accept · Why: In the context of a denial-of-service advisory in build-time glob matching, facing no upstream fix, we chose to accept it over a downgrade, because only our own build controls the patterns and the code never ships, accepting that build machines keep it until upstream updates.
- Cost accepted: the advisory stays in package-lock.json and in build and codegen runs. · Reversibility: Type 2 two-way — upgrade when patched · Confidence: high
- Revisit if: braces appears in .output/server, the app matches file patterns from user input, or patched Nuxt and kysely-codegen releases exist. · Evidence: docs/security/CHECKLIST.md SEC-3; npm audit CMD-16; .handoff/TRACKER.md Log SEC-1 Q1 build check; approval G5 SEC-3 2026-10-10 15:49 CDT · Interview line: "The DoS advisory lived in build-time glob matching that only our build controls, and it never ships, so we accepted it with a trigger."

### D51 Accept simple-git advisory in Nuxt devtools  [status: accepted]
- Date 2026-10-10 15:50 CDT · phase 12 check-security (G5) · milestone M4 · Decided by: human, G5 SEC-1 2026-10-10 15:50 CDT: "Approve, accept SEC-1" · Proposed by: check-security (Claude Code, claude-opus-5-5) · artifact: docs/security/CHECKLIST.md@239c922
- Context and forces: npm audit reports simple-git and @simple-git/argv-parser (GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5, GHSA-v5rq-49vh-5v5c, critical: git command execution past the unsafe-operation guard), pulled in by @nuxt/devtools. Devtools are off (nuxt.config.ts:4), the app never runs git, and the build check shows simple-git absent from .output/server; npm's only offered fix is a downgrade to Nuxt 3.7.4 (against D44). The human first chose investigate (G5 SEC-1, "Approve, investigate SEC-1"), and this decision closes it.
- Options:
  - Do nothing / simplest (shown as "default: stays investigate"): leave SEC-1 open — cost: the milestone cannot merge — rejected: the investigation already answered the question
  - fix: upgrade once Nuxt devtools ship simple-git 4.0.2 or later — cost: no release confirmed; the downgrade undoes D44 — rejected: no fix exists that keeps D44
  - accept, revisit on a trigger (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: a critical advisory stays in the developer toolchain — chosen
- Choice: accept · Why: In the context of a critical advisory in Nuxt devtools, facing no upstream fix that keeps Nuxt 4, we chose to accept it over a downgrade, because devtools are off and the code is not in the shipped server, accepting that developer machines keep it until Nuxt updates.
- Cost accepted: the advisory stays in package-lock.json and on developer machines. · Reversibility: Type 2 two-way — upgrade when patched · Confidence: high
- Revisit if: simple-git appears in .output/server, devtools are switched on, or a Nuxt 4 release ships patched devtools. · Evidence: docs/security/CHECKLIST.md SEC-1, Q1; npm audit CMD-16; .handoff/TRACKER.md Log SEC-1 Q1 build check; approvals G5 SEC-1 (investigate, then accept) · Interview line: "A critical git-execution advisory sat in Nuxt's devtools; we proved by building that it never ships and devtools are off, then accepted it with a trigger."

### D52 Accept SameSite and JSON-only as the CSRF defence  [status: accepted]
- Date 2026-10-10 15:51 CDT · phase 12 check-security (G5) · milestone M4 · Decided by: human, G5 SEC-5 2026-10-10 15:51 CDT: "Approve, add T011 and run it" · Proposed by: check-security (Claude Code, claude-opus-5-5) · artifact: docs/security/CHECKLIST.md@239c922
- Context and forces: no anti-CSRF token or Origin check exists. Session cookies are SameSite=Lax (server/services/session.ts:180) and request bodies are JSON-only (server/utils/problem.ts:50), so a cross-site page cannot send an authenticated write today. An in-EHR iframe would need SameSite=None, which removes that protection.
- Options:
  - Do nothing / simplest (shown as "default: pending G5"): leave it undecided — cost: the milestone cannot merge — rejected: blocks G5
  - fix: add an anti-CSRF token or a strict Origin check on every write — cost: a token round trip in every page and API client now — rejected: no current attack path
  - accept, revisit on a trigger (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: relies on browser SameSite behaviour — chosen
- Choice: accept · Why: In the context of a first-party app with SameSite=Lax cookies and JSON-only bodies, facing no cross-site write path today, we chose to accept the missing CSRF token over adding one now, accepting that embedding in the EHR iframe will need a token first.
- Cost accepted: no defence in depth beyond SameSite and content type. · Reversibility: Type 2 two-way · Confidence: med
- Revisit if: the app is embedded in an iframe or the session cookie moves to SameSite=None, or a write endpoint accepts a non-JSON body. · Evidence: docs/security/CHECKLIST.md SEC-5, CK-06; approval G5 SEC-5 2026-10-10 15:51 CDT · Interview line: "CSRF is blocked by SameSite=Lax plus JSON-only bodies today; the trigger to add tokens is embedding the app in the EHR iframe."

### D53 Accept unbounded order quantity until stock limits  [status: accepted]
- Date 2026-10-10 15:51 CDT · phase 12 check-security (G5) · milestone M4 · Decided by: human, G5 SEC-10 2026-10-10 15:51 CDT: "Approve, add T011 and run it" · Proposed by: check-security (Claude Code, claude-opus-5-5) · artifact: docs/security/CHECKLIST.md@239c922
- Context and forces: order line quantity has no upper bound (server/api/orders/index.post.ts:13), so a huge quantity overflows the integer total and returns a 500 instead of a validation error. Stock limits (FR-025) arrive in M5 and will cap quantity naturally.
- Options:
  - Do nothing / simplest (shown as "default: pending G5"): leave it undecided — cost: the milestone cannot merge — rejected: blocks G5
  - fix: add an arbitrary maximum now — cost: a number with no design basis, replaced in M5 — rejected: invents a limit before the stock design
  - accept until M5 (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: a confusing 500 for absurd quantities — chosen
- Choice: accept · Why: In the context of a quantity rule that M5's stock limit will define, facing only a 500 on absurd input, we chose to accept it over inventing a cap now, accepting a poor error message until M5.
- Cost accepted: a 500 instead of a 422 for absurd quantities; no data harm (the database rejects the overflow). · Reversibility: Type 2 two-way · Confidence: high
- Revisit if: M5 adds stock limits (FR-025), or a real user hits the 500. · Evidence: docs/security/CHECKLIST.md SEC-10, CK-04; approval G5 SEC-10 2026-10-10 15:51 CDT · Interview line: "Quantity is uncapped until the stock rules land, which is safe because the database refuses the overflow; the only cost is an unhelpful error."

### D54 M4 keeps 11 tasks as a one-time exception  [status: accepted]
- Date 2026-10-10 15:55 CDT · phase 8 slice-tasks (G4 re-approval at G5) · milestone M4 · Decided by: human, G4 exception: M4 keeps 11 tasks (T011 security hardening) above the 10-task limit 2026-10-10 15:55 CDT: "a, keep T011 in M4 with an exception" · Proposed by: supervisor (Claude Code, claude-opus-5-5) · artifact: specs/M4-tracer-bullet/tasks@58fa3ee
- Context and forces: the slice-tasks analyze pass fails a milestone with more than 10 tasks, to keep it reviewable. M4-T011 was added at G5 to fix six security findings (SEC-4, SEC-6, SEC-7, SEC-8, SEC-9, SEC-11) in M4's own code, making 11 tasks; the supervisor dispatched it before the analyze pass ran (Log FAIL).
- Options:
  - Do nothing / simplest (shown as "d) Stop T011"): drop the fixes — cost: six findings stay open and M4 cannot pass G5 — rejected: blocks the milestone
  - a) Keep T011 in M4 with a recorded exception (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: one milestone above the 10-task limit — chosen
  - b) Move T011 to a new milestone M4.1 — cost: M4 merges with six open security findings or waits for M4.1, plus another report and gate — rejected: delays the security fixes for a counting rule
  - c) Merge T010 and T011 into one task file — cost: rewrites the record of a task already run and squashed — rejected: breaks the audit trail
- Choice: a · Why: In the context of security fixes found at G5 for M4's own code, facing the 10-task limit, we chose a one-time exception over a new milestone, to ship M4 with its hardening, accepting one milestone of 11 tasks.
- Cost accepted: M4 has 11 tasks; the analyze pass reports FAIL on the count for M4 only. · Reversibility: Type 2 two-way · Confidence: high
- Revisit if: a second milestone needs the same exception (then the kit's limit or how it counts close-out fix tasks should change, via route-failure). · Evidence: slice-tasks analyze output (11 tasks > 10); .handoff/TRACKER.md Log FAIL supervisor T011 dispatch; approval G4 exception: M4 keeps 11 tasks (T011 security hardening) above the 10-task limit 2026-10-10 15:55 CDT · Interview line: "Security fixes found at the merge gate belong to the milestone they fix, so we took a recorded one-time exception to the task limit rather than ship M4 without them."

### D55 Deploy the demo from the M4 branch before merging  [status: accepted]
- Date 2026-10-10 16:12 CDT · phase 13 ship-milestone (pre-merge demo) · milestone M4 · Decided by: human, demo release: deploy the demo from milestone/m4-tracer-bullet before the M1 to M4 merge chain (option a) 2026-10-10 16:12 CDT: "a, deploy the demo from the branch" · Proposed by: supervisor (Claude Code, claude-opus-5-5) · artifact: milestone/m4-tracer-bullet@a4b64b4
- Context and forces: the human wants the code out for a demo first, fixing only what is exploitable in the demo deployment (security triage rule, Approvals 2026-10-10 16:12 CDT). D48 requires M1, M2 and M3 to merge to main before M4, and none of them has a milestone report yet; deploying main would wait for three reports and four MRs. No critical or high finding is reachable in the demo (D49 to D51; build check). The demo needs TRUST_PROXY=1 so the sign-in and pay limits see real client addresses.
- Options:
  - Do nothing / simplest (shown as "c) Do nothing yet"): finish T011 review and G5 first — cost: no demo until the merge chain is done — rejected: the human wants the demo first
  - a) Deploy the demo from milestone/m4-tracer-bullet now; merge M1 to M4 to main afterwards (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: the demo runs unmerged code, and ship-milestone's merge-first checks are skipped for this deploy — chosen
  - b) Merge M1 to M4 to main first, then deploy main — cost: three more milestone reports and four MRs before the demo — rejected: hours of process before anyone sees the demo
- Choice: a · Why: In the context of a demo needed soon, facing a merge chain that blocks deploying main, we chose to deploy from the milestone branch over waiting for the merges, accepting that the demo runs reviewed but unmerged code.
- Cost accepted: the demo is not built from main; G5 and the D48 merges still follow before any real release. · Reversibility: Type 2 two-way — redeploy from main after the merges · Confidence: high
- Revisit if: the demo is used with anything but fictional data, or the app is embedded in Cerbo's EHR (then the embed risks, CSRF with SameSite=None and the launch-token check, must be fixed first). · Evidence: docs/milestones/M4.md; docs/security/CHECKLIST.md; D48; D49 to D54; approval demo release: deploy the demo from milestone/m4-tracer-bullet before the M1 to M4 merge chain (option a) 2026-10-10 16:12 CDT · Interview line: "We demoed from the reviewed milestone branch with fictional data and only the deploy config it needed, then ran the proper merge chain, because nothing reachable in the demo was high or critical."

### D56 Demo database runs PostgreSQL 18, not 16  [status: accepted]
- Date 2026-10-10 16:39 CDT · phase 13 ship-milestone (demo setup) · milestone M4 · Decided by: human, demo database version 2026-10-10 16:39 CDT: "done, keep 18" · Proposed by: supervisor (Claude Code, claude-opus-5-5) · artifact: docs/runbooks/deploy.md@29e27a2
- Context and forces: D33 chose PostgreSQL 16 and every acceptance test runs on 16 (docker-compose.yml). Railway's Postgres template created postgres-v2 on 18.6; its volume is initialised by 18 and cannot be downgraded, so 16 would mean deleting and recreating the database.
- Options:
  - Do nothing / simplest (shown as "default: stays on 18"): same as keeping 18 without a record — rejected: a deviation from D33 needs a record
  - a) Keep 18 for the demo and recheck at the real release (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: the demo runs a major version the tests did not — chosen
  - b) Delete postgres-v2 and recreate it from a 16 image — cost: a permanent delete and another setup round — rejected: no M4 feature depends on the difference
- Choice: a · Why: In the context of a demo on a fresh Railway database, facing a template that ships PostgreSQL 18, we chose to keep 18 over recreating on 16, because M4 uses only long-standing features (identity, checks, triggers, advisory locks) and the smoke test checks the live app, accepting a version gap between tests and the demo.
- Cost accepted: tests run on 16, the demo on 18. · Reversibility: Type 2 two-way — recreate on 16 or move tests to 18 later · Confidence: med
- Revisit if: any smoke or demo step fails on the database, or before the real release (align docker-compose.yml and D33 with production). · Evidence: railway service list (postgres-ssl:18); railway connect (server 18.6); D33; approval 2026-10-10 16:39 CDT · Interview line: "Railway's template gave us Postgres 18 while tests ran on 16; we kept 18 for the demo because M4 uses only stable features, and logged it to align before the real release."

### D57 One script applies, tests, commits and pushes kit changes  [status: accepted]
- Date 2026-10-10 17:48 CDT · phase 15 route-failure (G-L5) · milestone M4 · Decided by: human, G-L5 (approval covers apply, kit commit and push to GitLab + GitHub) 2026-10-10 17:48 CDT: "Approve, adopt H7" · Proposed by: route-failure (Claude Code, claude-opus-5-5) · artifact: HARNESS_CHANGELOG.md H7@0a9aa1f06a59
- Context and forces: the human asked that every factory improvement be committed to the software-factory-kit repo automatically (FINDINGS F7). Applying a proposal was a pasted awk pipeline, and committing and pushing were separate manual steps, so an applied change could sit uncommitted on one laptop.
- Options:
  - Do nothing / simplest (shown as "C do nothing"): keep committing by hand — cost: nothing now; an applied change can sit uncommitted again — rejected: the human asked for automatic commits
  - A adopt H7: scripts/apply-proposal.sh refuses unless the approved hash matches, applies, runs the kit tests, reverts on failure, then commits and pushes; route-failure's STOP calls it (agent's recommendation) (agent's first proposal — no instead-of recorded) — cost: one more kit script; approving a proposal now also approves pushing it to both remotes — chosen
  - B a Claude Code or git hook that commits after edits in the kit — cost: fires on every edit, including unapproved ones, so half-finished work gets pushed — rejected: a hook cannot tell approved from experimental changes
- Choice: A · Why: In the context of factory improvements that must reach the kit repo, facing manual apply, commit and push steps, we chose one hash-checked script over a commit hook to get only approved, tested changes into the kit's history, accepting that each approval now includes the push.
- Cost accepted: a G-L5 approval now also authorises pushing the kit to GitLab and GitHub; one more script to maintain. · Reversibility: Type 2 two-way — delete the script and restore the pasted command · Confidence: high
- Revisit if: an adopted change is found uncommitted in the kit, or the script pushes something that was not approved. · Evidence: software-factory-kit FINDINGS.md F7; HARNESS_CHANGELOG.md H7; kit commit 37e386c; approval G-L5 (approval covers apply, kit commit and push to GitLab + GitHub) 2026-10-10 17:48 CDT · Interview line: "Factory changes are approved by fingerprint, then one script applies, tests, commits and pushes them, so an improvement never sits uncommitted on one machine."
