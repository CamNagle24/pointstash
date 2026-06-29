# PointStash — Decisions (ADR log)

Append-only. Newest first.

## 2026-06-29 — Connector graduation: pick the first chain to move off scrape/manual

**Goal:** ROADMAP.md's "Next" item — "More chains / connectors graduating from
scrape to official APIs." `src/lib/connectors/` has 17 `BaseConnector` subclasses,
every one a documented-but-unimplemented stub (`implemented = false`); `src/lib/
scrapers/sources.ts`'s comment flags `pancheros`, `culvers`, `buffalowildwings`,
`kfc`, and `pandaexpress` as having no scrapeable deals text source either (JS-only
SPAs or bot-walled), so for these five a real loyalty-API connector is the only
path to anything beyond MANUAL/SCREENSHOT entry. This decision picks which of
those five graduates first.

### Survey (from each connector stub's own research notes)

| Chain | Vendor / platform | Auth shape | Documented blocker |
|---|---|---|---|
| `pancheros` | Paytronix (3rd-party, multi-tenant) | email+pwd → session cookie | none noted |
| `pandaexpress` | In-house, mirrors `chipotle.ts`'s shape | email+pwd → Bearer JWT | "unverified at scale" |
| `kfc` | Yum! Brands (shared with `tacobell.ts`) | email+pwd → Cognito JWT | none noted, but needs live traffic capture to confirm headers |
| `culvers` | In-house, no shared platform identified | email+pwd → Bearer JWT | "auth flow is unverified" |
| `buffalowildwings` | Inspire Brands (shared with `dunkin.ts`) | email+pwd → Bearer JWT | Akamai bot manager — same wall blocking Dunkin' |

### Pick: `pancheros`

Two things make it lowest-risk to go first, not just lowest-friction:
1. **No bot-wall blocker documented** — `buffalowildwings` inherits Dunkin's
   Akamai problem outright; `pandaexpress`/`culvers` are explicitly flagged
   "unverified"/"unverified at scale." Pancheros is the only one of the five
   with neither caveat.
2. **Paytronix is a shared vendor**, not an in-house API — it's the loyalty
   backend behind a large number of independent restaurant chains, so its
   request/response shape is comparatively well-trodden ground (third-party
   API clients and writeups exist for the platform in general, even where
   Pancheros-specific traffic hasn't been captured yet). `pancheros.ts`'s own
   comment already calls this out: "once this connector is real, the same
   shape should cover other Paytronix brands" — first-mover investment here
   pays off again the next time a Paytronix-backed chain gets added.
3. Session-cookie auth has no separate access/refresh token pair to manage —
   simpler `authenticate`/`getPointsBalance` contract than the JWT chains,
   which matters because `BaseConnector.refreshToken` doesn't cleanly apply to
   a cookie session anyway (see below).

### Decomposition (implementation tasks, in order)

1. **Encrypt `Account.credentials` at rest.** It's an unused `Json?` column
   today (`prisma/schema.prisma:179`) — nothing reads or writes it yet. Before
   *any* connector goes live, add an `encrypt`/`decrypt` helper (AES-GCM,
   keyed off a new `CREDENTIALS_ENCRYPTION_KEY` env var — do not derive it from
   `AUTH_SECRET`, which has its own rotation lifecycle) and route all
   `credentials` reads/writes through it. This is a prerequisite for every
   future connector, not just Pancheros — security sign-off required before
   merge per `agents/security.md`.
2. **`PaytronixConnector` base class** in `src/lib/connectors/paytronix.ts` —
   shared `authenticate`/`getPointsBalance` logic parametrized by per-brand
   config (base URL, brand ID), so the next Paytronix chain is a config object,
   not a rewrite. `PancherosConnector extends PaytronixConnector`.
3. **Live traffic verification** — confirm the login/balance endpoint shapes
   `pancheros.ts`'s comment already guesses at (`/api/paytronix/login`,
   `/api/paytronix/balance`) against the real site before wiring real request
   code; adjust the connector to match what's actually observed.
