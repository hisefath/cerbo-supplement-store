# Verifier review — M4 pass 4

- Date: 2026-10-10 · Diff: `.handoff/reviews/M4-diff.patch` (7 files; this pass covers M4-T006 only, on top of merged M4-T001 to M4-T005) · Reviewer: verifier (claude-opus-5-5)
- Inputs read: `.handoff/reviews/M4-diff.patch`; `specs/M4-tracer-bullet/tasks/T006.md`; `specs/M4-tracer-bullet/acceptance.md` (AT-032 to AT-036, EDGE-004/005/008/025, Q-1, SEAM rows, NFR-007/008 rows); `tests/acceptance/M4/sign-in.test.ts`; `tests/acceptance/support/{app,people}.ts` (SCRYPT_COST, seed hash format); `docs/product/prd.md` (FR-039 to FR-042, NFR-007, NFR-008, AE-038 to AE-040); `docs/architecture/lld.md` (BE-2, BE-3, BE-20, the EP-1 to EP-17 rows, `/problems/rate-limited`, ST-1, ST-2, SEQ-7, SEAM-1, `sessions` table); `docs/architecture/contracts/openapi.yaml` (EP-15/16/17, sessionCookie); `docs/design/screens.md` S8; `docs/design/flows.md` F7; `.handoff/reviews/M4-pass1.md` (only its note that the rate limit belongs to T006). For context I read these worktree files in `.claude/worktrees/m4-t006`: `server/services/session.ts`, `server/api/session/index.{get,post,delete}.ts`, `server/utils/problem.ts` (parseBody), `app/components/AppShell.vue`, `app/app.vue`, the page list under `app/pages/`, and Nuxt's `navigateTo` and ufo's `hasProtocol` in node_modules.
- Tooling note: I used Bash only for read-only `cat`, `sed -n` and `grep`. I ran nothing and edited nothing.

## Findings

