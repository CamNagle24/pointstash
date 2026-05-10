import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: chick-fil-a.com is a Gatsby SPA — offers are loaded post-hydration
// from a private rewards API. Live deals scraping needs Puppeteer/Playwright
// (or hitting cfa-api endpoints with auth). Falling back to mock data.
export class ChickFilAScraper extends BaseScraper {
  chainSlug = "chickfila";
  sourceUrl = "https://www.chick-fil-a.com/menu";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[class*="reward" i], [class*="offer" i]').each((_, el) => {
      const title = $(el).find("h2, h3, h4").first().text().trim();
      if (!title) return;
      deals.push({
        title,
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        sourceUrl: this.sourceUrl,
      });
    });
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "Free 8-ct Nuggets with Any Purchase",
        description: "Member-exclusive — claim in the app this week.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 5.99,
        dealPrice: 0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Chick-fil-A Chicken Sandwich",
        description: "Silver+ tier members: buy one CFA Sandwich, get one free.",
        dealType: "REWARD_MEMBER",
        discountType: "BOGO",
        originalPrice: 5.85,
        dealPrice: 2.925,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Chocolate Chunk Cookie",
        description: "Add a free cookie to any order $5+ in the app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 1.89,
        dealPrice: 0,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$1 Medium Lemonade",
        description: "App-exclusive lemonade upgrade, weekday afternoons.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 2.79,
        dealPrice: 1.0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Spicy Deluxe with Any Combo",
        description: "Red+ tier reward — limit one per member.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 6.45,
        dealPrice: 0,
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const chickfilaScraper = new ChickFilAScraper();
