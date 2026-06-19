# PointStash — Task Queue

The **daily routine** takes the **top unblocked** unchecked task, implements it on a
`routine/<slug>` branch, and opens a PR.

Format: `- [ ] <title> — <acceptance criteria>`
- Top = highest priority. A `> blocked: <reason>` line skips a task until cleared.
- The routine ticks `[x]` inside its PR.

## Queue

- [ ] Playwright E2E for the redeem flow — sign in (seeded/MSW), view a deal, complete a redeem, see the balance update.
  > blocked: the "Mark as Redeemed" UI affordance is implemented and awaiting review in `routine/redeem-ui-affordance` (PR open) — once that merges to main, this E2E can drive `RedemptionTable`'s confirm dialog end to end.
- [ ] Playwright E2E for the OCR screenshot upload flow — on `/dashboard/accounts`, upload a fixture screenshot via `AddAccountModal`'s screenshot method, confirm the OCR-extracted point total pre-fills the balance field, and saving updates the account's displayed balance.
- [ ] Unit test for `isExtensionConfigured` in `src/lib/extension-bridge.ts` — `chainHasExtensionSupport`/`EXTENSION_SUPPORTED_CHAINS` are already covered in `tests/unit/extension-auth-unit.test.ts`, but `isExtensionConfigured` (returns false when `NEXT_PUBLIC_EXTENSION_ID` is unset, true when set) has no test; add one to that file or a new `tests/unit/extension-bridge-lib.test.ts`.
- [ ] Unit tests for `replaceAutoDeals` in `src/lib/deals.ts` — mock db, verify `$transaction` receives `[deleteMany(chainId, AUTO_SOURCES), createMany(rows)]` in that order; zero scraped deals still clears existing auto deals; return value equals the number of deals passed in; extend `tests/unit/deals.test.ts`.
- [ ] Unit tests for `sendResetEmail` in `src/lib/reset-tokens.ts` — mock Resend; in non-production with `RESEND_API_KEY` unset, the function logs the reset link and returns (no throw); in production with no key, it throws `"RESEND_API_KEY is not configured"`; Resend send returning `{ error }` throws with the error message; happy path calls Resend with correct `to`, `from`, `subject`, and `html`/`text` containing the reset link.
- [ ] Add stub `BaseConnector` entries for the 7 chains missing from the connectors registry — `pancheros`, `dairyqueen`, `culvers`, `jimmyjohns`, `buffalowildwings`, `kfc`, and `pandaexpress` have no entry in `src/lib/connectors/index.ts`, so `getConnector` returns `undefined` instead of a connector whose `authenticate`/`getPointsBalance`/`getRecentTransactions`/`refreshToken` reject with `NotImplementedError` (mirror the existing 10 connectors); extend `tests/unit/connector-registry.test.ts` so every chain in `CHAINS` resolves to a connector.
- [ ] Add OCR point-pattern regexes for chains using the generic fallback — `chipotle`, `pancheros`, `dairyqueen`, `culvers`, `jimmyjohns`, `buffalowildwings`, `kfc`, and `pandaexpress` have no entry in `POINTS_PATTERNS` (`src/lib/ocr.ts`) and silently degrade to the low-confidence `FALLBACK` regex; add a chain-specific high-confidence pattern for each (check each chain's actual rewards terminology) plus high-confidence fixtures in `tests/unit/ocr-patterns.test.ts`.
- [ ] Add a bespoke Cheerio scraper for `chipotle` — mirror the pattern in `src/lib/scrapers/wendys.ts`, register it in `src/lib/scrapers/index.ts`'s `scrapers` map, and add a unit test with a fixture HTML page under `tests/unit/scrapers/` (see `tests/unit/scrapers/wendys.test.ts`), so Chipotle deal scraping doesn't depend solely on `ANTHROPIC_API_KEY` being configured.
- [ ] Rate-limit password-reset email sends — `POST /api/auth/forgot-password` (`src/app/api/auth/forgot-password/route.ts`) mints and emails a fresh reset token on every request with no cap, so a known email can be spammed with reset emails; using the existing `PasswordResetToken` table, skip minting/sending (still return `{ ok: true }`, to preserve the no-enumeration guarantee) once a user has more than N (e.g. 3) tokens created in the last hour; add tests to `tests/unit/api-auth-password.test.ts`.
- [ ] Migrate off deprecated `next lint` — `npm run lint` currently runs `next lint`, which Next.js has deprecated and will remove in v16; run `npx @next/codemod@canary next-lint-to-eslint-cli .` (or hand-roll an `eslint.config.js` using `next/core-web-vitals`), update the `lint` script in `package.json`, and confirm `npm run lint` and `.github/workflows/ci.yml` both still report zero warnings.
- [ ] Architect: design an "affordable redemption alert" feature — decompose ROADMAP.md's "Alerts when a high-value redemption becomes affordable" into implementable tasks (what counts as "high-value", how a balance crossing the affordability threshold is detected — cron vs. on-sync, whether it piggybacks on the existing deal-reminder email digest or is a new notification type, schema needs). Record the design in `docs/DECISIONS.md` and leave a follow-up implementation task at the top of the queue.

## Done
<!-- routine PRs move completed items here -->

- [x] DX: add a Husky + lint-staged pre-commit hook — `.husky/pre-commit` runs `lint-staged` (`eslint --fix` on staged `.js`/`.jsx`/`.ts`/`.tsx` files, with `ESLINT_USE_FLAT_CONFIG=false` so it resolves the project's existing `.eslintrc.json`) then the full `npm run typecheck`; documented in `docs/DEPLOYMENT.md`.
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
