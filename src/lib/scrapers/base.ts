import * as cheerio from "cheerio";
import type { ChainScraper, ScrapedDeal } from "@/types/deal";

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT = "PointStashBot/1.0 (+https://pointstash.app)";

export abstract class BaseScraper implements ChainScraper {
  abstract chainSlug: string;
  abstract sourceUrl: string;

  async scrapeDeals(): Promise<ScrapedDeal[]> {
    const allowMockFallback = process.env.NODE_ENV !== "test";

    let html: string;
    try {
      html = await this.fetchPage();
    } catch (err) {
      this.logSkip("fetch", err);
      return allowMockFallback ? this.mockDeals() : [];
    }

    try {
      const $ = cheerio.load(html);
      const parsed = this.parseHtml($, html);
      const filtered = this.filterExpired(parsed);
      if (filtered.length > 0) return filtered;
      if (!allowMockFallback) return [];
      console.warn(
        `[scraper:${this.chainSlug}] parsed 0 deals from live HTML — page is likely client-rendered. Returning mock data. (Switch to Puppeteer/Playwright or reverse-engineer the chain's internal API for real data.)`,
      );
      return this.mockDeals();
    } catch (err) {
      this.logSkip("parse", err);
      return allowMockFallback ? this.mockDeals() : [];
    }
  }

  /** Drops any deal whose expiresAt is already in the past. */
  protected filterExpired(deals: ScrapedDeal[]): ScrapedDeal[] {
    const now = Date.now();
    return deals.filter((d) => !d.expiresAt || d.expiresAt.getTime() > now);
  }

  protected async fetchPage(): Promise<string> {
    const res = await fetch(this.sourceUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.text();
  }

  protected abstract parseHtml($: cheerio.CheerioAPI, html: string): ScrapedDeal[];
  protected abstract mockDeals(): ScrapedDeal[];

  protected daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private logSkip(stage: "fetch" | "parse", err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[scraper:${this.chainSlug}] ${stage} failed (${msg}); using mock data.`);
  }
}
