import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chickfilaScraper } from "@/lib/scrapers/chickfila";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="reward-card">
    <h3>Free 8-ct Nuggets with Any Purchase</h3>
    <p>Member-exclusive — claim in the app this week.</p>
  </div>
  <div class="offer-tile">
    <h2>BOGO Chick-fil-A Chicken Sandwich</h2>
  </div>
  <div class="reward-card">
    <p>No heading here, should be skipped.</p>
  </div>
</body></html>
`;

describe("chickfilaScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses reward/offer headings from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await chickfilaScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "Free 8-ct Nuggets with Any Purchase",
      "BOGO Chick-fil-A Chicken Sandwich",
    ]);
    for (const d of deals) {
      expect(d.dealType).toBe("REWARD_MEMBER");
      expect(d.discountType).toBe("FREE_ITEM");
      expect(d.sourceUrl).toMatch(/chick-fil-a\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await chickfilaScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
