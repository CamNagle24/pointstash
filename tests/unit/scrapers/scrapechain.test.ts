import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks are hoisted before imports; vi.mock("@/lib/scrapers/chipotle") replaces
// the chipotleScraper used when scrapers/index.ts populates the `scrapers` map.
const { extractDealsFromTextMock, chipotleScrapeDeals } = vi.hoisted(() => ({
  extractDealsFromTextMock: vi.fn(),
  chipotleScrapeDeals: vi.fn(),
}));

vi.mock("@/lib/scrapers/llm-extract", () => ({
  extractDealsFromText: extractDealsFromTextMock,
}));

vi.mock("@/lib/scrapers/chipotle", () => ({
  chipotleScraper: {
    chainSlug: "chipotle",
    scrapeDeals: chipotleScrapeDeals,
  },
}));

import { scrapeChain } from "@/lib/scrapers";

beforeEach(() => {
  extractDealsFromTextMock.mockReset();
  chipotleScrapeDeals.mockReset();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("<html><body>deal text</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("scrapeChain – canUseLLM gate", () => {
  it("tries LLM when ANTHROPIC_API_KEY is set and a DEAL_SOURCES entry exists", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    extractDealsFromTextMock.mockResolvedValue([]);

    await scrapeChain("chipotle");

    expect(extractDealsFromTextMock).toHaveBeenCalledOnce();
  });

  it("skips LLM when ANTHROPIC_API_KEY is absent", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    chipotleScrapeDeals.mockResolvedValue([]);

    await scrapeChain("chipotle");

    expect(extractDealsFromTextMock).not.toHaveBeenCalled();
    expect(chipotleScrapeDeals).toHaveBeenCalledOnce();
  });

  it("skips LLM for a slug with no DEAL_SOURCES entry even when API key is set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");

    // "unknown-chain" has no DEAL_SOURCES entry → canUseLLM = false
    const result = await scrapeChain("unknown-chain");

    expect(extractDealsFromTextMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/No scraper registered/);
  });
});

describe("scrapeChain – LLM-wins behaviour", () => {
  it("a successful LLM run with 0 deals wins; Cheerio scraper is not called", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    extractDealsFromTextMock.mockResolvedValue([]);

    const result = await scrapeChain("chipotle");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.deals).toEqual([]);
    expect(chipotleScrapeDeals).not.toHaveBeenCalled();
  });

  it("a successful LLM run with deals wins; Cheerio scraper is not called", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const llmDeal = { title: "LLM Free Burrito", chainSlug: "chipotle" } as never;
    extractDealsFromTextMock.mockResolvedValue([llmDeal]);

    const result = await scrapeChain("chipotle");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.deals).toHaveLength(1);
    expect(chipotleScrapeDeals).not.toHaveBeenCalled();
  });
});

describe("scrapeChain – LLM-failure fallthrough", () => {
  it("falls through to the registered Cheerio scraper when LLM throws", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    extractDealsFromTextMock.mockRejectedValue(new Error("Claude API error"));
    chipotleScrapeDeals.mockResolvedValue([{ title: "Cheerio Deal" }]);

    const result = await scrapeChain("chipotle");

    expect(chipotleScrapeDeals).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
  });

  it("falls through to Cheerio when LLM itself returns ok:false", async () => {
    // scrapeChainViaLLM can return {ok: false} without throwing (e.g. no source text)
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    // Simulate fetch returning empty body so rawText is empty → scrapeChainViaLLM returns ok:false
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("", { status: 200, headers: { "content-type": "text/html" } }),
    );
    chipotleScrapeDeals.mockResolvedValue([]);

    const result = await scrapeChain("chipotle");

    // LLM returned ok:false (no text), fell through to Cheerio
    expect(chipotleScrapeDeals).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
  });
});

describe("scrapeChain – no registered scraper", () => {
  it("returns ok:false when no scraper is registered for the slug", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const result = await scrapeChain("pancheros"); // pancheros has no Cheerio scraper

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/No scraper registered/);
  });
});

describe("scrapeChain – per-chain timeout", () => {
  it("surfaces a timeout error without hanging when the Cheerio scraper stalls", async () => {
    vi.useFakeTimers();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    chipotleScrapeDeals.mockImplementation(() => new Promise(() => {})); // never resolves

    const promise = scrapeChain("chipotle");
    await vi.advanceTimersByTimeAsync(31_000); // past PER_CHAIN_TIMEOUT_MS (30 000 ms)
    const result = await promise;

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/timeout/i);

    vi.useRealTimers();
  });
});
