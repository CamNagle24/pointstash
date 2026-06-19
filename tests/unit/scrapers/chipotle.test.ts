import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chipotleScraper } from "@/lib/scrapers/chipotle";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div data-testid="offer-card" data-expires="2099-08-01T23:59:00Z">
    <h2>Free Guac with Any Entree</h2>
    <p>Rewards members only, app orders.</p>
  </div>
  <div class="reward-card-tile" data-expires="2099-08-01T23:59:00Z">
    <h3>BOGO Entree on Tuesdays</h3>
  </div>
  <div data-testid="offer-card">
    <p>No heading here, should be skipped.</p>
  </div>
</body></html>
`;

describe("chipotleScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses offer/reward card headings from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await chipotleScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "Free Guac with Any Entree",
      "BOGO Entree on Tuesdays",
    ]);
    for (const d of deals) {
      expect(d.dealType).toBe("APP_EXCLUSIVE");
      expect(d.discountType).toBe("FREE_ITEM");
      expect(d.sourceUrl).toMatch(/chipotle\.com/);
      expect(d.expiresAt).toBeInstanceOf(Date);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await chipotleScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
