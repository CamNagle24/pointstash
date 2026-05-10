import type { ChainScraper, ScrapedDeal } from "@/types/deal";
import { mcdonaldsScraper } from "./mcdonalds";
import { chickfilaScraper } from "./chickfila";
import { wendysScraper } from "./wendys";
import { tacobellScraper } from "./tacobell";
import { burgerkingScraper } from "./burgerking";
import { popeyesScraper } from "./popeyes";
import { subwayScraper } from "./subway";
import { dunkinScraper } from "./dunkin";
import { starbucksScraper } from "./starbucks";

const PER_CHAIN_TIMEOUT_MS = 30_000;

export const scrapers: Record<string, ChainScraper> = {
  [mcdonaldsScraper.chainSlug]: mcdonaldsScraper,
  [chickfilaScraper.chainSlug]: chickfilaScraper,
  [wendysScraper.chainSlug]: wendysScraper,
  [tacobellScraper.chainSlug]: tacobellScraper,
  [burgerkingScraper.chainSlug]: burgerkingScraper,
  [popeyesScraper.chainSlug]: popeyesScraper,
  [subwayScraper.chainSlug]: subwayScraper,
  [dunkinScraper.chainSlug]: dunkinScraper,
  [starbucksScraper.chainSlug]: starbucksScraper,
};

export type ScrapeOutcome =
  | { slug: string; ok: true; deals: ScrapedDeal[] }
  | { slug: string; ok: false; error: string };

export type ScrapeAllResult = {
  results: ScrapeOutcome[];
  totalDeals: number;
  errors: string[];
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms timeout`)), ms),
    ),
  ]);
}

export async function scrapeChain(slug: string): Promise<ScrapeOutcome> {
  const scraper = scrapers[slug];
  if (!scraper) {
    return { slug, ok: false, error: `No scraper registered for "${slug}"` };
  }
  try {
    const deals = await withTimeout(
      scraper.scrapeDeals(),
      PER_CHAIN_TIMEOUT_MS,
      `${slug} scraper`,
    );
    return { slug, ok: true, deals };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug, ok: false, error: message };
  }
}

export async function scrapeAll(slugs?: string[]): Promise<ScrapeAllResult> {
  const targets = slugs?.length ? slugs : Object.keys(scrapers);
  const results = await Promise.all(targets.map((slug) => scrapeChain(slug)));
  const totalDeals = results.reduce(
    (sum, r) => (r.ok ? sum + r.deals.length : sum),
    0,
  );
  const errors = results.flatMap((r) => (r.ok ? [] : [`${r.slug}: ${r.error}`]));
  return { results, totalDeals, errors };
}

// ─── CLI entry ──────────────────────────────────────────────────────────────
// Invoke as: `npm run scrape` (passes through to `tsx src/lib/scrapers/index.ts`)
// or `npm run scrape -- mcdonalds wendys` to limit to specific chains.
//
// Prints a summary to stdout. Does NOT write to the database — for that, hit
// /api/deals/scrape with a Bearer cron secret, or import scrapeAll/scrapeChain
// from your own script.
const isCliEntry =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  /scrapers[\\/]index\.(ts|js|mjs)$/.test(process.argv[1]);

if (isCliEntry) {
  const slugs = process.argv.slice(2);
  scrapeAll(slugs.length ? slugs : undefined)
    .then((res) => {
      console.log(`Scraped ${res.totalDeals} deals across ${res.results.length} chains.`);
      for (const r of res.results) {
        if (r.ok) {
          console.log(`  ✓ ${r.slug.padEnd(12)} ${r.deals.length} deals`);
        } else {
          console.log(`  ✗ ${r.slug.padEnd(12)} ${r.error}`);
        }
      }
      if (res.errors.length) process.exitCode = 1;
    })
    .catch((err) => {
      console.error("Scrape failed:", err);
      process.exit(1);
    });
}
