# Cerbo EHR embedding plan

Status: plan only (M7-J01). Nothing in this file is built unless it cites code that exists today.
Every Cerbo fact below cites a research file. Anything about Cerbo's own API, launch or frame rules that no
research file states is marked ⚠ and is an open question for the partner (§7).
All examples use fictional people and `example.test` addresses.

## 1. What exists today

**A standalone web app.** One Nuxt 4 deployable serves the Vue pages and the JSON API on one web address
(D36, D44; `docs/architecture/hld.md:177`). Cerbo's chart and portal do not show it yet. The "host frame" in
the designs is an imitation chart header, not a real one (`docs/design/screens.md:9`).

**A stand-in sign-in.** Each fictional person has a seeded email and password (A-12 `docs/product/prd.md:385`,
C-3 `docs/product/prd.md:442`, D37).

- Sign-in checks the password and opens a server-side session (`server/services/session.ts:137`,
  `server/api/session/index.post.ts:10`).
- The cookie is `session`, HTTP-only, Secure, `SameSite=Lax`, path `/` (`server/services/session.ts:195-197`).
- Sessions end after 15 idle minutes and after 12 hours in all (`server/services/session.ts:23-24`; NFR-008, SEC-6).
- Sign-in is rate-limited per email and per address (`server/services/session.ts:80-128`; TH-1).
- Every API call starts with `requireViewer`, which reads only that cookie (`server/services/session.ts:204-208`).
- There is no link from a Cerbo user to one of our users. The `users` table holds email, password hash, role and
  practice, and no outside id (`db/migrations/1760000001000_core-orders.sql:13-25`).

**A strict CSP.** In production every response carries these headers (`nuxt.config.ts:13-26`, `:41`):

- `frame-ancestors 'self'` (`nuxt.config.ts:21`). So today **no other site may frame the app**, Cerbo included.
  A unit test pins this (`tests/unit/hardening.test.ts:66-70`).
- Scripts, styles and fonts come only from our own origin, plus one hashed config script (`nuxt.config.ts:14-17`).
  This already meets NFR-016 (`docs/product/prd.md:265`; D80, D81).
- `form-action 'self'`, `object-src 'none'`, `base-uri 'self'`, nosniff, a referrer policy and HSTS
  (`nuxt.config.ts:18-25`; SEC-4).
- The dev server sends none of these (`nuxt.config.ts:40-41`).

**CSRF today.** There is no anti-CSRF token and no Origin check (SEC-5, accepted as D52). The defence is
`SameSite=Lax` plus JSON-only bodies (`server/utils/problem.ts:47-55`). D52 and D55 both say embedding must
fix this first (`docs/decisions/DECISION_JOURNAL.md:600`, `:634`).

## 2. Target: how the pages appear inside Cerbo

What the research says about Cerbo:

- Cerbo has charts, a patient portal and in-house supplement inventory (R02 F1, F2).
- Providers already build a supplement plan inside a patient's encounter, and it shows under Plan Rx/Orders
  (R02 F6).
- Cerbo's portal front end is Vue on TypeScript (R01 F1, I3). D36 chose API-first so Cerbo could embed it later
  (`docs/architecture/hld.md:346`).
- ⚠ No research file says how Cerbo shows a third-party page: an iframe, a tab, a pop-up, or a link out.

Proposed placement, by screen (`docs/design/screens.md`):

| Where in Cerbo | Our screen | Page today | Who |
|---|---|---|---|
| Chart, inside the patient's encounter (next to Plan Rx/Orders, R02 F6) | S1 Supplement order | `app/pages/patients/[patientId]/supplements.vue` | provider |
| Chart, practice area | S5 Practice prices, S6 Practice dashboard | `app/pages/practice/prices.vue`, `app/pages/practice/dashboard.vue` | provider |
| Patient portal | S16 Your orders, S2 Your supplement order (checkout) | `app/pages/orders/index.vue`, `app/pages/orders/[orderId].vue` | patient |
| Patient portal message (replaces the stand-in notice) | S9 Order notice | `app/pages/notices/[token].vue` | patient |
| Not embedded: stays on our own address | S3, S4, S7, S10 to S14 (operations) | `app/pages/ops/**` | platform staff |
| Not embedded: replaced by the launch | S8 Sign in, S15 Your home | `app/pages/sign-in.vue`, `app/pages/index.vue` | everyone |

