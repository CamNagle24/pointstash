import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jimmyjohnsScraper } from "@/lib/scrapers/jimmyjohns";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <article class="offer-card-tile">
    <h2>Free Delivery on Orders $15+</h2>
    <p>Waived delivery fee on app orders over $15.</p>
  </article>
  <div class="deal-card" data-deal="true">
    <h3>BOGO Gargantuan</h3>
  </div>
  <article class="offer-card-tile">
    <p>No heading here, should be skipped.</p>
  </article>
</body></html>
`;

describe("jimmyjohnsScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses deal/offer card headings from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await jimmyjohnsScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "Free Delivery on Orders $15+",
      "BOGO Gargantuan",
    ]);
    for (const d of deals) {
      expect(d.dealType).toBe("APP_EXCLUSIVE");
      expect(d.discountType).toBe("DOLLAR_OFF");
      expect(d.sourceUrl).toMatch(/jimmyjohns\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await jimmyjohnsScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
