# PointStash

All your fast-food rewards points. One dashboard.

PointStash tracks balances across 9 chains (McDonald's, Chick-fil-A, Wendy's,
Taco Bell, Burger King, Popeyes, Subway, Dunkin', Starbucks) and surfaces the
highest-value redemptions in cents-per-point — so you stop wasting your stash
on a $5.99 Big Mac that costs you 6,000 points.

## Stack

- **Next.js 15** (App Router, Server Actions, Edge runtime where it makes sense)
- **Postgres + Prisma** for the data layer (Supabase in production)
- **NextAuth v5** with email/password + Google OAuth
- **Tailwind v4** (CSS-first config) + Radix UI primitives + Framer Motion
- **Cheerio** + **Tesseract.js** for chain deal scraping & OCR
- **Vercel** for deploy + Cron + Blob storage
- **Vitest** + **Playwright** + **MSW** for tests at every layer

## Getting started

```bash
cp .env.example .env.local
# fill in DATABASE_URL, AUTH_SECRET, etc. — see .env.example for the full list
npm install
npm run db:push        # apply schema to your DB
npm run db:seed        # 9 chains + 50+ redemption options
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, link
your first chain.

If you want to poke at the UI without provisioning a DB:

```bash
NEXT_PUBLIC_ENABLE_MSW=1 npm run dev
```

That boots Mock Service Worker against the seeded fixtures in `tests/mocks/`.

## Scripts

| Command                  | What it does                                        |
| ------------------------ | --------------------------------------------------- |
| `npm run dev`            | Next dev server                                     |
| `npm run build`          | Production build                                    |
| `npm run start`          | Run the production build                            |
| `npm run lint`           | ESLint                                              |
| `npm run typecheck`      | `tsc --noEmit`                                      |
| `npm run db:push`        | Sync schema (no migration history)                  |
| `npm run db:migrate`     | Create + apply a Prisma migration                   |
| `npm run db:seed`        | Idempotently seed 9 chains + 50+ redemptions        |
| `npm run db:studio`      | Open Prisma Studio                                  |
| `npm run scrape`         | One-off scrape from CLI (`npm run scrape -- mcdonalds`) |
| `npm test`               | Vitest watch mode                                   |
| `npm run test:run`       | Vitest single pass (CI)                             |
| `npm run test:coverage`  | Vitest with coverage                                |
| `npm run test:e2e`       | Playwright across chromium/firefox/webkit           |

## Project layout

```
src/
  app/                    Next App Router routes
    api/                  REST endpoints (accounts, points, deals, redemptions, upload, cron)
    dashboard/            Authed UI (home, deals, redeem, accounts, settings)
    login/, signup/       Auth pages
  components/
    dashboard/            ChainAccountCard, AddAccountModal, DealCard, etc.
    landing/              Hero, FeatureGrid, ChainLogoBanner
    layout/               SessionProvider, ThemeToggle, MockProvider
    ui/                   Button, Card, Dialog, Toaster, AnimatedNumber, ChainLogo
  lib/
    auth.ts               NextAuth v5 config
    db.ts                 Prisma client singleton
    api.ts                requireAuth, isCronRequest, errorJson, chainSelect
    scrapers/             BaseScraper + 9 chain scrapers + registry
    connectors/           Stub architecture for future chain-API integrations
    ocr.ts                Per-chain regex extraction with OCR-artifact correction
  types/                  Strict types matching Prisma + API responses
  hooks/                  useAccounts, useDeals, useRedemptions, usePoints (SWR)
prisma/
  schema.prisma           Source of truth for the data model
  seed.ts                 Real redemption data, 54 rows
tests/
  unit/                   Vitest — ~40 tests for utils, ocr, redemptions, scrapers
  e2e/                    Playwright across chromium/firefox/webkit
  mocks/                  MSW handlers + fixtures (used in dev too)
docs/
  DEPLOYMENT.md           Step-by-step Supabase + Vercel walkthrough
  API.md                  REST endpoint reference
  SCRAPER_GUIDE.md        How to add a chain scraper
```

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full Supabase + Vercel
walkthrough. Cron is configured in `vercel.json` to scrape every chain at
6 AM CT (11 AM UTC) daily.

## License

Private — not yet open source.
