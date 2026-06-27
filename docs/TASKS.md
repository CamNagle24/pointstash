# PointStash — Task Queue

The **daily routine** takes the **top unblocked** unchecked task, implements it on a
`routine/<slug>` branch, and opens a PR.

Format: `- [ ] <title> — <acceptance criteria>`
- Top = highest priority. A `> blocked: <reason>` line skips a task until cleared.
- The routine ticks `[x]` inside its PR.

## Queue

- [ ] Security: fix pre-account-takeover via unverified-email account linking — `src/lib/auth.ts`'s `signIn` callback does `db.user.upsert({ where: { email: user.email }, ... })` for Google sign-ins with no `emailVerified` gating, and `POST /api/auth/signup` (`src/app/api/auth/signup/route.ts`) creates credentials users with zero proof of email ownership; `prisma/schema.prisma`'s `User` model has no `emailVerified` field at all. Concretely: an attacker can sign up with `victim@example.com` plus an attacker-chosen password (no inbox access needed), and when the real victim later signs in with "Sign in with Google" using that same address, the `upsert` silently attaches their Google identity to that *same* `User` row — the attacker's password stays valid on it, giving the attacker standing credentials access to an account the victim believes is exclusively theirs. Add `User.emailVerified DateTime?` via migration; only auto-link when it's set, otherwise require a verification step before linking. Unit tests: unverified existing user + Google sign-in does NOT grant access to the attacker-created row; verified existing user + Google sign-in still links cleanly (no regression); brand-new Google sign-in still creates a user as today.
  > blocked: PR #98 (open) already implements this fix — awaiting review/merge; re-check after it lands or closes.
- [ ] Affordable-redemption-alert: cron route — `GET /api/cron/affordable-redemptions`, cron-secret guarded (`isCronRequest`), wiring the detection helper + email together and recording `AffordabilityAlert` rows; returns `{ ok, candidates, sent, logged, errors }` like `/api/cron/deal-reminders`; register it in `vercel.json`'s `crons` array; integration tests mirroring `tests/unit/api-deal-reminders-cron.test.ts`.
- [ ] Affordable-redemption-alert: Settings UI toggle — add an "Affordable redemption alerts" switch wired to `notifyAffordable` next to the existing `notifyExpiring`/`notifyDeals`/`notifyDigest` toggles in `src/app/dashboard/settings/page.tsx`.
- [ ] Playwright E2E for the redeem flow — sign in (seeded/MSW), view a deal, complete a redeem, see the balance update.
- [ ] Playwright E2E for the OCR screenshot upload flow — on `/dashboard/accounts`, upload a fixture screenshot via `AddAccountModal`'s screenshot method, confirm the OCR-extracted point total pre-fills the balance field, and saving updates the account's displayed balance.
  > blocked: no `DATABASE_URL`/Postgres instance is available in the routine's sandbox and `.github/workflows/ci.yml` doesn't run `test:e2e`, so a real Playwright run against `/dashboard/accounts` can't be driven or verified end-to-end here. Needs a provisioned test DB (or a documented Postgres-less fixture strategy) wired into CI before this can be implemented and checked green.

## Done
<!-- routine PRs move completed items here -->

