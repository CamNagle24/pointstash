import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: tacobell.com/deals uses Adobe Experience Manager + heavy
// client-side JS for offer rendering. Initial HTML has no useful deal data.
// Headless browser required for live data; using mock fallback.
export class TacoBellScraper extends BaseScraper {
  chainSlug = "tacobell";
  sourceUrl = "https://www.tacobell.com/deals";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[class*="DealCard" i], [class*="deal-tile" i]').each((_, el) => {
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
        title: "$5 Cravings Box",
        description: "Chalupa Supreme, Crunchwrap, taco, cinnamon twists, and a drink.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 12.96,
        dealPrice: 5.0,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Doritos Locos Taco — Taco Tuesdays",
        description: "Members get one free Doritos Locos Taco every Tuesday.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 2.49,
        dealPrice: 0,
        expiresAt: this.daysFromNow(28),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Crunchwrap Supreme",
        description: "Buy one Crunchwrap Supreme, get one free in the app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 5.49,
        dealPrice: 2.745,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "2 for $3 Burritos",
        description: "Pick any two from beefy 5-layer, bean, or cheesy roll-up.",
        dealType: "IN_STORE",
        discountType: "DOLLAR_OFF",
        originalPrice: 5.98,
        dealPrice: 3.0,
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Cinnamon Twists with $10 Order",
        description: "Add cinnamon twists free to any app order $10+.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 1.49,
        dealPrice: 0,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const tacobellScraper = new TacoBellScraper();
