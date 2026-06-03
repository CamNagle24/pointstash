import * as cheerio from "cheerio";
import type { ChainScraper, ScrapedDeal } from "@/types/deal";
import { CHAINS } from "@/lib/constants";
import type { ChainId } from "@/types/chain";
import { DEAL_SOURCES } from "./sources";
import { extractDealsFromText } from "./llm-extract";
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
const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT = "PointStashBot/1.0 (+https://pointstash.app)";

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

/** Fetch a URL and return its visible text (scripts/styles stripped). */
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const body = await res.text();
  // Reddit/JSON sources: hand the raw text straight to the LLM.
  if (res.headers.get("content-type")?.includes("json")) return body;
  const $ = cheerio.load(body);
  $("script, style, noscript, svg").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

/**
 * Extract a chain's deals via Claude from its configured DEAL_SOURCES. Fetches
 * each source URL, concatenates the stripped text, and runs LLM extraction.
 * Returns a ScrapeOutcome so the cron loop is unchanged.
 */
export async function scrapeChainViaLLM(slug: string): Promise<ScrapeOutcome> {
  const source = DEAL_SOURCES[slug];
  if (!source) return { slug, ok: false, error: `No DEAL_SOURCES entry for "${slug}"` };

  const chainName = CHAINS[slug as ChainId]?.name ?? slug;
  try {
    const texts: string[] = [];
    for (const url of source.urls) {
      try {
        texts.push(await fetchText(url));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[scrapeChainViaLLM:${slug}] fetch ${url} failed (${msg})`);
      }
    }
    const rawText = texts.join("\n\n").trim();
    if (!rawText) return { slug, ok: false, error: "no source text fetched" };

    const deals = await extractDealsFromText({
      chainSlug: slug,
      chainName,
      sourceUrl: source.urls[0],
      rawText,
    });
    return { slug, ok: true, deals };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug, ok: false, error: message };
  }
}

export async function scrapeChain(slug: string): Promise<ScrapeOutcome> {
  // Prefer the LLM path when a key + source config exist; it covers chains with
  // no bespoke Cheerio scraper. Fall back to the registered scraper/mock.
  const canUseLLM = !!process.env.ANTHROPIC_API_KEY && !!DEAL_SOURCES[slug];
  if (canUseLLM) {
    const outcome = await withTimeout(
      scrapeChainViaLLM(slug),
      PER_CHAIN_TIMEOUT_MS,
      `${slug} LLM extract`,
    ).catch((err) => ({
      slug,
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    }));
    // A successful LLM run (even with 0 deals) wins; on failure fall through.
    if (outcome.ok) return outcome;
  }

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
