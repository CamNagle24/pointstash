import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subwayScraper } from "@/lib/scrapers/subway";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="deal-card">
    <h2>BOGO Footlong with Code FLBOGO</h2>
    <p>Buy any Footlong, get one free online or in-app.</p>
  </div>
  <div class="promo-section">
    <article>
      <div class="card-title">$5 6-inch Sub of the Day</div>
    </article>
  </div>
  <div class="deal-card">
    <h2></h2>
  </div>
</body></html>
`;

describe("subwayScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses deal cards including title and description", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await subwayScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "BOGO Footlong with Code FLBOGO",
      "$5 6-inch Sub of the Day",
    ]);
    expect(deals[0].description).toBe("Buy any Footlong, get one free online or in-app.");
    expect(deals[1].description).toBeUndefined();
    for (const d of deals) {
      expect(d.dealType).toBe("ONLINE");
      expect(d.discountType).toBe("DOLLAR_OFF");
      expect(d.sourceUrl).toMatch(/subway\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await subwayScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
