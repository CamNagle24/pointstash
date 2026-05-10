import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: subway.com/deals is partially server-rendered — promo titles often
// appear in the initial HTML, but pricing and expiry are loaded client-side.
// Try Cheerio first; mock fallback if no deals matched.
export class SubwayScraper extends BaseScraper {
  chainSlug = "subway";
  sourceUrl = "https://www.subway.com/en-us/deals";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[class*="deal-card" i], [class*="promo" i] article').each((_, el) => {
      const title = $(el).find("h2, h3, [class*='title' i]").first().text().trim();
      if (!title || title.length > 200) return;
      deals.push({
        title,
        description: $(el).find("p").first().text().trim() || undefined,
        dealType: "ONLINE",
        discountType: "DOLLAR_OFF",
        sourceUrl: this.sourceUrl,
      });
    });
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "BOGO Footlong with Code FLBOGO",
        description: "Buy any Footlong, get one free online or in-app.",
        dealType: "ONLINE",
        discountType: "BOGO",
        originalPrice: 9.99,
        dealPrice: 4.995,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$5 6-inch Sub of the Day",
        description: "Daily rotating 6-inch for $5, in-store only.",
        dealType: "IN_STORE",
        discountType: "DOLLAR_OFF",
        originalPrice: 5.99,
        dealPrice: 5.0,
        expiresAt: this.daysFromNow(28),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Cookie with Kids' Meal",
        description: "Add a free chocolate chip cookie to every kids' meal.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 0.79,
        dealPrice: 0,
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "3 Footlongs for $19.99",
        description: "Mix and match any three Footlongs in one order.",
        dealType: "ONLINE",
        discountType: "DOLLAR_OFF",
        originalPrice: 29.97,
        dealPrice: 19.99,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Buy Any Sub, Get a Drink Free",
        description: "MVP Rewards members: free 21oz drink with any sub.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 2.49,
        dealPrice: 0,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const subwayScraper = new SubwayScraper();
