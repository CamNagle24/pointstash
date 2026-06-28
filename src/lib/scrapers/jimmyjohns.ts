import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: jimmyjohns.com/menu/deals is React + Next.js — most offer content
// hydrates client-side. Best-effort selectors below; mock fallback otherwise
// (same shape as chipotle.ts/wendys.ts).
export class JimmyJohnsScraper extends BaseScraper {
  chainSlug = "jimmyjohns";
  sourceUrl = "https://www.jimmyjohns.com/menu/deals";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('article, [class*="deal" i], [class*="offer-card" i], [data-deal]').each((_, el) => {
      const $el = $(el);
      const title = $el.find("h2, h3, [class*='title' i]").first().text().trim();
      if (!title || title.length > 200) return;

      deals.push({
        title,
        description: $el.find("p, [class*='description' i]").first().text().trim() || undefined,
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
        title: "Free Delivery on Orders $15+",
        description: "Waived delivery fee on app orders over $15.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 2.99,
        dealPrice: 0,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Freaky Fast Rewards Sandwich at 1,000 Points",
        description: "Redeem 1,000 Freaky Fast Rewards points for a free original sandwich.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        pointsCost: 1000,
        originalPrice: 8.49,
        dealPrice: 0,
        expiresAt: this.daysFromNow(30),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Gargantuan",
        description: "Buy one Gargantuan, get one free in the app on Wednesdays.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 10.49,
        dealPrice: 5.245,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "20% Off Catering Orders",
        description: "Rewards members: 20% off box lunch catering orders placed in the app.",
        dealType: "REWARD_MEMBER",
        discountType: "PERCENTAGE_OFF",
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Chips & Cookie with Any Sandwich",
        description: "Add a free bag of chips and a cookie to any app sandwich order.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 3.48,
        dealPrice: 0,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const jimmyjohnsScraper = new JimmyJohnsScraper();
