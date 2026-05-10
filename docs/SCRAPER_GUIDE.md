# Adding a new chain scraper

1. Add the chain to `src/types/chain.ts` (extend the `ChainId` union).
2. Add the chain config to `src/lib/constants.ts` (`CHAINS` map): name, logo path, points-per-dollar, value-per-point.
3. Drop a logo SVG into `public/chains/<chain-id>.svg`.
4. Create `src/lib/scrapers/<chain-id>.ts` exporting an async function returning `Promise<ScrapedDeal[]>`.
5. Register it in `src/lib/scrapers/index.ts` (`scrapers` map).
6. Add a unit test under `tests/unit/scrapers/<chain-id>.test.ts`.

## Scraper contract

A scraper:

- Fetches the public deals page for the chain (typically the rewards landing page or the offers section).
- Parses HTML with Cheerio — never use a headless browser unless the page is truly JS-rendered.
- Returns `ScrapedDeal[]` (see `src/types/deal.ts`). Missing fields are OK; `title` is the only required one.
- Handles its own errors — it must not throw on a bad response (return `[]` instead). The cron runner will treat throws as zero-deal scrapes.

## Politeness

- Use the `PointStashBot/1.0` User-Agent.
- One request per scrape run. Don't paginate without a clear cap.
- Respect robots.txt for any new domain.
