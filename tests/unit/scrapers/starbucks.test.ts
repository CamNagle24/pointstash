import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { starbucksScraper } from "@/lib/scrapers/starbucks";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="rewards-list">
    <article>
      <h2>Double Star Tuesdays</h2>
      <p>Earn 2x stars on every purchase every Tuesday all month.</p>
    </article>
  </div>
  <div class="offer-banner">
    <h3>Free Birthday Drink</h3>
  </div>
  <div class="rewards-list">
    <article>
      <p>No heading here, should be skipped.</p>
    </article>
  </div>
</body></html>
`;

describe("starbucksScraper.scrapeDeals", () => {
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

    const deals = await starbucksScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual(["Double Star Tuesdays", "Free Birthday Drink"]);
    for (const d of deals) {
      expect(d.dealType).toBe("REWARD_MEMBER");
      expect(d.discountType).toBe("POINTS_MULTIPLIER");
      expect(d.sourceUrl).toMatch(/starbucks\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await starbucksScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
