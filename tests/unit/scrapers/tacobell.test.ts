import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tacobellScraper } from "@/lib/scrapers/tacobell";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="DealCard">
    <h2>$5 Cravings Box</h2>
  </div>
  <div class="deal-tile">
    <h3>BOGO Crunchwrap Supreme</h3>
  </div>
  <div class="DealCard">
    <p>No heading here, should be skipped.</p>
  </div>
</body></html>
`;

describe("tacobellScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses deal card/tile headings from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await tacobellScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual(["$5 Cravings Box", "BOGO Crunchwrap Supreme"]);
    for (const d of deals) {
      expect(d.dealType).toBe("APP_EXCLUSIVE");
      expect(d.discountType).toBe("DOLLAR_OFF");
      expect(d.sourceUrl).toMatch(/tacobell\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await tacobellScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
