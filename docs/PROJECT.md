# PointStash — Project

All your fast-food rewards points in one dashboard. Tracks balances across 9 chains
(McDonald's, Chick-fil-A, Wendy's, Taco Bell, Burger King, Popeyes, Subway, Dunkin',
Starbucks) and surfaces the highest-value redemptions in **cents-per-point**.

> Companion docs: `API.md` (REST reference), `DEPLOYMENT.md` (Supabase + Vercel),
> `SCRAPER_GUIDE.md` (adding a chain scraper).

## Stack
Next.js 15 (App Router, Server Actions) · Postgres + Prisma (Supabase in prod) ·
NextAuth v5 · Tailwind v4 + Radix UI + Framer Motion · Cheerio + Tesseract.js (scrape/OCR)
· Vercel (deploy + Cron + Blob) · Vitest + Playwright + MSW.

## Run
```bash
cp .env.example .env.local   # DATABASE_URL, AUTH_SECRET, etc.
npm install
npm run db:push
npm run db:seed              # 9 chains + 50+ redemptions
npm run dev                  # http://localhost:3000
# UI without a DB:
NEXT_PUBLIC_ENABLE_MSW=1 npm run dev
```

## Tests
- `npm run test:run` (Vitest single pass) · `npm run test:coverage` · `npm run test:e2e`
  (Playwright across chromium/firefox/webkit). Unit tests in `tests/unit`, E2E in
  `tests/e2e`, MSW mocks in `tests/mocks`.

## Key paths
- `src/app/` routes (+ `api/`), `src/lib/scrapers/` (BaseScraper + 9 + registry),
  `src/lib/ocr.ts`, `prisma/schema.prisma` (source of truth), `prisma/seed.ts` (54 rows).
- Vercel Cron scrapes every chain daily (`vercel.json`).
