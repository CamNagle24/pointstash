import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mock fns so they're accessible in both the vi.mock factory and test bodies.
const { extractDealsFromTextMock, mcdonaldsScrapeDeals } = vi.hoisted(() => ({
  extractDealsFromTextMock: vi.fn(),
  mcdonaldsScrapeDeals: vi.fn(),
}));

// Mock only the LLM extraction helper — not the whole scrapers module.
vi.mock("@/lib/scrapers/llm-extract", () => ({
  extractDealsFromText: extractDealsFromTextMock,
}));

// Mock only the mcdonalds scraper module so we can spy on its scrapeDeals
// without mocking every other chain or the scrapers index itself.
vi.mock("@/lib/scrapers/mcdonalds", () => ({
  mcdonaldsScraper: {
    chainSlug: "mcdonalds",
    scrapeDeals: mcdonaldsScrapeDeals,
  },
}));

import { scrapeChain } from "@/lib/scrapers";

describe("scrapeChain", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    extractDealsFromTextMock.mockReset().mockResolvedValue([]);
    mcdonaldsScrapeDeals.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("canUseLLM gate", () => {
    it("skips LLM and uses the registered scraper when ANTHROPIC_API_KEY is unset", async () => {
      // No ANTHROPIC_API_KEY → canUseLLM = false
      const deals = [
        {
          title: "Cheerio-only Deal",
          dealType: "APP_EXCLUSIVE",
          discountType: "FREE_ITEM",
          sourceUrl: "https://mcdonalds.com",
        },
      ];
      mcdonaldsScrapeDeals.mockResolvedValue(deals);

      const result = await scrapeChain("mcdonalds");

      expect(extractDealsFromTextMock).not.toHaveBeenCalled();
      expect(result).toEqual({ slug: "mcdonalds", ok: true, deals });
    });

    it("skips LLM when the slug has no DEAL_SOURCES entry", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
      // 'no-such-chain' is absent from DEAL_SOURCES → canUseLLM = false
      // It also has no registered scraper → error outcome.

      const result = await scrapeChain("no-such-chain");

      expect(extractDealsFromTextMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        slug: "no-such-chain",
        ok: false,
        error: 'No scraper registered for "no-such-chain"',
      });
    });

    it("calls LLM extraction when ANTHROPIC_API_KEY is set and DEAL_SOURCES entry exists", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("some deal page text", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
      extractDealsFromTextMock.mockResolvedValue([]);

      await scrapeChain("mcdonalds");

      expect(extractDealsFromTextMock).toHaveBeenCalled();
    });
  });

  describe("LLM-win branch (0 deals still wins)", () => {
    it("returns a 0-deal LLM result without calling the Cheerio scraper", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("page text", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
      extractDealsFromTextMock.mockResolvedValue([]);

      const result = await scrapeChain("mcdonalds");

      expect(result).toEqual({ slug: "mcdonalds", ok: true, deals: [] });
      expect(mcdonaldsScrapeDeals).not.toHaveBeenCalled();
    });

    it("returns LLM deals without calling the Cheerio scraper", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("page text", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
      const llmDeals = [
        {
          title: "LLM Deal",
          dealType: "APP_EXCLUSIVE" as const,
          discountType: "FREE_ITEM" as const,
          sourceUrl: "https://mcdonalds.com",
        },
      ];
      extractDealsFromTextMock.mockResolvedValue(llmDeals);

      const result = await scrapeChain("mcdonalds");

      expect(result).toEqual({ slug: "mcdonalds", ok: true, deals: llmDeals });
      expect(mcdonaldsScrapeDeals).not.toHaveBeenCalled();
    });
  });

  describe("LLM-failure fallback", () => {
    it("falls through to the Cheerio scraper when all source fetches fail", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
      // All fetch calls reject → scrapeChainViaLLM returns {ok: false} → fall through.
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
      const cheerioDeals = [
        {
          title: "Cheerio Fallback",
          dealType: "APP_EXCLUSIVE" as const,
          discountType: "FREE_ITEM" as const,
          sourceUrl: "https://mcdonalds.com",
        },
      ];
      mcdonaldsScrapeDeals.mockResolvedValue(cheerioDeals);

      const result = await scrapeChain("mcdonalds");

      expect(mcdonaldsScrapeDeals).toHaveBeenCalled();
      expect(result).toEqual({ slug: "mcdonalds", ok: true, deals: cheerioDeals });
    });

    it("surfaces a per-chain error without hanging when LLM fails and no scraper is registered", async () => {
      // pancheros is in DEAL_SOURCES (LLM path attempted) but has no Cheerio scraper.
      // When fetch fails, scrapeChainViaLLM returns {ok: false}; the no-scraper branch
      // fires — verifying that one chain's failure doesn't hang or corrupt the batch.
      vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await scrapeChain("pancheros");

      expect(result.ok).toBe(false);
      expect(result.slug).toBe("pancheros");
      expect((result as { ok: false; error: string }).error).toContain(
        'No scraper registered for "pancheros"',
      );
    });
  });

  describe("no scraper registered", () => {
    it("returns an error outcome for an unknown slug (LLM disabled)", async () => {
      // ANTHROPIC_API_KEY not set → skips LLM → hits "no scraper" branch.
      const result = await scrapeChain("no-such-chain");

      expect(result).toEqual({
        slug: "no-such-chain",
        ok: false,
        error: 'No scraper registered for "no-such-chain"',
      });
    });
  });
});
