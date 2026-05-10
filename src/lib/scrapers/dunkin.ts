import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: dunkindonuts.com is React + heavy hydration. Promo data lives in
// a `__NEXT_DATA__` JSON blob occasionally, but more often comes from a
// post-hydration API. Best-effort selectors below; mock fallback otherwise.
// Headless browser would let us reliably scrape the promo page.
export class DunkinScraper extends BaseScraper {
  chainSlug = "dunkin";
  sourceUrl = "https://www.dunkindonuts.com/en/promos";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[class*="promo" i] article, [data-promo-id]').each((_, el) => {
      const title = $(el).find("h2, h3").first().text().trim();
      if (!title) return;
      deals.push({
        title,
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        sourceUrl: this.sourceUrl,
      });
    });
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "Free Medium Coffee with Mobile Order",
        description: "Order anything in the app, get a medium hot or iced coffee free.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 2.99,
        dealPrice: 0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$2 Medium Iced Coffee on Mondays",
        description: "Every Monday, all sizes of iced coffee just $2.",
        dealType: "IN_STORE",
        discountType: "DOLLAR_OFF",
        originalPrice: 3.49,
        dealPrice: 2.0,
        expiresAt: this.daysFromNow(28),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Donut",
        description: "Buy any donut, get one free with mobile order.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 1.49,
        dealPrice: 0.745,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Sandwich + Coffee for $5",
        description: "Any classic sandwich + medium coffee for $5 in the app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 7.98,
        dealPrice: 5.0,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Triple Points on Espresso Drinks",
        description: "Earn 3x points on lattes, macchiatos, and cappuccinos this week.",
        dealType: "REWARD_MEMBER",
        discountType: "POINTS_MULTIPLIER",
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const dunkinScraper = new DunkinScraper();
