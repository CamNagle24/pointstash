import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: starbucks.com/rewards is a heavily-hydrated SPA. Most promotional
// content (Double Star Days, bonus offers) appears only after auth in the
// app. Headless browser + login or reverse-engineering the rewards API
// would be required for live data. Mock fallback only.
export class StarbucksScraper extends BaseScraper {
  chainSlug = "starbucks";
  sourceUrl = "https://www.starbucks.com/rewards";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[class*="reward" i] article, [class*="offer" i]').each((_, el) => {
      const title = $(el).find("h2, h3").first().text().trim();
      if (!title) return;
      deals.push({
        title,
        dealType: "REWARD_MEMBER",
        discountType: "POINTS_MULTIPLIER",
        sourceUrl: this.sourceUrl,
      });
    });
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "Double Star Tuesdays",
        description: "Earn 2x stars on every purchase every Tuesday all month.",
        dealType: "REWARD_MEMBER",
        discountType: "POINTS_MULTIPLIER",
        expiresAt: this.daysFromNow(28),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "50 Bonus Stars on First Mobile Order",
        description: "New rewards members earn 50 bonus stars on first mobile order.",
        dealType: "APP_EXCLUSIVE",
        discountType: "POINTS_MULTIPLIER",
        pointsCost: 0,
        expiresAt: this.daysFromNow(30),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Birthday Drink",
        description: "Members get one free handcrafted drink on their birthday.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 5.45,
        dealPrice: 0,
        expiresAt: this.daysFromNow(365),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Buy 3 Lunch Items, Get $5 Off",
        description: "Add three qualifying lunch items in the app, $5 off auto-applies.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 26.85,
        dealPrice: 21.85,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Refills on Brewed Coffee",
        description: "In-store using a registered Starbucks card or app payment.",
        dealType: "IN_STORE",
        discountType: "FREE_ITEM",
        expiresAt: this.daysFromNow(60),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const starbucksScraper = new StarbucksScraper();
