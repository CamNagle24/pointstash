import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { popeyesScraper } from "@/lib/scrapers/popeyes";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="offer-card">
    <div class="offer-title">Spicy Chicken Sandwich Combo $7.99</div>
  </div>
  <div data-offer-id="456">Free 3-pc Tenders with $20 Order</div>
  <div class="offer-card">
    <div class="offer-title"></div>
  </div>
</body></html>
`;

describe("popeyesScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses offer titles from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await popeyesScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "Spicy Chicken Sandwich Combo $7.99",
      "Free 3-pc Tenders with $20 Order",
    ]);
    for (const d of deals) {
      expect(d.dealType).toBe("APP_EXCLUSIVE");
      expect(d.discountType).toBe("DOLLAR_OFF");
      expect(d.sourceUrl).toMatch(/popeyes\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await popeyesScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
