import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: mcdonalds.com/us/en-us/deals.html is a React SPA. The initial HTML
// has no offer data — they hydrate from `/dnaapp/itemDetails/...` and
// internal GraphQL. Live scraping requires Puppeteer/Playwright (or
// reverse-engineering the JSON endpoints behind their app). The
// parseHtml below is a best-effort scan of common selectors and will
// almost always return zero on production HTML, which triggers the
// mock fallback in BaseScraper.
export class McDonaldsScraper extends BaseScraper {
  chainSlug = "mcdonalds";
  sourceUrl = "https://www.mcdonalds.com/us/en-us/deals.html";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[data-testid*="deal" i], .deal-tile, .offer-card').each((_, el) => {
      const $el = $(el);
      const title = $el.find("h2, h3, .title").first().text().trim();
      if (!title) return;

      const expiresRaw = $el.attr("data-expires");
      const expiresAt = expiresRaw ? new Date(expiresRaw) : undefined;

      deals.push({
        title,
        description: $el.find("p, .description").first().text().trim() || undefined,
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
        sourceUrl: this.sourceUrl,
      });
    });
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "Free Large Fries with $1+ Purchase",
        description:
          "App-exclusive: add a free large fries to any order over $1, every Friday.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 3.99,
        dealPrice: 0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO McChicken",
        description: "Buy one McChicken, get one free with mobile order.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 2.49,
        dealPrice: 1.245,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "20% Off Any Order Over $20",
        description: "Use code FAMILY20 in the app for 20% off your next $20+ order.",
        dealType: "APP_EXCLUSIVE",
        discountType: "PERCENTAGE_OFF",
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Big Mac with $15 Mobile Order",
        description: "Spend $15+ via the app and get a Big Mac free.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 5.69,
        dealPrice: 0,
        expiresAt: this.daysFromNow(5),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Sausage McMuffin for $1.99",
        description: "App-only breakfast deal, 4–10am daily.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 3.49,
        dealPrice: 1.99,
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Double Points on All Beverages",
        description: "Earn 2x MyMcDonald's points on coffee and soft drinks this week.",
        dealType: "REWARD_MEMBER",
        discountType: "POINTS_MULTIPLIER",
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const mcdonaldsScraper = new McDonaldsScraper();
