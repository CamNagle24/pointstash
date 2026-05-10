import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: wendys.com/deals is React + Next.js. Some deal copy is in the
// initial HTML (good!) but most pricing/expiry is loaded client-side.
// Best-effort selectors below; mock fallback otherwise.
export class WendysScraper extends BaseScraper {
  chainSlug = "wendys";
  sourceUrl = "https://www.wendys.com/deals";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('article, [class*="deal" i], [data-deal]').each((_, el) => {
      const title = $(el).find("h2, h3, .heading, [class*='title' i]").first().text().trim();
      if (!title || title.length > 200) return;
      const description = $(el).find("p").first().text().trim();
      deals.push({
        title,
        description: description || undefined,
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
        title: "$5 Biggie Bag",
        description: "Jr. Bacon Cheeseburger, 4-pc nuggets, fries, and a drink for $5.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 9.49,
        dealPrice: 5.0,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Small Frosty",
        description: "Rewards members: claim a free small Frosty, no purchase needed.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 1.49,
        dealPrice: 0,
        expiresAt: this.daysFromNow(5),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Dave's Single",
        description: "Buy one Dave's Single, get one free in the app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 5.99,
        dealPrice: 2.995,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Spicy Chicken Sandwich with $10 Order",
        description: "Spend $10+ in the app, get a free spicy chicken sandwich.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 6.79,
        dealPrice: 0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$3 Breakfast Combo",
        description: "Sausage, Egg & Swiss croissant + small coffee for $3, 6–10:30 AM.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 6.49,
        dealPrice: 3.0,
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const wendysScraper = new WendysScraper();
