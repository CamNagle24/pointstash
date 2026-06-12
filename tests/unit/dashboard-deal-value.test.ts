import { describe, it, expect } from "vitest";
import {
  estimatedDealValueCents,
  isAlmostAffordable,
  ALMOST_AFFORDABLE_THRESHOLD,
} from "@/lib/dashboard";
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

describe("isAlmostAffordable", () => {
  it("is true just inside the threshold (≥85% of the cost)", () => {
    // 85 / 100 = exactly at the 15% threshold boundary.
    expect(isAlmostAffordable(100, 85)).toBe(true);
    expect(isAlmostAffordable(100, 90)).toBe(true);
  });

  it("is false just outside the threshold", () => {
    expect(isAlmostAffordable(100, 84)).toBe(false);
  });

  it("is false once the balance covers the cost (that's affordable, not almost)", () => {
    expect(isAlmostAffordable(100, 100)).toBe(false);
    expect(isAlmostAffordable(100, 120)).toBe(false);
  });

  it("respects a custom threshold", () => {
    // Within 20% (80/100) but not the default 15%.
    expect(isAlmostAffordable(100, 80, 0.2)).toBe(true);
    expect(isAlmostAffordable(100, 80)).toBe(false);
  });

  it("returns false for unknown balance, missing cost, or non-positive cost", () => {
    expect(isAlmostAffordable(100, null)).toBe(false);
    expect(isAlmostAffordable(null, 90)).toBe(false);
    expect(isAlmostAffordable(0, 0)).toBe(false);
  });

  it("exposes a 15% default threshold", () => {
    expect(ALMOST_AFFORDABLE_THRESHOLD).toBe(0.15);
  });
});
