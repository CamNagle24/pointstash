import { describe, it, expect } from "vitest";
import { estimatedDealValueCents } from "@/lib/dashboard";
import type { RedemptionOption } from "@/types/redemption";

function redemption(over: Partial<RedemptionOption>): RedemptionOption {
  return {
    id: Math.random().toString(36).slice(2),
    chainId: "c1",
    itemName: "Item",
    pointsCost: 100,
    retailPriceCents: 150,
    centsPerPoint: 1.5,
    category: "ENTREE",
    ...over,
  };
}

describe("estimatedDealValueCents", () => {
  it("prices the points cost at the chain's best rate", () => {
    // 200 pts × 1.5¢ = 300¢.
    expect(estimatedDealValueCents("c1", 200, [redemption({ chainId: "c1", centsPerPoint: 1.5 })])).toBe(300);
  });

  it("uses the highest cents-per-point when a chain has several redemptions", () => {
    const redemptions = [
      redemption({ chainId: "c1", centsPerPoint: 1.0 }),
      redemption({ chainId: "c1", centsPerPoint: 2.2 }),
      redemption({ chainId: "c1", centsPerPoint: 1.7 }),
    ];
    expect(estimatedDealValueCents("c1", 100, redemptions)).toBeCloseTo(220);
  });

  it("returns null when the deal has no points cost", () => {
    expect(estimatedDealValueCents("c1", null, [redemption({ chainId: "c1" })])).toBeNull();
  });

  it("returns null when the chain has no redemptions to price against", () => {
    expect(estimatedDealValueCents("c2", 100, [redemption({ chainId: "c1" })])).toBeNull();
  });
});