Operations pages stay standalone. Their users are platform staff, not practice users (P-5 to P-8,
`docs/product/prd.md:34-46`), so a practice's chart has no reason to frame them.

## 3. Launch handshake options

The question: when a provider or patient opens our panel inside Cerbo, how does our server learn who they are,
which practice, and which patient chart, without a second password?

⚠ No research file says Cerbo offers SMART on FHIR, OAuth, OpenID Connect, signed launch tokens, or any partner
API. R02 F5 says only that Cerbo's Fullscript integration is set up by a Cerbo super-admin who authorizes it on
Fullscript's page. Every option below therefore needs the partner to confirm what Cerbo can send.

| Option | How it works | Cost to us | Cost to Cerbo | Risks |
|---|---|---|---|---|
| Do nothing: keep the stand-in sign-in inside the frame | The panel shows S8; the person types a second password | none | none | Two identities that can disagree; a password form inside a third-party frame trains people to type passwords into frames; fails the "no second password" goal |
| A. Signed launch token (recommended) | Cerbo's server signs a short-lived token (user id, role, practice id, patient id, expiry, one-time id). The frame URL carries it once. Our server checks the signature with Cerbo's public key, refuses reuse, maps the Cerbo ids to our user, and opens our normal session | ⚠ estimate 2 to 3 days: a verify endpoint, a key setting, a used-token table, an outside-id column on `users`, tests | ⚠ Cerbo must sign tokens and publish a key; unknown if they have this | Token in a URL can leak through logs or Referer; mitigated by one use, under 60 s expiry, and our `strict-origin-when-cross-origin` referrer policy (`nuxt.config.ts:24`) |
| B. SMART on FHIR EHR launch | Cerbo opens us with a `launch` value; we run OAuth with Cerbo's server and read patient context over FHIR | ⚠ estimate 5 to 8 days: OAuth client, FHIR reads, token storage | ⚠ needs Cerbo to be a SMART server; no research says it is | Biggest build; best if Cerbo already has it, since it is the health-IT standard |
| C. OAuth or OpenID Connect sign-in with Cerbo as the identity provider | We redirect to Cerbo to sign in, get an ID token, open our session | ⚠ estimate 3 to 4 days | ⚠ needs Cerbo to run an OAuth server for partners | Sign-in redirects often cannot run inside a frame; usually needs a pop-up or a top-level step; gives identity but not "which patient chart" |

**Recommendation: A, a signed launch token**, unless the partner says Cerbo already runs B. It is the smallest
thing Cerbo would have to build. It also carries the patient context, which C does not. If Cerbo already offers
SMART on FHIR, B wins, because it is the standard and Cerbo would build nothing new.

Rules for A, whichever signer Cerbo uses (all ⚠ not built):

- Verify with an asymmetric key (Cerbo holds the private key; we hold only the public one), so a leak on our side
  cannot mint tokens.
- Expire within 60 seconds; store each one-time id until it expires and refuse a second use.
- Exchange the token for our existing server-side session right away, then redirect to a clean URL with no token.
- Keep our own role and ownership checks (TB-2, TH-4). A launch token says who the person is. It never widens
  what they may see.
- Keep the 15-minute idle and 12-hour absolute limits (NFR-008, SEC-6). On expiry, show "Reopen this panel from
  the chart" instead of S8.

## 4. Data: read from Cerbo vs stays ours

