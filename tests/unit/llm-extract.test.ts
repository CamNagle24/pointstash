import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK before importing the module under test.
const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: createMock };
  }
  return { default: MockAnthropic };
});

import { extractDealsFromText } from "@/lib/scrapers/llm-extract";

const DEAL_TYPES = ["APP_EXCLUSIVE", "IN_STORE", "ONLINE", "REWARD_MEMBER"];
const DISCOUNT_TYPES = ["FREE_ITEM", "BOGO", "PERCENTAGE_OFF", "DOLLAR_OFF", "POINTS_MULTIPLIER"];

beforeEach(() => {
  createMock.mockReset();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("extractDealsFromText", () => {
  it("maps the record_deals tool input into valid ScrapedDeals", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "record_deals",
          input: {
            deals: [
              {
                title: "Free Fries Friday",
                description: "Free medium fries with any $1 purchase.",
                dealType: "APP_EXCLUSIVE",
                discountType: "FREE_ITEM",
              },
              {
                title: "2x Points Week",
                description: "Earn double points on all orders.",
                dealType: "REWARD_MEMBER",
                discountType: "POINTS_MULTIPLIER",
              },
            ],
          },
        },
      ],
    });

    const deals = await extractDealsFromText({
      chainSlug: "mcdonalds",
      chainName: "McDonald's",
      sourceUrl: "https://example.com/news",
      rawText: "Some promotional page text about Free Fries Friday.",
    });

    expect(deals).toHaveLength(2);
    for (const d of deals) {
      expect(d.title).toBeTruthy();
      expect(DEAL_TYPES).toContain(d.dealType);
      expect(DISCOUNT_TYPES).toContain(d.discountType);
      // sourceUrl is always set from trusted config, never the model.
      expect(d.sourceUrl).toBe("https://example.com/news");
    }
  });

  it("returns [] when the model records no deals", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "tool_use", name: "record_deals", input: { deals: [] } }],
    });

    const deals = await extractDealsFromText({
      chainSlug: "kfc",
      chainName: "KFC",
      sourceUrl: "https://example.com",
      rawText: "An about page with no current offers.",
    });

    expect(deals).toEqual([]);
  });

  it("returns [] (not throw) on API error", async () => {
    createMock.mockRejectedValue(new Error("rate limited"));

    const deals = await extractDealsFromText({
      chainSlug: "wendys",
      chainName: "Wendy's",
      sourceUrl: "https://example.com",
      rawText: "text",
    });

    expect(deals).toEqual([]);
  });

  it("returns [] without calling the API when ANTHROPIC_API_KEY is unset", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const deals = await extractDealsFromText({
      chainSlug: "subway",
      chainName: "Subway",
      sourceUrl: "https://example.com",
      rawText: "text",
    });

    expect(deals).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });
});
