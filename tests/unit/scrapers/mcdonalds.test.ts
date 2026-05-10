import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mcdonaldsScraper } from "@/lib/scrapers/mcdonalds";

const FIXTURE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "fixtures",
  "mcdonalds-deals.html",
);
const fixtureHtml = fs.readFileSync(FIXTURE_PATH, "utf8");

function mockFetchHtml(html: string) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );
}

describe("mcdonaldsScraper.scrapeDeals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses deal HTML correctly", async () => {
    mockFetchHtml(fixtureHtml);

    const deals = await mcdonaldsScraper.scrapeDeals();

    // Three valid future-dated deals; one expired and one untitled should
    // both be filtered out.
    expect(deals).toHaveLength(3);
    expect(deals.map((d) => d.title)).toEqual([
      "Free Large Fries with $1+ Purchase",
      "BOGO McChicken",
      "20% Off Any Order Over $20",
    ]);
    for (const d of deals) {
      expect(d.dealType).toBe("APP_EXCLUSIVE");
      expect(d.discountType).toBe("FREE_ITEM");
      expect(d.sourceUrl).toMatch(/mcdonalds\.com/);
    }
  });

  it("handles missing deal fields gracefully", async () => {
    mockFetchHtml(fixtureHtml);

    const deals = await mcdonaldsScraper.scrapeDeals();
    const noDescription = deals.find((d) => d.title.startsWith("20% Off"));

    // The fixture intentionally omits a <p> for this tile — it should still
    // come back as a valid deal with `description` set to undefined.
    expect(noDescription).toBeDefined();
    expect(noDescription?.description).toBeUndefined();
    // expiresAt is parsed when the data attribute is present.
    expect(noDescription?.expiresAt).toBeInstanceOf(Date);
  });

  it("skips expired deals", async () => {
    mockFetchHtml(fixtureHtml);

    const deals = await mcdonaldsScraper.scrapeDeals();

    // The expired McRib promo (data-expires=2000-01-01) should be filtered out.
    expect(deals.find((d) => d.title.includes("McRib"))).toBeUndefined();
    for (const d of deals) {
      if (d.expiresAt) {
        expect(d.expiresAt.getTime()).toBeGreaterThan(Date.now());
      }
    }
  });

  it("returns empty array on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const deals = await mcdonaldsScraper.scrapeDeals();

    // In test env the mock-fallback is disabled, so a fetch failure surfaces
    // as an empty array rather than the seeded mock deals.
    expect(deals).toEqual([]);
  });
});
