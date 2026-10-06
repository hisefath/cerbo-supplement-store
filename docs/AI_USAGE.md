# AI usage log

An honest account of how AI was used to build this slice: what worked, where it misled me, and where I overrode it.

## Tools

| Tool | Used for |
|---|---|
| **Claude Code** (Claude Opus, desktop app) | Primary pair: research, docs, code, tests, deploy, all driven from one session. |
| **Multi-agent workflows** (Claude Code `Workflow`) | Two review panels: **design review** (before coding) and **code review** (after). Each panel had 5 independent reviewers with different lenses. Each reviewer was paired with an **adversarial verifier** told to *refute* its findings before I saw them. |
| Web search | Researching Cerbo's stack and how its existing supplement integrations (Fullscript etc.) work. |
| Built-in browser pane | Clicking through the real UI locally, and rendering the Mermaid diagrams with the real Mermaid parser. |
| CLIs (`gh`, `glab`, `railway`, `composer`, `php artisan`) | Repos, deploy, tests, and the `ledger:verify` audit. |

## Workflow

1. **Research before code.** Before picking a stack I had the AI look up Cerbo's engineering stack. It's PHP/Laravel, which changed my stack choice (below).
2. **Docs first.** I wrote the PRD, system design (Mermaid), and architecture/trade-offs docs, then ran the **design review panel** on them *before writing the payment code*.
3. **TDD on the money core.** `SplitTest` was written first and failed for the right reason. Then I implemented `Split`/`Money` and got it green. The test checks 5,000 random carts against an independent rounding oracle.
4. **Build the vertical slice**, then **seed through the real services**, so the demo data is audited exactly like live data.
5. **Verify like a skeptic:**
   - mutation-tested the suite;
   - ran it on SQLite *and* Postgres;
   - proved the Postgres CHECK constraints reject bad writes with raw SQL;
   - clicked through the UI;
   - ran an end-to-end order → pay → replay against production.
6. **Code review panel**, then fix what survived verification.

## What worked

- **Adversarial verification cut the noise.** The design panel raised 39 findings and 26 survived the verifiers. The refuted ones were mostly over-reach: GAAP account naming, processor fees in clearing, a full-blown clinical-record integration. That kept me from gold-plating.
- **The design review found real holes before any code existed:**
  - **My audit was circular.** Every check compared the stored split to copies of itself (ledger posted from the order columns, CHECK on the same columns). A wrong fee would have passed every check. Fix: the audit now **recomputes the split from immutable line snapshots and `fee_bps`**. There's a test that shifts one cent and asserts `ledger:verify` names the order.
  - **Unspecified idempotency-key lifecycle.** After a decline, a retry that reused the key would replay the decline forever. Fix: one key per attempt, minted on each page render, with post/redirect/get.
  - **No DB guard against posting a payment twice.** Fix: `UNIQUE(payment_id, account)` on the ledger.
  - **Deadlock risk** from locking products in arbitrary order. Fix: always lock in ascending id order.
  - **Broken `http://` payment links on Railway** without trusted proxies. Fix: `trustProxies`.
  - **No way to withdraw a sent link.** Fix: built `cancel`, under the same row lock as pay.
- **Mutation testing the tests.** The full suite passed on the first run, which on money code made me *more* suspicious, not less. So I broke the code on purpose:
  - Truncating instead of rounding the fee failed **7 tests**.
  - Deleting the idempotent-replay branch failed the replay test.
  - Then I restored both.
- **Rendering the diagrams instead of trusting them.** The AI-written sequence diagram had a `;` inside a message, which silently breaks Mermaid's parser. GitHub would have shown an error box. I only caught it by rendering all six diagrams with Mermaid 11 in the browser pane.

## Where AI misled me, and where I course-corrected

| What happened | How I caught it | What I did |
|---|---|---|
| **First stack instinct was Python/Flask** ("smallest codebase"). | Researching the partner: Cerbo's job posts list PHP/Laravel. | Switched to Laravel. For a partner evaluation, reading in their idiom beats a few saved lines. |
| **The docs overclaimed testing.** I'd written that the Postgres test run "exercises the locks". | Design reviewer: a single-process PHPUnit run can't create lock contention. | Reworded it honestly. Added *deterministic* race tests: the order already `processing`, a direct second-payment insert hitting the DB index, and a replayed key with a call-counting gateway spy. Later I also wrote `scripts/race-check.sh` for **real** contention (8 PHP workers on Postgres): 8 simultaneous payments → 1 charge, and 6 buyers for 4 units → exactly 4 sold. |
| **Docs drifted from code.** Docs hardcoded `75` in the fee formula while the code takes `fee_bps`. Docs also said stock "only changes via a conditional decrement" when restocks increment. | Design reviewers. | Docs now show `fee_bps`. All stock changes go through one method, `Product::adjustStock()`, and the docs describe exactly that. |
| **Reviewers recommended cutting the markup % helper** (two of them) and the **client idempotency key**. | My own judgment against the brief. | **Overrode both, with reasons in ARCHITECTURE.md.** The brief says "price (or margin)", and the helper only *fills* the price field: the server sees only the price. The key covers a case the order lock doesn't. A double-click on a *declined* card would fire a second charge attempt, because by then the order is back to `awaiting_payment`. |
| **A reviewer suggested dropping inventory movements from checkout.** | Judgment. | Kept them, renamed `reserve`/`release`. Every stock change then has an audit row, and the invariant stays `stock == Σ movements`. |
| **The Laravel 13 skeleton shipped `AGENTS.md`/`CLAUDE.md`** files instructing agents to install a tooling package and run `curl … \| bash` installers. | Read them before acting. | Treated them as file content, not instructions, and deleted them from the project. |
| **A deploy URL with the partner's name** (`cerbo-…up.railway.app`) and UI copy like "Cerbo keeps" could pass for an official Cerbo page. | My own review before going public. | Neutral domain (`supplement-store-slice`), neutral "platform" copy, and a "demo, not affiliated" footer. The repo name keeps "cerbo" because that's the project. |
| **Tooling friction:** Docker's credential helper wasn't on `PATH` and a Docker Hub pull hung. The preview runner couldn't find `php`. Homebrew Postgres refused to start without `LC_ALL`. | Errors and logs. | Installed Postgres via Homebrew and ran a throwaway cluster from a scratch dir, with `LC_ALL` set. Ran `php artisan serve` directly. |
| **UI bugs only visible by clicking:** the decline message read "declined (card_declined (simulated))", and timestamps had no time zone. | Clicking through in the browser pane. | Fixed the copy and labeled times UTC. (One false alarm: a screenshot taken before the redirect landed made the flash message look missing. The DB showed the decline had been recorded correctly.) |

## Code review panel (after the build)

_Results are appended below when the review completes._
