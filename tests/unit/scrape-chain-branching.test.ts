import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DealType, DiscountType } from "@prisma/client";
import type { ScrapedDeal } from "@/types/deal";

const { extractMock, scrapeDealsWendysMock } = vi.hoisted(() => ({
  extractMock: vi.fn(),
  scrapeDealsWendysMock: vi.fn(),
}));

vi.mock("@/lib/scrapers/llm-extract", () => ({
  extractDealsFromText: extractMock,
}));

// Mocking the module causes the scrapers registry in index.ts to pick up the
// mock when it builds { [wendysScraper.chainSlug]: wendysScraper }.
vi.mock("@/lib/scrapers/wendys", () => ({
  wendysScraper: { chainSlug: "wendys", scrapeDeals: scrapeDealsWendysMock },
}));

import { scrapeChain } from "@/lib/scrapers/index";

const FAKE_DEAL: ScrapedDeal = {
  title: "Free Frosty",
  dealType: DealType.REWARD_MEMBER,
  discountType: DiscountType.FREE_ITEM,
  sourceUrl: "https://www.wendys.com/rewards",
};

function mockFetch(text: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => text,
      headers: { get: () => null },
    }),
  );
}

beforeEach(() => {
  extractMock.mockReset();
  scrapeDealsWendysMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("scrapeChain: LLM-then-Cheerio-fallback branching", () => {
  describe("canUseLLM gate", () => {
    it("skips LLM and uses the Cheerio scraper when ANTHROPIC_API_KEY is absent", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "");
      scrapeDealsWendysMock.mockResolvedValue([FAKE_DEAL]);

      const result = await scrapeChain("wendys");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.deals).toEqual([FAKE_DEAL]);
      expect(extractMock).not.toHaveBeenCalled();
      expect(scrapeDealsWendysMock).toHaveBeenCalled();
    });

    it("uses the LLM path and does NOT call Cheerio when the key is present", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      mockFetch("Earn 500 bonus points this week!");
      extractMock.mockResolvedValue([FAKE_DEAL]);

      const result = await scrapeChain("wendys");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.deals).toEqual([FAKE_DEAL]);
      expect(extractMock).toHaveBeenCalled();
      expect(scrapeDealsWendysMock).not.toHaveBeenCalled();
    });
  });

  describe("LLM wins with 0 deals — no Cheerio fallback", () => {
    it("returns ok:true with an empty deals array when the LLM returns []", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      mockFetch("nothing useful here");
      extractMock.mockResolvedValue([]);

      const result = await scrapeChain("wendys");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.deals).toHaveLength(0);
      // LLM succeeded (ok=true), so Cheerio must not have been invoked.
      expect(scrapeDealsWendysMock).not.toHaveBeenCalled();
    });
  });

  describe("LLM failure falls through to Cheerio", () => {
    it("falls through when extractDealsFromText throws", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      mockFetch("some text");
      extractMock.mockRejectedValue(new Error("Claude API error"));
      scrapeDealsWendysMock.mockResolvedValue([FAKE_DEAL]);

      const result = await scrapeChain("wendys");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.deals).toEqual([FAKE_DEAL]);
      expect(scrapeDealsWendysMock).toHaveBeenCalled();
    });

    it("falls through when all source fetches fail (no text fetched)", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
      scrapeDealsWendysMock.mockResolvedValue([FAKE_DEAL]);

      const result = await scrapeChain("wendys");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.deals).toEqual([FAKE_DEAL]);
      expect(scrapeDealsWendysMock).toHaveBeenCalled();
    });

    it("falls through when the LLM extraction exceeds the 30 s timeout", async () => {
      vi.useFakeTimers();
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      mockFetch("some text");
      // extractDealsFromText never resolves — simulates a hung LLM call.
      extractMock.mockImplementation(() => new Promise(() => {}));
      scrapeDealsWendysMock.mockResolvedValue([FAKE_DEAL]);

      const promise = scrapeChain("wendys");
      // Advance past PER_CHAIN_TIMEOUT_MS (30 000 ms).
      await vi.advanceTimersByTimeAsync(30_001);
      const result = await promise;

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.deals).toEqual([FAKE_DEAL]);
    });
  });

  describe("missing Cheerio scraper", () => {
    it("returns ok:false with a descriptive error for an unregistered slug", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "");

      const result = await scrapeChain("no-such-chain");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/No scraper registered for/);
    });
  });
});
