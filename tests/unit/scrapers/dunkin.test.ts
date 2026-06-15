import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dunkinScraper } from "@/lib/scrapers/dunkin";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="promo-section">
    <article>
      <h2>Free Medium Coffee with Mobile Order</h2>
      <p>Order anything in the app, get a medium hot or iced coffee free.</p>
    </article>
  </div>
  <div data-promo-id="123">
    <h3>BOGO Donut</h3>
  </div>
  <div class="promo-section">
    <article>
      <p>No heading here, should be skipped.</p>
    </article>
  </div>
</body></html>
`;

describe("dunkinScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses promo headings from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await dunkinScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "Free Medium Coffee with Mobile Order",
      "BOGO Donut",
    ]);
    for (const d of deals) {
      expect(d.dealType).toBe("APP_EXCLUSIVE");
      expect(d.discountType).toBe("DOLLAR_OFF");
      expect(d.sourceUrl).toMatch(/dunkindonuts\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await dunkinScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
