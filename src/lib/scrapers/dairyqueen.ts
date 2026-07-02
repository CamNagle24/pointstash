import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: news.dairyqueen.com is a press-release / news blog. Deals appear as
// news articles; best-effort heading selectors below. Falls back to mock data
// when the live page yields no parseable deals (e.g. JS-rendered widgets).
export class DairyQueenScraper extends BaseScraper {
  chainSlug = "dairyqueen";
  sourceUrl = "https://news.dairyqueen.com";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];

    $('article, [class*="post" i], [class*="news-card" i], [class*="entry" i]').each((_, el) => {
      const $el = $(el);
      const title = $el
        .find('h1, h2, h3, [class*="title" i], [class*="heading" i]')
        .first()
        .text()
        .trim();
      if (!title || title.length > 200) return;

      const description = $el.find("p").first().text().trim() || undefined;

      deals.push({
        title,
        description,
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
        title: "BOGO Blizzard Treat",
        description: "Buy one medium Blizzard, get one free — app orders only.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 4.99,
        dealPrice: 2.495,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$3 Any Size Blizzard",
        description: "Any size Blizzard Treat for just $3 with the DQ app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 5.99,
        dealPrice: 3.0,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Small Blizzard on Your Birthday",
        description: "DQ Rewards members get a free small Blizzard during their birthday month.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 3.49,
        dealPrice: 0,
        expiresAt: this.daysFromNow(30),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "2 for $6 FlameThrower Burgers",
        description: "Two FlameThrower GrillBurgers for $6 via the app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 9.98,
        dealPrice: 6.0,
        expiresAt: this.daysFromNow(10),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Double Points on Blizzard Orders",
        description: "Earn 2x DQ Rewards points on all Blizzard purchases this week.",
        dealType: "REWARD_MEMBER",
        discountType: "POINTS_MULTIPLIER",
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const dairyQueenScraper = new DairyQueenScraper();