4. **`authenticate()`** — POST credentials, store the session cookie (via the
   encryption helper from #1) + a conservative estimated expiry in
   `Account.credentials`. **`refreshToken()`** deviates from the literal
   per-token-refresh contract: Paytronix sessions aren't independently
   refreshable, so this re-runs `authenticate()` with the stored credentials
   instead of exchanging a refresh token. Document the deviation in the class
   so future connectors with real refresh tokens don't copy this shortcut.
5. **Sync cron** — `GET /api/cron/sync-accounts`, cron-secret guarded
   (`isCronRequest`, mirroring `/api/cron/affordable-redemptions`). Iterates
   `Account`s where `syncMethod === "API"` and `getConnector(chainSlug)
   ?.implemented`, skipping any synced within a floor interval (start at 6h)
   to keep Pancheros's request volume conservative — there's no published
   rate limit, so the floor is a deliberately cautious guess, not a measured
   number. Updates `currentPoints` + inserts `PointsHistory`
   (`changeReason: "SYNC"`, already in the `ChangeReason` enum — no migration
   needed there).
6. **Connect-account flow** — a `POST /api/accounts/[id]/connect` route
   collecting Paytronix email/password from `AddAccountModal` and calling
   `authenticate()`. Once `PancherosConnector.implemented` flips to `true`,
   `hasImplementedConnector()` (`src/lib/connectors/index.ts`) already gates
   the modal's "Auto-sync" option — no UI registry change needed beyond this
   route and the credential-collection step itself.
7. **Un-flag `implemented = true` on `PancherosConnector` only** once 3–6 are
   verified end-to-end against the real Pancheros site. The other four chains
   stay stubs pending their own future decisions.

### What this design does NOT do
- Does not touch `culvers`/`buffalowildwings`/`kfc`/`pandaexpress` — they
  remain `NotImplementedError` stubs; whichever graduates next gets its own
  decision entry once #1–7 above prove the pattern out.
- Does not change `AddAccountModal`'s MANUAL/SCREENSHOT paths — Auto-sync is
  additive, not a replacement.
- Does not add a generic plugin/webhook system for arbitrary loyalty vendors —
  one shared `PaytronixConnector` base class is enough leverage for now; a
  broader abstraction isn't justified until a second non-Paytronix connector
  is real.

---

## 2026-06-19 — Affordable-redemption-alert design

**Goal:** ROADMAP.md's "Alerts when a high-value redemption becomes affordable" —
email a user when their points balance on a linked account crosses the cost of a
worthwhile redemption they couldn't previously afford.

### What counts as "high-value"
No new arbitrary value threshold. A chain's **best redemption** (the highest
`centsPerPoint` option for that `chainId`, exactly what `bestRedemptionFor` in
`src/lib/dashboard.ts` already computes and surfaces as the account card's
headline "best deal") *is* the high-value target. Reusing the existing value
engine keeps this consistent with what the dashboard already calls out, instead
of inventing a second, divergent notion of "high-value."

### Detection: cron, not on-sync
Balances change from several independent code paths today (`PUT
/api/points/update`, `POST /api/accounts/[id]/redeem`, OCR-prefilled saves) and
will gain more as connectors graduate from stubs (`src/lib/connectors/`).
Hooking an affordability check into every mutation site is fragile — easy to
miss a path, and each new sync method becomes another place to remember it.
`deal-reminders` already established the precedent: a single daily cron sweep
over all data, rather than per-mutation triggers. Affordability alerts follow
the same shape — a daily `GET /api/cron/affordable-redemptions` cron (guarded by
`isCronRequest`, mirroring `/api/cron/deal-reminders`) scans every active
`Account`, computes its chain's best redemption via `bestRedemptionFor`, and
flags `currentPoints >= best.pointsCost`.

### Idempotency
New `AffordabilityAlert` model (mirrors `DealReminder`'s role, adapted to this
case): `{ id, accountId, userId, redemptionOptionId, sentAt }`, unique on
`[accountId, redemptionOptionId]`. Unlike `Deal` rows (which churn — re-created
by every scrape/extension sync, hence `DealReminder`'s stable-string-key
idempotency), `RedemptionOption` rows are static seeded catalog data, so a
direct id-based uniqueness constraint is sufficient — no stable-key indirection
needed. `userId` is stored alongside `accountId` for query/index convenience
even though it's derivable via `Account.userId`, matching the existing
`PointsHistory` precedent of storing both.

Alerts fire **once, ever**, per `(accountId, redemptionOptionId)` pair — not
re-armed if the balance later drops below cost (e.g., after a redemption) and
rises again. That re-arming behavior is a deliberate non-goal for this first
pass (see below), not an oversight.

### New notification type, not a digest piggyback
The existing deal-reminder email's framing ("this is about to disappear, act
now") is semantically the opposite of this alert's framing ("good news, you've
earned enough — go redeem"). Reusing `sendExpiringDealsEmail`'s template would
require conditional branching that muddies both messages. Instead: a new
`sendAffordableRedemptionEmail` (mirrors `deal-reminder-email.ts`'s Resend
send-or-log-in-dev plumbing, unsubscribe-token reuse, and html/text builders)
and a new independently-toggleable `User.notifyAffordable Boolean @default(true)`
preference, alongside the existing `notifyExpiring`/`notifyDeals`/`notifyDigest`
columns and their Settings → Notifications toggles
(`src/app/dashboard/settings/page.tsx`).

