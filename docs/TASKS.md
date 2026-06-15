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
  > blocked: no in-app "complete a redeem" action exists yet — the Redeem CTA on `DealCard` (`src/components/dashboard/DealCard.tsx`) just opens an external link in a new tab; there's no balance-deduction flow to test. Needs architect design of a redemption-completion feature before this E2E can be written.

## Done
<!-- routine PRs move completed items here -->

- [x] API auth/cron guard tests — `requireAuth` rejects unauthenticated calls; `isCronRequest` only accepts the configured cron secret.
- [x] Cents-per-point ranking unit tests — given balances + redemption options, the highest cents-per-point redemption is surfaced first; ties and zero-point cases handled.
