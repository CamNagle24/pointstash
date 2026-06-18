import { describe, it, expect } from "vitest";
import { bestRedemptionFor, bestRedemptionLabel } from "@/lib/dashboard";
import type { RedemptionOption } from "@/types/redemption";

function redemption(over: Partial<RedemptionOption>): RedemptionOption {
  return {
    id: Math.random().toString(36).slice(2),
    chainId: "c1",
    itemName: "Fries",
    pointsCost: 100,
    retailPriceCents: 200,
    centsPerPoint: 2,
    category: "SIDE",
    ...over,
  };
}

describe("bestRedemptionFor", () => {
  it("returns null for an empty list", () => {
    expect(bestRedemptionFor("c1", [])).toBeNull();
  });

  it("returns the single option if only one exists for the chain", () => {
    const r = redemption({ chainId: "c1" });
    expect(bestRedemptionFor("c1", [r])).toBe(r);
  });

  it("returns the highest cents-per-point option among several", () => {
    const low = redemption({ chainId: "c1", centsPerPoint: 1 });
    const high = redemption({ chainId: "c1", centsPerPoint: 3 });
    const mid = redemption({ chainId: "c1", centsPerPoint: 2 });
    expect(bestRedemptionFor("c1", [low, high, mid])).toBe(high);
  });

  it("ignores options for other chains", () => {
    const other = redemption({ chainId: "c2", centsPerPoint: 10 });
    const mine = redemption({ chainId: "c1", centsPerPoint: 1 });
    expect(bestRedemptionFor("c1", [other, mine])).toBe(mine);
  });
});

describe("bestRedemptionLabel", () => {
  it('returns "Linking redemptions…" when given null', () => {
    expect(bestRedemptionLabel(null)).toBe("Linking redemptions…");
  });

  it("formats itemName and a locale-formatted points cost", () => {
    const r = redemption({ itemName: "Large Fries", pointsCost: 1500 });
    expect(bestRedemptionLabel(r)).toBe("Large Fries · 1,500 pts");
  });
});
