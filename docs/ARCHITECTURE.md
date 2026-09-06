# PointStash — Architecture

> Maintained by the **architect** agent.

## Shape
Single Next.js 15 app (App Router + Server Actions). Prisma/Postgres data layer
(Supabase in prod). NextAuth v5 auth. Deployed on Vercel with Cron + Blob.

## Layers
- **Routes/UI** — `src/app/**` (dashboard, auth, landing), `src/components/**`,
  `src/hooks/**` (SWR: useAccounts/useDeals/useRedemptions/usePoints).
- **API** — `src/app/api/**` (accounts, points, deals, redemptions, upload, cron).
  Helpers in `src/lib/api.ts` (`requireAuth`, `isCronRequest`, `errorJson`, `chainSelect`).
- **Data** — `src/lib/db.ts` (Prisma singleton), `prisma/schema.prisma` is the source of
  truth, `prisma/seed.ts` real redemption data.
- **Scraping** — `src/lib/scrapers/` `BaseScraper` + 10 chain scrapers (see `src/lib/scrapers/index.ts` for the live count — it drifts as scrapers are added) + registry; `ocr.ts`
  per-chain regex extraction with OCR-artifact correction; `connectors/` stubs for future
  chain-API integrations.
- **Value engine** — ranks redemptions by cents-per-point.

## Tests
Vitest (670+ unit tests across 74+ files; see CI output for current count) + Playwright E2E + MSW (used in dev too).

## Known gaps (fuel for TASKS.md)
- Uneven scraper coverage; OCR edge cases; cents-per-point ranking under-tested; stub connectors not yet integrated with real loyalty APIs.
