import { describe, it, expect } from "vitest";
import { affordableDealCount } from "@/lib/dashboard";
import type { Deal } from "@/types/deal";
import type { ChainAccount } from "@/types/account";

function deal(over: Partial<Deal>): Deal {
  const now = new Date().toISOString();
  return {
    id: Math.random().toString(36).slice(2),
    chainId: "c1",
    userId: null,
    title: "A deal",
    description: null,
    dealType: "APP_EXCLUSIVE",
    discountType: "FREE_ITEM",
    originalPrice: null,
    dealPrice: null,
    pointsCost: null,
    imageUrl: null,
    sourceUrl: null,
    redeemUrl: null,
    anchorText: null,
    source: "MANUAL",
    startsAt: null,
    expiresAt: now,
    isVerified: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    chain: { id: "c1", slug: "wendys", name: "Wendy's", color: "#e2231a", pointsName: "points" },
    ...over,
  };
}

function account(slug: string, currentPoints: number): ChainAccount {
  const now = new Date().toISOString();
  return {
    id: `acc-${slug}`,
    userId: "u1",
    chainId: `chain-${slug}`,
    loyaltyId: null,
    currentPoints,
    lastSynced: now,
    syncMethod: "MANUAL",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    chain: { id: `chain-${slug}`, slug, name: slug, logo: "", color: "#000", pointsName: "points" },
  };
}

const kfcChain = { id: "c2", slug: "kfc", name: "KFC", color: "#e4002b", pointsName: "points" };

describe("affordableDealCount", () => {
  it("counts only deals the tracked balance covers", () => {
    const deals = [
      deal({ pointsCost: 100 }), // wendys, affordable (≤ 500)
      deal({ pointsCost: 500 }), // wendys, affordable (== balance)
      deal({ pointsCost: 900 }), // wendys, too expensive
    ];
    expect(affordableDealCount(deals, [account("wendys", 500)])).toBe(2);
  });

  it("ignores deals with no points cost", () => {
    const deals = [deal({ pointsCost: null }), deal({ pointsCost: 100 })];
    expect(affordableDealCount(deals, [account("wendys", 500)])).toBe(1);
  });

  it("ignores deals on chains the user doesn't track", () => {
    const deals = [deal({ pointsCost: 50, chain: kfcChain })];
    expect(affordableDealCount(deals, [account("wendys", 500)])).toBe(0);
  });

  it("returns 0 when no accounts are linked", () => {
    expect(affordableDealCount([deal({ pointsCost: 10 })], [])).toBe(0);
  });

  it("treats a zero balance as unaffordable for any positive cost", () => {
    expect(affordableDealCount([deal({ pointsCost: 1 })], [account("wendys", 0)])).toBe(0);
  });
});
