import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: jimmyjohns.com/menu/deals is a JS-rendered page — most deal content
// loads client-side. Best-effort selectors target common deal-card patterns;
// falls back to curated mock deals when live parse yields nothing.
export class JimmyJohnsScraper extends BaseScraper {
  chainSlug = "jimmyjohns";
  sourceUrl = "https://www.jimmyjohns.com/menu/deals";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $(
      '[class*="deal" i], [class*="promo" i], [class*="offer" i], [class*="special" i], article',
    ).each((_, el) => {
      const $el = $(el);
      const title = $el
        .find("h1, h2, h3, h4, [class*='title' i], [class*='heading' i]")
        .first()
        .text()
        .trim();
      if (!title || title.length > 200) return;

      const expiresRaw = $el.attr("data-expires") ?? $el.attr("data-end-date");
      const expiresAt = expiresRaw ? new Date(expiresRaw) : undefined;

      deals.push({
        title,
        description:
          $el.find("p, [class*='description' i], [class*='body' i]").first().text().trim() ||
          undefined,
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
        sourceUrl: this.sourceUrl,
      });
    });
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "Free 8\" Sub with Any Purchase",
        description: "Download the Jimmy John's app and get a free 8\" sub on your next order.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        originalPrice: 8.49,
        dealPrice: 0,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$2 Off Any Sandwich",
        description: "Get $2 off any sandwich when you order online or through the app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 8.49,
        dealPrice: 6.49,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Sub Tuesday",
        description: "Buy one sub, get one free every Tuesday — app orders only.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 8.49,
        dealPrice: 4.25,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Delivery on Orders $20+",
        description: "No delivery fee on app orders of $20 or more this week.",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        expiresAt: this.daysFromNow(5),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Double Points Weekend",
        description: "Earn 2× Freaky Fast Rewards points on every order this weekend.",
        dealType: "REWARD_MEMBER",
        discountType: "POINTS_MULTIPLIER",
        expiresAt: this.daysFromNow(3),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const jimmyJohnsScraper = new JimmyJohnsScraper();
