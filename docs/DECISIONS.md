# PointStash — Decisions (ADR log)

Append-only. Newest first.

## 2026-07-04 — First connector to graduate: Panda Express

**Goal:** Per ROADMAP.md's "Next" item, pick which of the five stub-only chains
(`pancheros`, `culvers`, `buffalowildwings`, `kfc`, `pandaexpress`) should become
the first real API connector, and decompose the work.

### Candidate survey

| Chain | Platform | Auth flow | Known obstacles |
|---|---|---|---|
| Pancheros | Paytronix (`pancheros.com/api/paytronix/*`) | Email + password → session cookie | Paytronix partner API requires B2B credentials; chain's proxy endpoint is unversioned |
| Culver's | Unknown first-party | Email + password → Bearer JWT | No shared platform identified; auth flow unverified |
| Buffalo Wild Wings | Inspire Brands (same as Dunkin') | Email + password → CMA token | Akamai bot-manager blocks automated login — the identical hurdle blocking `dunkin.ts` |
| KFC | Yum! Brands / AWS Cognito (same as Taco Bell) | Cognito PKCE → Cognito JWT | Cognito device-fingerprinting adds a second round-trip; KFC-specific client ID not yet confirmed |
| **Panda Express** | First-party `pandaexpress.com` loyalty API | Email + password → Bearer JWT | None observed yet; `pandaexpress.ts`'s comment notes "no bot wall observed yet, but unverified at scale" |

### Decision: Panda Express first

Panda Express wins on three grounds:

1. **Lowest friction.** No bot wall observed, no third-party platform dependency, standard
   Bearer-JWT flow identical to the Chipotle connector design (same comment in the source:
   "Shape mirrors chipotle.ts closely (same loyalty platform vendor)"). Chipotle's
   endpoint map (`POST /api/auth/login`, `GET /api/loyalty/me`,
   `GET /api/loyalty/transactions`) transfers directly.

2. **No new schema.** `Account.credentials Json?` already stores arbitrary JSON and
   `SyncMethod.API` is already an enum value — neither landed in this session, they
   pre-exist. The connector can store `{ accessToken, refreshToken, expiresAt }` in
   `credentials` with AES-256-GCM encryption (same pattern as `ExtensionToken.tokenHash`
   for the key-derivation layer, adapted for two-way retrieval rather than one-way hash).
   No Prisma migration needed.

3. **Generalizability second.** Once the encrypt/store/refresh pattern is proven for
   Panda Express, KFC (Yum!/Cognito) is a host swap on top of the same scaffolding,
   and the Akamai mitigation work for Buffalo Wild Wings / Dunkin' can share any
   retry/cookie-jar logic introduced here.

### Deferred (and why)

- **Pancheros**: Paytronix's official API is B2B (requires a merchant contract). The
  `pancheros.com/api/paytronix/*` chain-proxy is undocumented and unversioned —
  invest here only after Panda Express proves the scaffolding.
- **Culver's**: Privately held, no platform identified; auth flow entirely unverified.
  Validate in a later research spike.
- **Buffalo Wild Wings**: Akamai bot wall is a real blocker — tackle Akamai mitigation
  (rotating user-agents, TLS fingerprint spoofing, or a headless-browser fallback) as
  a dedicated cross-cutting task that then unblocks both BWW and Dunkin'.

### Encrypted credential storage

`Account.credentials` is already `Json?` and encrypted at rest by Supabase's disk
encryption. For field-level encryption (defense-in-depth — protects against a
credential dump even if the DB row is leaked), use Node's `crypto.subtle` AES-256-GCM:

- Key derived from `process.env.CREDENTIALS_ENCRYPTION_KEY` (32-byte hex; new env var
  to document in `.env.example`, `docs/DEPLOYMENT.md`).
- Helper `src/lib/connector-crypto.ts`: `encryptCredentials(token: AuthToken): string`
  and `decryptCredentials(blob: string): AuthToken`, wrapping `subtle.encrypt` /
  `subtle.decrypt`.
- Stored as `{ iv: <base64>, ciphertext: <base64> }` in `Account.credentials`.
- On `DELETE /api/accounts/[id]` the row (and its credentials) are already cascade-deleted.

### Rate limits

No published rate-limit docs for Panda Express's loyalty API. Defensive defaults:
- Max 1 auto-sync per account per hour (enforced in the cron by comparing
  `Account.lastSynced` — if within 60 minutes, skip).
- Exponential back-off (1 s, 2 s, 4 s) on 429 / 503 responses before marking the
  account sync as failed.

### Implementation tasks (inserted at top of queue, in order)

1. `src/lib/connector-crypto.ts` — `encryptCredentials` / `decryptCredentials` with
   AES-256-GCM; document `CREDENTIALS_ENCRYPTION_KEY` in `.env.example` and
   `docs/DEPLOYMENT.md`; unit tests (round-trip, wrong-key throws, missing env rejects).
2. Implement `PandaExpressConnector` in `src/lib/connectors/pandaexpress.ts` —
   `authenticate` (POST `/api/auth/login` → store encrypted token), `getPointsBalance`
   (GET `/api/loyalty/me`), `getRecentTransactions` (GET `/api/loyalty/transactions`,
   cursor pagination), `refreshToken`; set `implemented = true`; unit tests mocking
   `fetch` for each method + a 429 back-off case.
3. `GET /api/cron/sync-connector-accounts` — cron-secret guarded, iterates
   `API`-synced accounts with non-null `credentials`, calls
   `connector.getPointsBalance()` + `getRecentTransactions()`, writes
   `PointsHistory` rows (`changeReason: SYNC`), updates `Account.currentPoints` +
   `lastSynced`; returns `{ ok, synced, errors }` mirroring other cron routes;
   register in `vercel.json`; unit tests.
4. UI: expose "Auto-sync" as a third option in `AddAccountModal` when
   `hasImplementedConnector(chainId)` is true — collect email + password, call a new
   Server Action `connectAccount(accountId, credentials)` that calls
   `connector.authenticate()`, stores the encrypted token, sets
   `syncMethod: API`; show "Last auto-synced: \<relative time\>" in
   `ChainAccountCard` when `syncMethod === "API"`; E2E test.

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