- [x] Unit tests for `replaceAutoDeals` in `src/lib/deals.ts` — mocks `db.deal.deleteMany`/`createMany`/`$transaction` in `tests/unit/deals.test.ts`; asserts the chain/auto-source scoping, `deleteMany` runs before `createMany`, zero deals still clears existing auto deals, and the return value equals the row count.
- [x] Rate-limit `POST /api/auth/signup` by IP — added a `SignupAttempt` Prisma model (hashed IP + `createdAt`, via migration `20260620153316_add_signup_attempt`), `getClientIp`/`hashClientIp` helpers in `src/lib/api.ts`, and a 5-per-IP-per-hour cap returning 429 in `src/app/api/auth/signup/route.ts`; extended `tests/unit/api-auth-signup.test.ts` with under-cap/at-cap/scoping/hash cases.
- [x] Add CI workflow `.github/workflows/ci.yml` — `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:run` on PRs to main; green on default branch.
- [x] OCR edge-case tests in `src/lib/ocr.ts` — common OCR artifacts are corrected per chain; malformed input fails gracefully (no throw).
- [x] API auth/cron guard tests — `requireAuth` rejects unauthenticated calls; `isCronRequest` only accepts the configured cron secret.
- [x] Cents-per-point ranking unit tests — given balances + redemption options, the highest cents-per-point redemption is surfaced first; ties and zero-point cases handled.
- [x] Unit tests for the connectors registry (`src/lib/connectors/`) — `getConnector` returns the right connector per chain slug and `undefined` for unknown slugs; `hasImplementedConnector` reflects each connector's `implemented` flag; every unimplemented connector's `authenticate`/`getPointsBalance`/`getRecentTransactions`/`refreshToken` reject with `NotImplementedError`.
- [x] Harden `isCronRequest` against an unset `CRON_SECRET` — rejects empty/undefined `CRON_SECRET` regardless of header value; regression coverage in `tests/unit/api-guards.test.ts`.
- [x] Fix lint warnings in `src/lib/connectors/base.ts` — eslint-disable scoped to the stub file's intentionally-unused parameters; `npm run lint` is clean.
- [x] API tests for `/api/accounts/[id]` edge cases — `PUT`/`DELETE` return 404 (not 403) for a cross-user account; invalid/non-numeric `currentPoints` rejected with 400; per-user scoping verified in `tests/unit/api-accounts.test.ts`.
- [x] Unit tests for `src/lib/deal-reminder-email.ts` — subject/body rendering for 0, 1, and many upcoming-expiry deals (pluralization), and multi-chain digests, in `tests/unit/deal-reminder-email.test.ts`.
- [x] Unit tests for `src/lib/extension-auth.ts` and `src/lib/extension-bridge.ts` — pairing-token issuance and rejection of malformed/revoked tokens in `tests/unit/extension-auth-unit.test.ts` and `tests/unit/api-extension-pair.test.ts`.
- [x] Unit tests for `src/lib/points-history.ts` — `buildBalanceSeries` covered for empty input, chronological ordering, single-change anchoring, and no-mutation in `tests/unit/points-history-series.test.ts`.
- [x] Edge-case unit tests for `src/lib/deal-reminders.ts` — exact reminder-cutoff boundary, missing `expiresAt`, and already-reminded (no duplicate) cases in `tests/unit/deal-reminders.test.ts`.
- [x] Fix 403→404 existence-disclosure in `GET /api/points/history?accountId` — uses `db.account.findFirst({ where: { id, userId } })`; regression test in `tests/unit/api-points.test.ts` verifies another user's `accountId` returns 404, not 403.
- [x] `requireAdmin` unit tests — 401 with no session, 403 for a non-admin email, fail-closed 403 for an empty/unset `ADMIN_EMAIL`, case-insensitive match, and comma-separated-list support, in `tests/unit/api-guards.test.ts`.
- [x] Unit tests for `mintExtensionToken` and `hashExtensionToken` in `src/lib/extension-auth.ts` — `tests/unit/extension-auth-lib.test.ts`.
- [x] Unit tests for `verifyUnsubscribeToken` in `src/lib/unsubscribe-token.ts` — round-trip, wrong-secret, truncated, empty, and tampered-payload cases in `tests/unit/unsubscribe-token.test.ts`.
- [x] Unit tests for `parseIntParam` in `src/lib/api.ts` — `tests/unit/parse-int-param.test.ts`.
- [x] Unit tests for `estimatedDealValueCents` and `totalEstimatedDollars` in `src/lib/dashboard.ts` — `tests/unit/dashboard-deal-value.test.ts`.
- [x] API integration test for `GET /api/cron/deal-reminders` — cron-secret guard, zero-candidate stats shape, and per-user send errors captured without aborting the batch, in `tests/unit/api-deal-reminders-cron.test.ts`.
- [x] Unit tests for `affordableDealCount` in `src/lib/dashboard.ts` — `tests/unit/dashboard-affordable-count.test.ts`.
- [x] API integration test for `GET /api/cron/scrape-deals` — cron-secret guard, per-chain error isolation, and `chainsScanned`/`dealsInserted`/`dealsDeactivated` in the response, in `tests/unit/api-cron-scrape-deals.test.ts`.
- [x] CI: add `prisma generate` step before typecheck and tests in `.github/workflows/ci.yml` so fresh CI runs don't fail with `Module '"@prisma/client"' has no exported member` errors.
- [x] Rate-limit password-reset email sends — `POST /api/auth/forgot-password` skips minting/sending (still returns `{ ok: true }`) once a user has 3+ tokens created in the last hour; tests in `tests/unit/api-auth-password.test.ts`.
- [x] Affordable-redemption-alert: schema migration — `User.notifyAffordable Boolean @default(true)` and the `AffordabilityAlert` model (`{ id, accountId, userId, redemptionOptionId, sentAt }`, unique on `[accountId, redemptionOptionId]`, indexed on `userId`, cascading FKs) landed via PR #81.
- [x] Affordable-redemption-alert: detection helpers — `src/lib/affordable-alerts.ts` landed via PR #88.
- [x] Affordable-redemption-alert: email — `src/lib/affordable-alert-email.ts` with `sendAffordableRedemptionEmail` landed via PR #89.
- [x] Architect: design an "affordable redemption alert" feature — decomposition recorded in `docs/DECISIONS.md` via PR #79.
- [x] Implement `POST /api/accounts/[id]/redeem` — verifies account ownership (404), chain match and sufficient balance (400), then atomically deducts `pointsCost` and inserts a `PointsHistory` row with `changeReason: "REDEMPTION"`; `tests/unit/api-accounts-redeem.test.ts`.
- [x] DX: add a Husky + lint-staged pre-commit hook — `.husky/pre-commit` runs `lint-staged` (`eslint --fix` on staged files) then `npm run typecheck`; documented in `docs/DEPLOYMENT.md`.
- [x] Unit tests for `mapScrapedDeal` and `deactivateExpiredDeals` in `src/lib/deals.ts` — covered in `tests/unit/deals.test.ts`.
- [x] Unit tests for `hashResetToken`, `mintResetToken`, and `resetTokenExpiry` in `src/lib/reset-tokens.ts` — `tests/unit/reset-tokens-lib.test.ts`.
- [x] Unit tests for `sendResetEmail` in `src/lib/reset-tokens.ts` — covered alongside the above in `tests/unit/reset-tokens-lib.test.ts` (dev-log, production-throw, Resend-error, and happy-path cases).
- [x] Unit tests for `bestRedemptionFor` and `bestRedemptionLabel` in `src/lib/dashboard.ts` — `tests/unit/dashboard-best-redemption.test.ts`.
- [x] Unit tests for `dealTypeLabel` and `discountTypeLabel` in `src/lib/formatters.ts` — `tests/unit/formatters.test.ts`.
- [x] API integration tests for `PUT /api/points/update` — `tests/unit/api-points-update.test.ts`.
- [x] Accessibility: aria-label on icon-only buttons in `ChainAccountCard` and nav components — `tests/unit/icon-button-accessibility.test.tsx` covers `ChainAccountCard`, `MobileNav`, and `Sidebar`; `DealCard`'s only action button always renders visible text (`Redeem`/`View deal`/`Open in app`) alongside its icon, so it never had an icon-only-button gap.
- [x] Add stub `BaseConnector` entries for the 7 chains missing from the connectors registry — `src/lib/connectors/index.ts` now registers every chain in `CHAINS`.
- [x] Add OCR point-pattern regexes for chains using the generic fallback — `POINTS_PATTERNS` in `src/lib/ocr.ts` now has an entry for every chain.
- [x] Add a bespoke Cheerio scraper for `chipotle` — `src/lib/scrapers/chipotle.ts`, registered in `src/lib/scrapers/index.ts`'s `scrapers` map.
- [x] Migrate off deprecated `next lint` — `package.json`'s `lint` script now runs `eslint .` directly.
- [x] Fix per-chain error isolation in deal-scraping routes — landed via PR #82.
- [x] Return 400 (not 500) for a corrupt or spoofed image upload in `POST /api/upload` — landed via PR #83.
- [x] Add standard security response headers — `next.config.ts`'s `headers()` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on all routes; landed via PR #84.
- [x] Bring `docs/API.md` up to date with the real route list — landed via PR #90.
- [x] Add `aria-current="page"` to the active dashboard nav link — landed via PR #91.
