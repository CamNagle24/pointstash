import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { wendysScraper } from "@/lib/scrapers/wendys";

const FIXTURE_HTML = `
<!doctype html>
<html><body>
  <article class="deal-card" data-expires="2099-08-01T23:59:00Z">
    <h3>Free Dave's Single with $1 purchase</h3>
    <p>Mobile order only. While supplies last.</p>
  </article>
  <article class="promo-card" data-expires="2099-08-01T23:59:00Z">
    <h2>BOGO Frosty</h2>
  </article>
</body></html>
`;

describe("wendysScraper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an array of deals (live fetch mocked out)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(FIXTURE_HTML, { status: 200 }),
    );
    const deals = await wendysScraper.scrapeDeals();
    expect(Array.isArray(deals)).toBe(true);
  });

  it("returns empty array on network error in test env", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));
    const deals = await wendysScraper.scrapeDeals();
    expect(deals).toEqual([]);
  });
});
