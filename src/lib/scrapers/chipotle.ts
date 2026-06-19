import type * as cheerio from "cheerio";
import { BaseScraper } from "./base";
import type { ScrapedDeal } from "@/types/deal";

// NOTE: chipotle.com/rewards is a React + Next.js SPA — most offer content
// hydrates client-side from internal APIs. Best-effort selectors below;
// mock fallback otherwise (same shape as wendys.ts/mcdonalds.ts).
export class ChipotleScraper extends BaseScraper {
  chainSlug = "chipotle";
  sourceUrl = "https://www.chipotle.com/rewards";

  protected parseHtml($: cheerio.CheerioAPI): ScrapedDeal[] {
    const deals: ScrapedDeal[] = [];
    $('[data-testid*="offer" i], [class*="offer-card" i], [class*="reward-card" i]').each(
      (_, el) => {
        const $el = $(el);
        const title = $el.find("h2, h3, [class*='title' i]").first().text().trim();
        if (!title || title.length > 200) return;

        const expiresRaw = $el.attr("data-expires");
        const expiresAt = expiresRaw ? new Date(expiresRaw) : undefined;

        deals.push({
          title,
          description: $el.find("p, [class*='description' i]").first().text().trim() || undefined,
          dealType: "APP_EXCLUSIVE",
          discountType: "FREE_ITEM",
          expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
          sourceUrl: this.sourceUrl,
        });
      },
    );
    return deals;
  }

  protected mockDeals(): ScrapedDeal[] {
    return [
      {
        title: "Free Guac with Any Entree",
        description: "Rewards members: add free guacamole to any entree, app orders only.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        originalPrice: 2.45,
        dealPrice: 0,
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "BOGO Entree on Tuesdays",
        description: "Buy one entree, get one free every Tuesday via the app.",
        dealType: "APP_EXCLUSIVE",
        discountType: "BOGO",
        originalPrice: 10.95,
        dealPrice: 5.475,
        expiresAt: this.daysFromNow(14),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Double Points Week",
        description: "Earn 2x Chipotle Rewards points on every order this week.",
        dealType: "REWARD_MEMBER",
        discountType: "POINTS_MULTIPLIER",
        expiresAt: this.daysFromNow(7),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "$0 Delivery Fee on $10+ Orders",
        description: "Waived delivery fee on app orders over $10 this weekend.",
        dealType: "APP_EXCLUSIVE",
        discountType: "DOLLAR_OFF",
        originalPrice: 3.0,
        dealPrice: 0,
        expiresAt: this.daysFromNow(5),
        sourceUrl: this.sourceUrl,
      },
      {
        title: "Free Chips & Queso at 1,300 Points",
        description: "Redeem 1,300 Chipotle Rewards points for a free chips & queso.",
        dealType: "REWARD_MEMBER",
        discountType: "FREE_ITEM",
        pointsCost: 1300,
        originalPrice: 4.45,
        dealPrice: 0,
        expiresAt: this.daysFromNow(21),
        sourceUrl: this.sourceUrl,
      },
    ];
  }
}

export const chipotleScraper = new ChipotleScraper();
