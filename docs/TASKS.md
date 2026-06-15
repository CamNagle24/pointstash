# PointStash — Task Queue

The **daily routine** takes the **top unblocked** unchecked task, implements it on a
`routine/<slug>` branch, and opens a PR.

Format: `- [ ] <title> — <acceptance criteria>`
- Top = highest priority. A `> blocked: <reason>` line skips a task until cleared.
- The routine ticks `[x]` inside its PR.

## Queue

- [ ] Add CI workflow `.github/workflows/ci.yml` — `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:run` on PRs to main; green on default branch.
- [ ] OCR edge-case tests in `src/lib/ocr.ts` — common OCR artifacts are corrected per chain; malformed input fails gracefully (no throw).
- [ ] Raise scraper coverage — add unit tests (with fixtures) for chains in `src/lib/scrapers/` currently missing them; no live network in tests.
- [ ] Playwright E2E for the redeem flow — sign in (seeded/MSW), view a deal, complete a redeem, see the balance update.
  > blocked: no in-app "complete a redeem" action exists yet — the Redeem CTA on `DealCard` (`src/components/dashboard/DealCard.tsx`) just opens an external link in a new tab; there's no balance-deduction flow to test. Needs architect design of a redemption-completion feature (see the design task below) before this E2E can be written.
- [ ] Harden `isCronRequest` against an unset `CRON_SECRET` — `src/lib/api.ts` builds `Bearer ${process.env.CRON_SECRET}`, so if the env var is ever unset a literal `Authorization: Bearer undefined` header passes. Reject when `CRON_SECRET` is empty/undefined regardless of header value; add a regression test in `tests/unit/api-guards.test.ts`.
- [ ] Architect: design a redemption-completion flow — decompose "user marks a redemption option as redeemed, the linked account's points balance is deducted by `pointsCost`, and a `PointsHistory` entry is recorded" into implementable tasks (schema check, API route, UI affordance on `RedeemPage`/`DealCard`). Record the design in `docs/DECISIONS.md` and leave a follow-up implementation task at the top of the queue. Unblocks the redeem-flow E2E above.
- [ ] Fix lint warnings in `src/lib/connectors/base.ts` — resolve the 4 `@typescript-eslint/no-unused-vars` warnings on the `_credentials`/`_token` stub parameters (e.g. an eslint override for this file, or restructure the stub signatures) without changing `BaseConnector`'s public contract; `npm run lint` reports zero warnings on this file.
- [ ] Unit tests for the connectors registry (`src/lib/connectors/`) — `getConnector` returns the right connector per chain slug and `undefined` for unknown slugs; `hasImplementedConnector` reflects each connector's `implemented` flag; every unimplemented connector's `authenticate`/`getPointsBalance`/`getRecentTransactions`/`refreshToken` reject with `NotImplementedError`.
- [ ] API tests for `/api/accounts/[id]` edge cases — `PUT`/`DELETE` return 404 (not 403, to avoid leaking existence) for an account belonging to another user; invalid/non-numeric `currentPoints` is rejected with 400; verifies per-user scoping in the underlying query.
- [ ] Unit tests for `src/lib/deal-reminder-email.ts` — subject/body rendering for 0, 1, and many upcoming-expiry deals (pluralization), and deals across multiple chains in one digest.
- [ ] Unit tests for `src/lib/extension-auth.ts` and `src/lib/extension-bridge.ts` — pairing-token issuance, expiry, and rejection of malformed/expired/already-used tokens.
- [ ] Unit tests for `src/lib/points-history.ts` — series aggregation across a date range with gaps (no recorded points on some days), multiple accounts for the same user, and an account with a single data point.
- [ ] Edge-case unit tests for `src/lib/deal-reminders.ts` — a deal expiring exactly at the reminder cutoff boundary, a deal with no `expiresAt`, and a deal that already has a reminder recorded (no duplicate send).
- [ ] Accessibility pass on icon-only dashboard buttons — audit `ChainAccountCard`, `DealCard`, and `Sidebar`/`MobileNav` for icon-only buttons missing `aria-label` (e.g. unlink, redeem, nav icons); add labels so each is announced correctly by screen readers, with a test asserting accessible names via `getByRole`.
- [ ] Playwright E2E for the OCR screenshot upload flow — on `/dashboard/accounts`, upload a fixture screenshot via `AddAccountModal`'s screenshot method, confirm the OCR-extracted point total pre-fills the balance field, and saving updates the account's displayed balance.
- [ ] DX: add a Husky + lint-staged pre-commit hook — run `npm run lint` and `npm run typecheck` (or an eslint/tsc subset) on staged files before commit; document setup in `docs/DEPLOYMENT.md` or a new `docs/DX.md`.

## Done
<!-- routine PRs move completed items here -->

- [x] API auth/cron guard tests — `requireAuth` rejects unauthenticated calls; `isCronRequest` only accepts the configured cron secret.
- [x] Cents-per-point ranking unit tests — given balances + redemption options, the highest cents-per-point redemption is surfaced first; ties and zero-point cases handled.