| Data | Today | After embedding | Why |
|---|---|---|---|
| People (providers, patients) and their roles | our `users` table, seeded (`db/migrations/1760000001000_core-orders.sql:13`) | Cerbo is the source; we keep a thin row per person with Cerbo's id, our role, and no password | NFR-007 personal accounts still hold, now through Cerbo's accounts |
| Practices | our `practices` table, name only (`db/migrations/1760000001000_core-orders.sql:7`) | Cerbo is the source; we keep id, Cerbo's id and name | A-5 each order has one practice |
| Patient in context | the `patientId` in the page path (`app/pages/patients/[patientId]/supplements.vue`) | comes from the launch token, then checked against the provider's practice | stops a provider typing another id (TH-4) |
| Patient contact details | none stored | ⚠ read from Cerbo only if a notice needs them; stand-in today (C-3) | NFR-010, NFR-012 keep names and contacts out of logs and ops pages |
| Products, stock, practice prices, price history | ours | stays ours | the platform holds inventory (A-1) |
| Orders, lines, checkout holds, payments | ours | stays ours | the sale must live in this system (R02 I1) |
| Ledger, splits, financial report | ours | stays ours | INV-1, INV-4, INV-9; NFR-013 3-year keep |
| Access log, stock and role history | ours | stays ours | NFR-014 |
| Order status back into Cerbo | none | ⚠ optional later: R02 F9 says Fullscript sends no order status back; doing so would be a selling point | open question Q-5 |

We copy as little from Cerbo as possible. Each read is by id, at launch time, and keeps no health detail.

## 5. Security changes

Each item below is **⚠ not built**. Each needs its own test before the embed goes live.

1. **frame-ancestors allowlist.** Change `frame-ancestors 'self'` (`nuxt.config.ts:21`) to `'self'` plus Cerbo's
   exact chart and portal origins, read from one setting. No wildcards. ⚠ The origins are unknown (Q-1).
   Update `tests/unit/hardening.test.ts:70` to expect the list. Operations pages keep `'self'` only.
2. **Cookies in a third-party frame.** Inside Cerbo's page our cookie is third-party, and browsers drop
   `SameSite=Lax` cookies there. Set the session cookie to `SameSite=None; Secure; Partitioned; HttpOnly`
   (change `server/services/session.ts:195-201`). `Partitioned` keeps a separate cookie per top-level site, so a
   session opened inside Cerbo is never sent when our app is framed by another site. The installed cookie library
   already has the option (the `partitioned` option of cookie-es 1.2.3, the library behind h3's
   `setCookie`). ⚠ Browsers that block third-party cookies entirely would need the Storage Access API or a
   top-level step; not planned until tested.
3. **CSRF and Origin checks.** `SameSite=None` removes today's CSRF defence (SEC-5, D52). Add:
   - an Origin check on every non-GET API call: allow only our own origin, refuse missing or other origins;
   - a per-session anti-CSRF token in a header on every write.

   This is not optional. Two writes take no JSON body today, so a plain cross-site form POST could reach them once
   the cookie is `SameSite=None`: EP-22 start checkout (`server/api/orders/[orderId]/checkout.post.ts:7-12`, no
   body, no Idempotency-Key) and EP-16 sign-out (`server/api/session/index.delete.ts`; DELETE needs a CORS
   preflight, so it is lower risk). SEC-5's note that "every write needs JSON plus a custom Idempotency-Key header"
   does not hold for EP-22; the Idempotency-Key is only on six routes (`server/api/orders/index.post.ts`,
   `payments.post.ts`, `cancel.post.ts`, `practice/prices/[productId].put.ts`, `ops/stock/.../adjustments.post.ts`,
   `ops/staff/.../role.put.ts`). Today Lax blocks it; embedded, it would not.
4. **Clickjacking.** The allowlist in item 1 is the main defence: only Cerbo can frame us. Also:
   - keep `'self'` on every operations page and on sign-in;
   - paying is already two API calls, start checkout (EP-22) and then pay
     (`server/api/orders/[orderId]/payments.post.ts`); ⚠ not verified that S2 needs two separate clicks, so
     whether one hijacked click can complete a payment is untested.
