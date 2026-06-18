import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScrapedDeal } from "@/types/deal";

const { updateManyMock } = vi.hoisted(() => ({ updateManyMock: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { deal: { updateMany: updateManyMock } },
}));

import { mapScrapedDeal, deactivateExpiredDeals } from "@/lib/deals";

function scrapedDeal(over: Partial<ScrapedDeal> = {}): ScrapedDeal {
  return {
    title: "Free fries",
    dealType: "APP_EXCLUSIVE",
    discountType: "FREE_ITEM",
    sourceUrl: "https://example.com/deal",
    ...over,
  };
}

describe("mapScrapedDeal", () => {
  it("maps optional fields to null when absent", () => {
    const row = mapScrapedDeal(scrapedDeal(), "chain_1");
    expect(row).toMatchObject({
      chainId: "chain_1",
      description: null,
      originalPrice: null,
      dealPrice: null,
      pointsCost: null,
      imageUrl: null,
      expiresAt: null,
    });
  });

  it("carries through provided optional fields", () => {
    const expiresAt = new Date("2026-07-01T00:00:00Z");
    const row = mapScrapedDeal(
      scrapedDeal({
        description: "Limited time",
        originalPrice: 500,
        dealPrice: 300,
        pointsCost: 200,
        imageUrl: "https://example.com/img.png",
        expiresAt,
      }),
      "chain_1",
    );
    expect(row).toMatchObject({
      description: "Limited time",
      originalPrice: 500,
      dealPrice: 300,
      pointsCost: 200,
      imageUrl: "https://example.com/img.png",
      expiresAt,
    });
  });

  it("always sets source LLM, isVerified false, and isActive true", () => {
    const row = mapScrapedDeal(scrapedDeal(), "chain_1");
    expect(row.source).toBe("LLM");
    expect(row.isVerified).toBe(false);
    expect(row.isActive).toBe(true);
  });
});

describe("deactivateExpiredDeals", () => {
  beforeEach(() => {
    updateManyMock.mockReset();
  });

  it("deactivates only active deals whose expiry has passed, and returns the count", async () => {
    const now = new Date("2026-06-17T00:00:00Z");
    updateManyMock.mockResolvedValue({ count: 5 });

    const result = await deactivateExpiredDeals(now);

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { isActive: true, expiresAt: { lt: now } },
      data: { isActive: false },
    });
    expect(result).toBe(5);
  });

  it("returns 0 when nothing is expired", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    expect(await deactivateExpiredDeals(new Date())).toBe(0);
  });
});
