# AI usage: decisions, cuts, and how the AI was steered

This is the AI usage documentation and log for the Cerbo supplement store (REQ-15, REQ-22). Every claim points at
the record it comes from: the decision journal (`docs/decisions/DECISION_JOURNAL.md`, D-ids), the human approvals
and run log (`.handoff/TRACKER.md`), the PRD interview log (`docs/product/prd.md`, Q-ids), the milestone reports
(`docs/milestones/`) and the bug notes (`specs/bugs/`).

## 1. Key decisions and their trade-offs

The decision journal holds 91 entries, each with the options that lost and the cost accepted. The ones that shape the
product:

| Decision | What we chose | What it cost | Record |
|---|---|---|---|
| Restart under human gates | Set aside the first, one-shot AI build and rebuild from a brief, with a human approval at every phase | Days of rework, and the v1 code is reachable only through history | D18, D22 |
| Money path first | Build provider order → patient pays → split recorded before anything else; HIPAA-ready, not HIPAA-compliant | Campaigns, refunds and real integrations wait | D25, Q8 |
| Money is stored twice, on purpose | The split lives on the paid order and in an append-only ledger whose entries must balance at commit | Two writes per payment, and corrections must be new rows (none built yet) | D35, INV-4, LINV-2 |
| Whole cents, one rounding | Integers only; the 0.75% fee is computed once per order and rounded half-up; leftover cents go to the lines with the largest remainders | A per-line fee would have been simpler to show | FR-011, FR-069 |
| No double charges | One idempotency-keys table, plus database backstops (unique indexes on payment attempts) | A table and a cleanup task to run | D41 |
| Payment timing | Charge synchronously, between two short database transactions, so a slow provider never holds a lock; webhooks for production | A crash between the two transactions needs a reconcile step (built, FM-7) | D42 |
| One deployable | One Nuxt app with its own JSON API plus one managed PostgreSQL | Less independent scaling; much less to run | D32, D33, D36 |
| Privacy by role | Platform staff never see patient identity; patient notices carry no health details | Staff screens show order numbers, not names | D26, Q10, Q11 |
| Database refuses bad money | The app's database login can only add ledger rows; triggers freeze paid orders and check fee shares at commit | Migrations get harder, so fixes must be new rows | D35, migrations `1760000002000`, `1760000015000` |
| Cross-site writes | SameSite cookies and JSON-only bodies first, then an Origin check once one write route turned out to take no body | A request with no Origin header still passes; the anti-forgery token waits for the EHR embed | D52, then D91 |

## 2. What was cut, and what comes next

Cut on purpose (PRD non-goals; the assignment asked for the smallest slice that proves the problem):

- Real payments, sign-in, email and shipping (NG-1). Each is a stand-in behind a clean seam (`docs/REVIEWER_GUIDE.md`, "What is stubbed").
- Refunds, returns and corrections to paid orders (NG-7); pricing campaigns and selling at cost (NG-5); refills (NG-6).
- Catalog browsing, search and images (NG-2); tax, shipping and multi-state rules (NG-3, NG-4); formal HIPAA compliance (NG-10).
- Running inside Cerbo's EHR. Only the plan exists (`docs/architecture/embedding-plan.md`), because it needs answers
  only Cerbo can give: their addresses, launch method and a test tenant.

Next, with more time, in order:

1. **Embed in Cerbo** (embedding-plan phases E0 to E5): a signed launch token, a framing allow-list, partitioned cookies and an anti-forgery token.
2. **A real payment provider** with signed webhooks, which D42 already plans for.
3. **Browser-level tests of every page.** The blank receipt (§3) survived because every acceptance test drives the API.
4. **Refunds and corrections** as reversing ledger entries, then campaigns.
5. **A fault-injection seam** so the planted-bug check can reach the one race it misses (MUT-1), plus load tests.
6. **The roughly 20 low-severity review findings** filed across milestones, such as the "you're offline" wording on five other screens.

## 3. How AI was used

### Tools