### Schema changes (Prisma migration required)
- `User.notifyAffordable Boolean @default(true)`.
- `AffordabilityAlert { id, accountId, userId, redemptionOptionId, sentAt }`,
  `@@unique([accountId, redemptionOptionId])`, `@@index([userId])`, cascading
  FKs to `Account`, `User`, and `RedemptionOption`.

### Implementation tasks (inserted at top of the queue, in order)
1. Prisma migration for `User.notifyAffordable` + `AffordabilityAlert`; keep
   `prisma/seed.ts` idempotent.
2. `src/lib/affordable-alerts.ts` — pure helpers (mirrors `deal-reminders.ts`):
   given accounts + redemption options + already-alerted keys, return the
   newly-crossed-affordable set, reusing `bestRedemptionFor`.
3. `src/lib/affordable-alert-email.ts` — `sendAffordableRedemptionEmail`,
   mirroring `deal-reminder-email.ts`'s structure.
4. `GET /api/cron/affordable-redemptions` route (cron-secret guarded) wiring
   #2 + #3 together, returning `{ ok, candidates, sent, logged, errors }` like
   `/api/cron/deal-reminders`; register it in `vercel.json`'s `crons` array.
5. Settings UI: add an "Affordable redemption alerts" toggle for
   `notifyAffordable` next to the existing three notification toggles.
6. Unit + cron-integration test coverage for #2–#4, mirroring
   `deal-reminders.test.ts` / `deal-reminder-email.test.ts` /
   `api-deal-reminders-cron.test.ts`.

### What this design does NOT do
- No re-arming: once alerted for a given `(account, redemptionOption)` pair,
  never again — even if the balance dips and re-crosses the threshold later.
  A future task can revisit this if it proves to matter in practice.
- No per-redemption-option granularity beyond the chain's single best option —
  a user isn't alerted for every affordable option, only the best one per chain.
- No change to the existing deal-expiry reminder email or its cron.

---

## 2026-06-16 — Redemption-completion flow design

**Goal:** Let users mark that they have redeemed a `RedemptionOption` (e.g., "I just
used 500 Wendy's points on a Frosty"), deduct the `pointsCost` from the linked
account's `currentPoints`, and record the change in `PointsHistory`.

### Schema assessment
No new tables needed. The existing models cover everything:
- `Account.currentPoints` — the balance to deduct from.
- `RedemptionOption.pointsCost` — the cost to deduct.
- `PointsHistory.changeReason` already includes `"REDEMPTION"`.
- `Account` is scoped to a single user via `userId` — no cross-user risk.

### API route
**`POST /api/accounts/[id]/redeem`**
- Auth: `requireAuth`; the account's `userId` must match the session user.
- Body: `{ redemptionOptionId: string }` (the catalog item being redeemed).
- Validation (z.object): account existence + ownership (404 not 403), option
  belongs to the same chain (`option.chainId === account.chainId`), user has
  enough points (`account.currentPoints >= option.pointsCost`).
- Atomic DB transaction: deduct points (`Account.update`) + create `PointsHistory`
  row (`changeReason: "REDEMPTION"`, `previousPoints`, `newPoints`,
  `lastSynced = now()`).
- Response `200 { account, pointsHistory }` or appropriate error status.

### UI affordance
A secondary **"Mark as Redeemed"** button/link on `RedeemPage` (alongside the
existing "View deal" external-link CTA) and a compact icon-button on `DealCard`
for redemption options the user can currently afford. Opens a confirmation sheet
(name of item, points cost, resulting balance) before calling the API. On
success, SWR's `useAccounts` + `usePoints` keys are invalidated so the balance
updates live.

### Implementation tasks (to be inserted at top of queue in order):
1. `POST /api/accounts/[id]/redeem` route + unit tests.
2. Confirmation UI on `RedeemPage` / `DealCard` + SWR invalidation.
3. Playwright E2E for the full redeem flow (unblocks the existing blocked task).

### What this design does NOT do
- No new Prisma migration needed.
- No redemption record beyond PointsHistory (history row is the audit trail).
- The existing "Redeem CTA" deep-links to the chain app remain unchanged — this
  feature is additive and records what the user already did in the chain app.

---

## 2026-06-14 — Adopt agent + routine workflow
Added `docs/` (PROJECT/ARCHITECTURE/TASKS/DECISIONS/ROADMAP alongside the existing
API/DEPLOYMENT/SCRAPER guides) and role-based `agents/`. A daily cloud routine pulls the
top task from `docs/TASKS.md`, implements it on a `routine/<slug>` branch, runs checks,
and opens a PR. Routines never push to `main`, never merge, never touch `.env`/secrets.
**Why:** safe autonomous progress while the owner is away; reviewable PRs only.
