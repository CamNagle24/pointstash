import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { burgerkingScraper } from "@/lib/scrapers/burgerking";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <div class="offer-card">
    <a href="/offers/whopper">2 Whoppers for $7</a>
  </div>
  <div class="deal-tile">
    <a href="/offers/croissanwich"> $1 Croissan'wich </a>
  </div>
  <div class="offer-card">
    <a href="/offers/empty"></a>
  </div>
</body></html>
`;

describe("burgerkingScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses offer/deal links from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await burgerkingScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual(["2 Whoppers for $7", "$1 Croissan'wich"]);
    for (const d of deals) {
      expect(d.dealType).toBe("APP_EXCLUSIVE");
      expect(d.discountType).toBe("FREE_ITEM");
      expect(d.sourceUrl).toMatch(/bk\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await burgerkingScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