| Tool | Used for |
|---|---|
| Claude Code (Claude Opus 5.5) as the supervisor | Ran each phase skill: brief, research, PRD, UX, HLD, LLD, acceptance tests, task slicing, review, milestone reports, deploys |
| Claude Code subagents in git worktrees | 83 dispatched jobs (`.handoff/TRACKER.md` DISPATCH lines): build tasks, diagram drawing, research digests, doc jobs |
| A read-only verifier subagent | 7 or more review passes; it can read but not write, so it cannot "fix" what it reviews |
| software-factory-kit (my own skill set) | One skill per phase, each with its owned files, a done-check and a stop at a human gate |
| GitLab CI on a self-hosted shell runner | `make check` on every push; merge only on green |
| Playwright and GitLab's Mermaid renderer | Recording the demo video and exporting the diagram pictures |
| Codex (approved as a second harness) | Planned for cross-checking; 0 runs in this project |

### What worked

- **A human gate at every phase.** I approved the brief, PRD, UX, HLD, LLD, acceptance tests and task slices, and each approval is quoted word for word in `.handoff/TRACKER.md`. The AI never chose for me.
- **Tests written first, by a different role.** Acceptance tests were written red before any code, in a folder the building agents could not edit, and `scripts/scope-guard.sh` rejects any task that touches files outside its list.
- **A decision journal with the losers kept.** Every option the AI offered stays in the record, including "do nothing", so I can defend why each one lost.
- **A planted-bug check.** 15 money bugs are planted on purpose and the tests catch 14 (`docs/ops/MUTATION.md`), which shows the tests can actually fail.

### Where AI misled me, and how I course-corrected

| What went wrong | How it was caught | What changed |
|---|---|---|
| The first build was a one-shot AI app with no gates; I could not defend its choices | My own review | Restarted from a brief under the gated workflow (D18, D22) |
| The AI misread Fullscript's 35% cap: a cap on their discount, treated as a price ceiling | I corrected it in the PRD interview: "Fullscript's 35% cap is for their discount, not for their maximum price. be careful." (Q3) | No price ceiling; a deliberate price-change form with an auditable history (FR-017 to FR-021) |
| The AI recommended leaving the order dashboard for later | Me, at the PRD gate (Q9) | Dashboard and sign-in moved into M5 |
| Finance reporting and operations roles were missing from the spec | Me, while the HLD was being written (Q12) | US-9 and US-10, a finance lead, an SRE, a data analyst and the access log (M6) |
| It named Nuxt 3 from memory; the current major was Nuxt 4 | A registry check at setup (D38 → D44) | Every version claim now cites a registry check (`docs/learnings/check-versions-in-the-registry.md`) |
| Signing in led to 404s and dead ends | Me, using the deployed app | M5.2: every role lands on a home page and wrong-role pages link back |
| No sign-out button | Me, using the app | Added, with an acceptance test |
| A wrong password said "You're offline" | Me, using the app | The message now matches the real error (unit-tested) |
| The receipt never showed after paying, since M4 | Recording the demo video | Fixed, plus a test that fails on any page that names a missing component (`specs/bugs/blank-receipt.md`) |
| A database check approved in the design (LINV-1) was never built | An agent writing the reviewer guide in M7 | Built as a constraint trigger; one old test fixed (M7) |
| A security note claimed every write needed an idempotency key; start-checkout did not | The embedding-plan agent | Origin check added (D91, M7.1) |
| The backend class diagram never rendered on GitLab ("Syntax error") | Exporting diagram pictures | Labels rewritten for GitLab's Mermaid version; every diagram now verified by rendering |
| Tests that passed even with the code broken | Reviews, then a rule that a test only counts once seen failing | The planted-bug check (D60, `docs/learnings/tests-must-fail-when-code-breaks.md`) |
| Workflow breakdowns: worktrees starting from the wrong branch, file globs misreading `[orderId]` paths, hooks confused inside worktrees, colliding decision numbers | 21 FAIL lines in `.handoff/TRACKER.md` | Each routed to a fix in the kit or the repo (`/route-failure`, the H-ids in `docs/decisions/REVIEW.md`) |

The pattern: AI was fast and usually right on code it was tested against, and wrong where nothing checked it.
Rendered pages, design promises never re-checked, version numbers from memory, and claims in prose all needed a human,
a second agent or a new check. Each miss became a check that now runs every time.

## 4. Log

The full AI usage log is the run record itself:

- `.handoff/TRACKER.md` — every approval in my exact words, every dispatch, result, failure and deploy, with times.
- `docs/decisions/DECISION_JOURNAL.md` — 91 decisions with options, costs and who decided.
- `docs/milestones/M*.md` — per milestone: what shipped, verification output, review dispositions, and which agent and model did each task.
- `docs/learnings/` — lessons turned into rules.
