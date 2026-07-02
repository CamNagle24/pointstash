import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dairyQueenScraper } from "@/lib/scrapers/dairyqueen";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <article class="post">
    <h2 class="entry-title">BOGO Blizzard This Weekend Only</h2>
    <p>Buy one Blizzard Treat and get a second one free, app orders only through Sunday.</p>
  </article>
  <article class="post">
    <h3>$3 Any Size Blizzard Deal</h3>
  </article>
  <article class="post">
    <p>No heading here, should be skipped.</p>
  </article>
</body></html>
`;

describe("dairyQueenScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses article headings from matching HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const deals = await dairyQueenScraper.scrapeDeals();

    expect(deals.map((d) => d.title)).toEqual([
      "BOGO Blizzard This Weekend Only",
      "$3 Any Size Blizzard Deal",
    ]);
    for (const d of deals) {
      expect(d.sourceUrl).toMatch(/news\.dairyqueen\.com/);
    }
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await dairyQueenScraper.scrapeDeals();

    expect(deals).toEqual([]);
  });
});
