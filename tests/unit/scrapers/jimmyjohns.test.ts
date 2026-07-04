import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jimmyJohnsScraper } from "@/lib/scrapers/jimmyjohns";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="deal-card" data-expires="2099-09-01T23:59:00Z">
    <h2>Free 8" Sub with Any Purchase</h2>
    <p>Download the app and get a free sub on your next order.</p>
  </div>
  <article class="promo-tile" data-expires="2099-09-01T23:59:00Z">
    <h3>$2 Off Any Sandwich</h3>
  </article>
  <div class="deal-card">
    <p>No heading here — should be skipped.</p>
  </div>
</body></html>
`;

describe("jimmyJohnsScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses deal/promo card headings from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await jimmyJohnsScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "Free 8\" Sub with Any Purchase",
      "$2 Off Any Sandwich",
    ]);
    for (const d of deals) {
      expect(d.sourceUrl).toMatch(/jimmyjohns\.com/);
      expect(d.expiresAt).toBeInstanceOf(Date);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await jimmyJohnsScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
