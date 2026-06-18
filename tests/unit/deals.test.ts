import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScrapedDeal } from "@/types/deal";

const { updateManyMock, deleteManyMock, createManyMock, transactionMock } = vi.hoisted(() => ({
  updateManyMock: vi.fn(),
  deleteManyMock: vi.fn(),
  createManyMock: vi.fn(),
  transactionMock: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    deal: { updateMany: updateManyMock, deleteMany: deleteManyMock, createMany: createManyMock },
    $transaction: transactionMock,
  },
}));

import { mapScrapedDeal, deactivateExpiredDeals, replaceAutoDeals } from "@/lib/deals";

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

describe("replaceAutoDeals", () => {
  beforeEach(() => {
    deleteManyMock.mockReset().mockResolvedValue({ count: 0 });
    createManyMock.mockReset().mockResolvedValue({ count: 0 });
    transactionMock.mockReset().mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  });

  it("sends deleteMany then createMany to $transaction, scoped to the chain and auto sources", async () => {
    const deals = [scrapedDeal({ title: "Deal A" }), scrapedDeal({ title: "Deal B" })];

    await replaceAutoDeals("chain_1", deals);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { chainId: "chain_1", source: { in: ["LLM", "AGGREGATOR"] } },
    });
    expect(createManyMock).toHaveBeenCalledWith({
      data: deals.map((d) => mapScrapedDeal(d, "chain_1")),
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock.mock.calls[0][0]).toHaveLength(2);
    expect(deleteManyMock.mock.invocationCallOrder[0]).toBeLessThan(
      createManyMock.mock.invocationCallOrder[0],
    );
  });

  it("clears existing auto deals even when there are zero scraped deals", async () => {
    await replaceAutoDeals("chain_1", []);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { chainId: "chain_1", source: { in: ["LLM", "AGGREGATOR"] } },
    });
    expect(createManyMock).toHaveBeenCalledWith({ data: [] });
  });

  it("returns the number of deals passed in", async () => {
    const deals = [scrapedDeal(), scrapedDeal(), scrapedDeal()];
    const result = await replaceAutoDeals("chain_1", deals);
    expect(result).toBe(3);
  });
});