5. **Launch token checks** as listed in §3 (signature, expiry, one use, no token left in the URL).
6. **NFR-016 holds unchanged.** The CSP already loads nothing from other origins (`nuxt.config.ts:15-17`). Keep it.
   Do not load any Cerbo script into our page; talk to the parent only with `postMessage`, checking the sender's
   origin, if resizing is needed (⚠ not built).
7. **Update the threat model.** Add a TB-6 "Cerbo host page → our frame" boundary to `docs/architecture/hld.md` §5
   with threats for forged launch, framing by others, and cross-site writes.

## 6. Phases with exit checks

| Phase | Work | Exit check |
|---|---|---|
| E0 Ask | Partner answers Q-1 to Q-4 (§7) | Answers written into this file with their source; ⚠ marks removed or kept |
| E1 Harden first, still standalone | CSRF token plus Origin check (§5 item 3); a test that a cross-site POST to EP-22 is refused | New unit test fails if the check is removed; `make check` green; SEC-5 closed in `docs/security/CHECKLIST.md` |
| E2 Launch | Launch-token verify endpoint, one-time-id table, outside-id columns on `users` and `practices`, map Cerbo ids to roles | Tests: valid token opens a session; expired, reused, wrong-key and tampered tokens are refused; a provider's token cannot open another practice's patient (extends TH-4) |
| E3 Frame | `frame-ancestors` allowlist from a setting; cookie `SameSite=None; Secure; Partitioned`; ops pages stay `'self'` | `hardening.test.ts` expects the allowlist on chart and portal pages and `'self'` on ops; a manual check in a test Cerbo sandbox (⚠ exists?) shows S1 inside a chart |
| E4 Pilot | One fictional practice in a Cerbo test tenant; S1, S5, S6, S16, S2 in their slots | Each embedded page loads only same-origin assets (NFR-016); full order and pay journey works inside the frame; idle sign-out shows the reopen message |
| E5 Retire stand-ins | Remove password sign-in for embedded roles; keep it, or move to staff SSO, for operations | No embedded role can reach S8; A-12 and C-3 updated in the PRD |

Each phase is its own milestone with the normal gates. E1 is worth doing even if embedding never happens.

## 7. Open questions

| Id | Question | Why it matters | Who closes it |
|---|---|---|---|
| Q-1 | Which exact origins host Cerbo's chart and patient portal? | the `frame-ancestors` allowlist (§5 item 1) | partner |
| Q-2 | How does Cerbo show partner pages: iframe, tab, pop-up or link? | decides whether §5 items 1, 2 and 4 are needed at all | partner |
| Q-3 | Does Cerbo offer SMART on FHIR, OAuth/OIDC, or signed launch tokens to partners? | picks option A, B or C in §3 | partner |
| Q-4 | Does a Cerbo test tenant exist for partners? | E3 and E4 exit checks need one | partner |
| Q-5 | Should order and payment status flow back into the chart (R02 F9)? | a new write into Cerbo, and a new trust boundary | partner and product owner |
| Q-6 | How do platform staff sign in once the stand-in is retired? | ops pages stay outside Cerbo (§2) | product owner |
| Q-7 | Which browsers must work with third-party cookies blocked? | may need the Storage Access API (§5 item 2) | partner |

<!-- pictures:start -->
## Diagrams

Today's context (what changes when Cerbo hosts the pages) and today's sign-in, which the launch token replaces.

**System context: who uses the store and which outside systems it talks to**

[![System context: who uses the store and which outside systems it talks to](diagrams/img/hld-context.png)](diagrams/img/hld-context.png)

**Sequence: sign in and idle sign-out**

[![Sequence: sign in and idle sign-out](diagrams/img/sequence-sign-in.png)](diagrams/img/sequence-sign-in.png)
<!-- pictures:end -->
