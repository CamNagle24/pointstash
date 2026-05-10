import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: bk.com is a React SPA. Offers come from `/graphql` post-hydration.
// Real scraping needs Puppeteer/Playwright; mock fallback for now.
export class BurgerKingScraper extends BaseScraper {
  chainSlug = "burgerking";
  sourceUrl = "https://www.bk.com/offers";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[class*="offer" i] a, [class*="deal" i] a').each((_, el) => {
      const title = $(el).text().trim();
      if (!title || title.length > 200) return;
      deals.push({
        title,
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        sourceUrl: this.sourceUrl,
      });
    });
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "2 Whoppers for $7",
        description: "Bundle two Whoppers for $7 in the app — limit two redemptions.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 13.58,
        dealPrice: 7.0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Whopper with First App Order",
        description: "New Royal Perks members: free Whopper with any first app order.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 6.79,
        dealPrice: 0,
        expiresAt: this.daysFromNow(30),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$1 Croissan'wich",
        description: "Bacon, sausage, or ham Croissan'wich for $1, 6–10 AM weekdays.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 3.99,
        dealPrice: 1.0,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Original Chicken Sandwich",
        description: "Buy one Original Chicken Sandwich, get one free.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 5.49,
        dealPrice: 2.745,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "50% Off Any Whopper",
        description: "Royal Perks members: half off any Whopper variant this week.",
        dealType: "REWARD_MEMBER",
        discountType: "PERCENTAGE_OFF",
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const burgerkingScraper = new BurgerKingScraper();
