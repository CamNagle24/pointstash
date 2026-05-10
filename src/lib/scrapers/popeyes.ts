import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: popeyes.com is a React SPA built on the same RBI platform as Burger
// King. Real offer data comes from `/graphql`. Headless browser required;
// mock fallback for now.
export class PopeyesScraper extends BaseScraper {
  chainSlug = "popeyes";
  sourceUrl = "https://www.popeyes.com/offers";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[class*="offer" i] [class*="title" i], [data-offer-id]').each((_, el) => {
      const title = $(el).text().trim();
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
        title: "Spicy Chicken Sandwich Combo $7.99",
        description: "Sandwich + regular side + drink, dine-in or app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 10.49,
        dealPrice: 7.99,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free 3-pc Tenders with $20 Order",
        description: "Spend $20+ in the app, get 3 free tenders.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 5.99,
        dealPrice: 0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "5-pc Tenders Combo $9.99",
        description: "5-piece tenders, regular side, biscuit, and drink.",
        dealType: "IN_STORE",
        discountType: "DOLLAR_OFF",
        originalPrice: 12.99,
        dealPrice: 9.99,
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Family Meal $20",
        description: "8-pc chicken, 2 large sides, and 4 biscuits.",
        dealType: "ONLINE",
        discountType: "DOLLAR_OFF",
        originalPrice: 28.99,
        dealPrice: 20.0,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Classic Chicken Sandwich",
        description: "Rewards members only — buy one, get one free.",
        dealType: "REWARD_MEMBER",
        discountType: "BOGO",
        originalPrice: 5.99,
        dealPrice: 2.995,
        expiresAt: this.daysFromNow(5),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const popeyesScraper = new PopeyesScraper();
