# Verifier review — M4 pass 5

- Date: 2026-10-10 · Diff: `.handoff/reviews/M4-diff.patch` (9 files; the M4-T006 relaunch only, read with `.handoff/reviews/M4-T006-full.patch` for context) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.handoff/reviews/M4-diff.patch`; `.handoff/reviews/M4-T006-full.patch` (file list); `specs/M4-tracer-bullet/tasks/T006.md` (re-approved Owns and the "Also" list); `.handoff/reviews/M4-pass4.md`; `specs/M4-tracer-bullet/acceptance.md` (DB-between-tests row, Q-3/Q-4 refs); `tests/acceptance/support/http.ts`, `tests/acceptance/support/db.ts` (truncate), and the sign-in counts per test across `tests/acceptance/M4/*.test.ts`; `docs/architecture/lld.md` (EP-15 row :1353, signIn :868, `/problems/rate-limited` :1389); `docs/architecture/hld.md` (TH-1, TH-3, the Railway host rows); `docs/architecture/contracts/openapi.yaml` (EP-15 429); `docs/design/flows.md` F7; `docs/design/screens.md` (S8 refs). Worktree files read for context in `.claude/worktrees/m4-t006`: `server/services/session.ts`, `server/api/session/index.{get,post,delete}.ts`, `server/utils/problem.ts`, `app/middleware/auth.global.ts`, `app/pages/sign-in.vue`, `app/components/{AppShell,IdleCountdown}.vue`, `app/app.vue`, the page list, `db/migrations/*` grants, `nuxt.config.ts`, `Makefile`, `tests/unit/session.test.ts`.
- Tooling note: I used Bash only for read-only `cat`, `sed`, `grep` and `ls`. I ran nothing and edited nothing.

## Findings

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | tests-that-lie | P3 | high | tests/unit/session.test.ts:391-452 | The rate-limit tests use a fake driver that returns every seeded row, whatever the `WHERE` clause says. The SQL's `email = … or ip = …` filter is never checked. If it were changed to `and`, the per-email limit would only count attempts from the same email and the same address, so changing addresses would get around it, and every test would still pass. No test runs the limit against the real table. | `fake.answer = (s) => s.startsWith('select') && s.includes('"sign_in_attempts"') ? rows : …`; the only SQL assertion is `expect(count.sql).toContain('"attempted_at" >')` | file |
| R2 | security | P1 | med | server/api/session/index.post.ts:11 | "One address" uses `getRequestIP(event)` without `xForwardedFor`, which returns the socket peer. The HLD host is Railway, where every request reaches the app through Railway's edge proxy. If so, all users share one address bucket: 10 sign-ins across the whole site in 15 minutes and every user gets 429. The `?? ''` fallback also puts every request with no address into one shared bucket. Fix: take the client address from the proxy's forwarded header, trusting only the platform proxy. Confirming this needs a deploy. | `signIn(body.email, body.password, getRequestIP(event) ?? '')`; hld.md:74 `Host: one PaaS region on the existing Railway account`; session.ts:87 `recent.filter((a) => a.ip === ip)` | fix |
| R3 | security | P2 | med | server/services/session.ts:79-94 | The limit is check-then-insert with no lock or transaction, so parallel attempts all see fewer than 10 and all go through. A brute-forcer who sends N requests at once gets about 10 + N guesses per window, so lld §4's "more than 10 … answers 429" holds only for sequential callers. The comment marks this as accepted, but brute force is the threat the limit exists for (hld TH-1/TH-3). Fix: a per-key advisory lock in one transaction, or insert first and then count. | `// ponytail: count-then-insert can let a burst of parallel tries past 10 by a few; a lock per key if that matters.` | fix |
| R4 | correctness | P2 | med | app/components/IdleCountdown.vue:14-38 | The restart only sees API calls made in this tab (PerformanceObserver is per document). A person who is active in a second tab moves the server's `last_seen_at`, yet this tab sends them to "You were signed out after 15 minutes…" while the session is still live. The "Also" item asked to prevent exactly that. The first arm also compares the server's `idle_expires_at` with the client's `Date.now()`, so clock skew moves the redirect earlier or later. Fix: share restarts across tabs, or re-check EP-17 before redirecting. Confirming this needs a browser run. | `observer.observe({ type: 'resource' })`; `Math.max(0, expiresAt - Date.now()) + 1000`; T006 Also: "otherwise an active person is shown 'signed out' while the server session is live" | fix |
| R5 | correctness | P3 | med | app/components/IdleCountdown.vue:35-36 | Any same-origin `/api/` response other than 401 restarts the countdown, including calls that do not move `last_seen_at`: the public `/api/notices/{token}`, and 422/429 from POST `/api/session` while a viewer exists. The client can then show the page longer than the server session lasts. The next API call returns 401, so this is cosmetic. | `if (url.origin !== location.origin \|\| !url.pathname.startsWith('/api/') \|\| e.responseStatus === 401) continue` | file |
| R6 | security | P3 | low | db/migrations/1760000006000_sign-in-attempts.sql:6-11; session.ts:95 | `sign_in_attempts` stores every typed email (including mistyped emails of other people) and the client address. Old rows are deleted only when some later sign-in happens, so with no traffic they stay forever. No retention for this personal data is stated in the LLD. | `email text not null, ip text not null`; `await db.deleteFrom('sign_in_attempts').where('attempted_at', '<=', since)` runs only inside `countAttempt` | file |

No further findings (checked):
- **JSON-only parsing (problem.ts:50-55):** only two callers use `parseBody`: `server/api/orders/index.post.ts:19` and `server/api/session/index.post.ts:10`. No route calls `readBody` directly. Both browser callers send JSON through `$fetch` with an object body, and the acceptance helper `http.ts:22` always sets `content-type: application/json`. So no existing endpoint or later-task acceptance test is broken. `text/plain`, url-encoded and multipart bodies are refused before any query, and the unit test at session.test.ts:451-475 would fail if they were not (it checks `fake.queries` is empty). Charset and case variants are handled.
- **`next=` (auth.global.ts:11-21):** the value is parsed against a fixed base, the origin must match, and paths starting with `//` are refused. What it returns is the normalised path, which never matches Nuxt's protocol-relative regex, so `navigateTo` cannot throw on it. Tests cover `/\t/`, `/\n/`, `/..//`, backslash forms, schemes and non-strings. A failed redirect after sign-in is no longer caught by the sign-in error branch (sign-in.vue:62-69).
- **Page guard:** every error from EP-17 now redirects with 303 (auth.global.ts:28-30). `idle=1` is added only for a 401 when a session existed. Unit tests at :566-575 cover 500 and network errors.
- **Countdown mount:** AppShell.vue:11 mounts it with `v-if="viewer"`. It clears ST-1 before redirecting. `next` is passed as a query object, so it is encoded.
- **Rate-limit semantics:** the 11th attempt is refused (429 `rate-limited`, extension `retryAfterSeconds`, per lld:1389). Refused attempts are not recorded. The email is lower-cased the same way as the user lookup (session.ts:100,104). The count runs before the password check, so the response time does not reveal whether the email exists. Per-email lockout of a known account is inherent to the lld rule (keep).
- **Migration and grants:** `select, insert, delete` match the existing identity-table pattern (idempotency_keys). There is no UPDATE grant. History tables and orders/order_lines grants are untouched (Q-3/Q-4). The down migration drops the table. The acceptance truncate empties the table before each test, and no acceptance test signs in more than 4 times per test, so later tasks' red tests are not affected.
- **Role homes:** a patient now goes to `/orders`, per F7 step 2. No `/orders` index page exists in M4 yet, so that lands on 404 until a later milestone (noted, not a T006 claim).
- **Owns:** every changed path is in the widened T006 `Owns:`. No new dependencies, secrets or PHI.

No simplicity findings (checked: there is one helper, `safeNext`, and the page reuses it; no new abstractions).

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-039 | sign-in.vue:11-18, 62-69; EP-15 (T001) | sign-in.test.ts M4_AT_032/035 | covered (patient home `/orders` not built in M4) |
| FR-040 / AE-038 | auth.global.ts:23-31 | M4_AT_033; session.test.ts:556-583 | covered |
| FR-041 / AE-039 | session.ts:118-145; IdleCountdown.vue; AppShell.vue:11 | M4_AT_034 (API); session.test.ts idle block | partial: server covered; the countdown is untested and has the cross-tab gap (R4) |
| FR-042 / AE-040 | sign-in.vue:19, 66 | M4_AT_036 (sign-in page renders); safeNext unit test | partial: the redirect to the order after sign-in is untested |
| Also: countdown mounted + restart on API calls | AppShell.vue:11; IdleCountdown.vue:32-44 | none | partial (R4, R5) |
| Also: EP-15 rate limit per lld §4, DB table | session.ts:70-96; migration 1760000006000 | session.test.ts:391-452 (fake DB) | partial (R1, R2, R3) |
| Also: JSON-only body parsing | problem.ts:50-55 | session.test.ts:451-475 | covered |
| Also: `next=` same-site only; no "offline" after sign-in | auth.global.ts:11-21; sign-in.vue:41-69 | session.test.ts:535-554 | covered (the offline branch is checked structurally, not by a test) |
| Also: guard fails closed | auth.global.ts:28-30 | session.test.ts:566-575 | covered |
| Also: role homes per F7 | sign-in.vue:11-18 | none | covered (code only) |
| Also: unit tests for `next` and EP-16 | tests/unit/session.test.ts:477-554 | — | covered |
| EP-16 sign out | index.delete.ts; session.ts:147-154 | session.test.ts:477-517 | covered |
| NFR-007 (Must-not-change) | session.ts:106-107 | M4_AT_035; session.test.ts:441-448 | covered |

## Not reviewed

- `.handoff/runs/M4-T006/**`: worker self-report, excluded by the verifier rules.
- Runtime behaviour: the Railway proxy address seen by `getRequestIP` (R2), the parallel-burst bypass (R3), multi-tab countdown behaviour and PerformanceObserver browser support (R4, R5), and the SSR 303 Location header. All of these need a run or a deploy, and I have no permission to run code.
- Pass-4 rows outside this relaunch's scope: pass-4 R1 (the 15-minute boundary test checks its own operator) is unchanged at tests/unit/session.test.ts:104. Pass-4 R11 (the clock seam) is unchanged.
- M4-T007/T008/T009 behaviour: out of scope as instructed.