| id | axis | severity | confidence | file:line | finding | evidence | suggested |
|---|---|---|---|---|---|---|---|
| R1 | tests-that-lie | P3 | high | tests/unit/session.test.ts:56-58 | The boundary test checks the test's own `>` operator, not the SQL in `resolve()`. If `resolve` used `>=`, the test would still pass. AT-034 only tests 14 and 16 minutes, so nothing tests exactly 15 minutes. | `expect(new Date(at.getTime() - 15 * MIN) > cutoff).toBe(false) // exactly 15 minutes idle is signed out` vs session.ts:100 `.where('last_seen_at', '>', idleCutoff())` | file |
| R2 | spec-fidelity | P1 | high | app/components/IdleCountdown.vue:1 | The ST-2 idle countdown is never mounted, so it is dead code. Nothing references `IdleCountdown`, and AppShell (FE-1, which owns ST-2 per lld.md) was not changed. An idle person keeps seeing the page, order contents included, until their next navigation. FR-041 requires "sign them out and show the sign-in page". Root cause: T006.md `Owns:` does not list `app/components/AppShell.vue`, although the Ask's slice names FE-1/ST-2. | grep for "IdleCountdown" in app/ finds only the file itself; AppShell.vue:2 still says `The idle countdown (ST-2) and the signed-out redirect arrive with the sign-in page (M4-T006).` | fix |
| R3 | spec-fidelity | P1 | high | server/services/session.ts:70-72 | The EP-15 rate limit was not built. T006 is the task that owns it: its Ask says "build it only as lld.md states", and lld.md states 10 tries per 15 minutes per email or per address, answered with a 429. `_ip` is still unused, so sign-in has no brute-force control. | T006.md Ask: "rate-limiting EP-15 is in lld.md … build it only as lld.md states"; lld.md:1389 `more than 10 sign-in attempts in 15 minutes for one email or one address`; session.ts:70 `// ponytail: no sign-in rate limit yet` | fix |
| R4 | security | P2 | high | app/pages/sign-in.vue:17, 44 | The page's own open-redirect check is weaker than Nuxt's. `/\t/evil.example` passes the regex, and the URL parser turns it into `//evil.example`. Nuxt's `navigateTo` blocks it (ufo `PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/` → NUXT_E2001 throw), so no redirect happens. But the throw lands in the same `catch` as sign-in failures, so a successful sign-in shows "You're offline…" (R7). No test covers the `next` check (R6). | `/^\/(?![/\\])/.test(n)`; node_modules/nuxt/dist/app/composables/router.js:119-122 | fix |
| R5 | correctness | P2 | med | app/components/IdleCountdown.vue:7, 18 | If the countdown is mounted as written, it counts down from ST-1's `idle_expires_at`, which only changes when AppShell re-fetches EP-17. API calls on the page (for example pay or checkout) move the server's `last_seen_at` but not this timer. An active person would then be sent to "You were signed out…" while the server session is still live, and that session would not be ended. Confirming this needs a run. | `const at = viewer.value?.idle_expires_at` … `Math.max(0, new Date(at).getTime() - Date.now()) + 1000` | fix |
| R6 | spec-fidelity | P2 | high | — | Three security-relevant behaviours have no test: the `next` sanitizer in sign-in.vue, the redirect after sign-in (FR-042, "her order opens"), and EP-16 sign-out. AT-036 only asserts that `/sign-in?next=…` returns 200 HTML, so it would pass if sign-in.vue ignored `next`. EP-16 (204, cookie cleared, session `ended_at` set) has no unit or acceptance test. | sign-in.test.ts:76-78 `expect(page.status).toBe(200)`; no match for `DELETE` or `signOut` in tests/ | fix |
| R7 | correctness | P3 | high | app/pages/sign-in.vue:44-55 | When `navigateTo` fails after a successful POST, the error is caught as a sign-in failure. The person is signed in, but the password field is cleared and the page shows "You're offline. Try again when you're back online." | `await navigateTo(next.value ?? HOME[me.role] ?? '/', …)` inside the `try` whose `catch` maps a missing `statusCode` to the offline message | file |
| R8 | security | P3 | high | app/middleware/auth.global.ts:14 | The page guard fails open on any non-401 error from EP-17 (500, network): the page renders without a session. The page's own API calls still enforce the session, so no data was found leaking, but the guard does not fail closed. | `if ((err as { statusCode?: number }).statusCode !== 401) return // not a sign-in problem` | file |
| R9 | spec-fidelity | P3 | med | app/pages/sign-in.vue:7-13, 37 | The role homes do not match flows.md F7 step 2. A patient has no entry and falls to `/`, which has no page in M4 (404). F7 sends a patient to her orders and "staff" to Stock adjustments; the code sends finance_lead/sre/data_analyst to /ops/finance, /ops/system and /ops/health. Also, "Enter your password." is copy that screens.md S8 does not define. | `HOME: Record<string, string> = { provider: '/practice/dashboard', … }` · flows.md:124 `a patient her orders, a provider the practice dashboard, a reviewer Paid orders, staff Stock adjustments` | file |
| R10 | security | P3 | low | server/utils/problem.ts:50 (pre-existing, consumed EP-15) | Possible login CSRF: `readBody` parses any content type as JSON. A cross-site `enctype=text/plain` form could post a valid `SignInRequest` (when the attacker's own password ends in `=`) and sign a victim into the attacker's account. SameSite=Lax does not stop a top-level POST from setting the cookie. Confirming this needs a run. | `const raw = await readBody(event).catch(() => undefined)` with no content-type check; openapi EP-15 requestBody is `application/json` only | file |
| R11 | simplicity | P3 | med | server/services/clock.ts:7 | SEAM-1 says BE-20 is "provided through the Nitro app context; tests install the fake". This is a module-level mutable exported from production code instead. It is harmless, since no route exposes it, but it differs from the LLD. | lld.md:2489 `BE-20 provided through the Nitro app context`; `export function freezeClock(at: Date \| null)` | keep |

No further security findings (checked):
- **Sign-in timing:** an unknown email runs scrypt on `dummyHash()` with r=8, p=1, a 64-byte hash and N=`SCRYPT_COST`. The acceptance app sets `SCRYPT_COST=1024`, matching the seed (people.ts:12). The email lookup is the same query in both cases.
- **NFR-007:** one `sign-in-failed` problem for both cases. sign-in.vue maps 401 and 422 to the same message.
- **NFR-008:** every comparison and write now uses one clock (BE-20), and an idle session gets `ended_at`.
- **Cookies:** HttpOnly, Secure, SameSite=Lax, path `/`, no Max-Age, matching openapi `sessionCookie`. `deleteCookie` uses the same attributes. Tokens are 32 random bytes stored as SHA-256.
- **CSRF on DELETE:** blocked by SameSite=Lax.
- **Encoding:** IdleCountdown and the middleware URL-encode `next`.
- **PUBLIC list:** limited to `/sign-in` and `/notices/{token}`.
- **Repo hygiene:** no secrets, PHI or new dependencies in the diff. Every changed path is inside T006 `Owns:`.

No simplicity findings beyond R11 (checked: `verifyPassword`/`toViewer` exports are used by the unit test; no new abstractions).

## Coverage map

| id | delivered by | test | verdict |
|---|---|---|---|
| FR-039 | app/pages/sign-in.vue:34-56 (EP-15 call, role home), EP-15 from T001 | sign-in.test.ts M4_AT_035 (M4_AT_032 for roles) | partial: patient home is `/` (R9) |
| FR-040 / AE-038 | app/middleware/auth.global.ts:8-16 | sign-in.test.ts M4_AT_033 | covered |
| FR-041 / AE-039 | server/services/session.ts:34, 95-110; auth.global.ts:10,15 (`idle=1`); sign-in.vue:19-23 | sign-in.test.ts M4_AT_034 (API only); tests/unit/session.test.ts:50-59 | partial: server side covered; the "sees the sign-in page" countdown is dead (R2, R5) |
| FR-042 / AE-040 | sign-in.vue:15-18, 44 (`next`) | sign-in.test.ts M4_AT_036 (only that the sign-in page renders) | partial: the redirect to the order after sign-in is untested (R6); the notice text is T001's |
| NFR-007 (Must-not-change) | session.ts:79-80 (T001), sign-in.vue:47-50 | M4_AT_035 | covered |
| NFR-008 | session.ts:34, 100 | M4_AT_034, session.test.ts:50-59 | covered (server); exact 15-minute boundary untested (R1) |
| EP-16 sign out | server/api/session/index.delete.ts:6-12, session.ts:133-135 | none | missing test (R6) |
| EP-15 rate limit (lld §4) | — | — | missing (R3) |

## Not reviewed

- `.handoff/runs/M4-T006/**` (result.md and the "See result.md Questions" it cites at session.ts:71): worker self-report, excluded by the verifier rules.
- Runtime behaviour (the SSR 303 Location header, cookie deletion in a browser, whether the countdown fires, the login-CSRF path in R10): needs running, and I have no permission to run code.
- M4-T007 and anything owned by T008/T009: outside this diff, as instructed.
- `app/components/ProblemMessage.vue:43`: its `unauthenticated` "Sign in" link has no `next`. It is not in this diff and is noted only for the milestone review.
