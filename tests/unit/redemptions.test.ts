import { describe, it, expect } from "vitest";
import {
  centsPerPoint,
  sortRedemptionsByValue,
  calculateTotalValue,
  type Redemption,
} from "@/lib/redemptions";

describe("centsPerPoint", () => {
  it("calculates centsPerPoint correctly", () => {
    // 1500 points for a $5.59 item → 559 cents / 1500 ≈ 0.3727 cents/point
    expect(centsPerPoint(559, 1500)).toBeCloseTo(0.3727, 3);
  });

  it("handles zero points cost without dividing by zero", () => {
    expect(centsPerPoint(599, 0)).toBe(0);
    expect(centsPerPoint(599, -1)).toBe(0);
  });

  it("handles non-finite inputs", () => {
    expect(centsPerPoint(Number.NaN, 1500)).toBe(0);
    expect(centsPerPoint(599, Number.POSITIVE_INFINITY)).toBeCloseTo(0, 3);
  });

  it("handles chains with very different point scales", () => {
    // Starbucks star: 200 stars for $5.45 drink ≈ 2.7¢/star
    const sbx = centsPerPoint(545, 200);
    // McDonald's point: 6,000 pts for the $5.99 Big Mac ≈ 0.1¢/pt
    const mcd = centsPerPoint(599, 6000);
    expect(sbx).toBeCloseTo(2.725, 2);
    expect(mcd).toBeCloseTo(0.0998, 2);
    expect(sbx).toBeGreaterThan(mcd * 25);
  });
});

describe("sortRedemptionsByValue", () => {
  const sample: Redemption[] = [
    { id: "a", chainSlug: "mcdonalds", itemName: "Big Mac",  pointsCost: 6000, retailPriceCents: 599 }, // 0.0998
    { id: "b", chainSlug: "chickfila", itemName: "Cookie",   pointsCost: 200,  retailPriceCents: 199 }, // 0.995
    { id: "c", chainSlug: "starbucks", itemName: "Drink",    pointsCost: 200,  retailPriceCents: 545 }, // 2.725
    { id: "d", chainSlug: "wendys",    itemName: "Frosty",   pointsCost: 100,  retailPriceCents: 199 }, // 1.99
    { id: "e", chainSlug: "subway",    itemName: "Footlong", pointsCost: 800,  retailPriceCents: 999 }, // 1.249
  ];

  it("ranks redemptions best-to-worst by ¢ per point", () => {
    const ranked = sortRedemptionsByValue(sample).map((r) => r.id);
    expect(ranked).toEqual(["c", "d", "e", "b", "a"]);
  });

  it("does not mutate the input array", () => {
    const before = sample.map((s) => s.id);
    sortRedemptionsByValue(sample);
    expect(sample.map((s) => s.id)).toEqual(before);
  });

  it("attaches a centsPerPoint field to each result", () => {
    const ranked = sortRedemptionsByValue(sample);
    for (const r of ranked) {
      expect(r.centsPerPoint).toBeGreaterThan(0);
      expect(r).toHaveProperty("itemName");
    }
  });
});

describe("calculateTotalValue", () => {
  it("sums dollar value across accounts using their cents-per-point rate", () => {
    const total = calculateTotalValue([
      { chainSlug: "starbucks", points: 200, centsPerPoint: 2.725 }, // $5.45
      { chainSlug: "chickfila", points: 100, centsPerPoint: 0.995 }, // $0.995
    ]);
    expect(total).toBeCloseTo(5.45 + 0.995, 3);
  });

  it("returns 0 for an empty list", () => {
    expect(calculateTotalValue([])).toBe(0);
  });

  it("ignores accounts with non-positive points or rates", () => {
    const total = calculateTotalValue([
      { chainSlug: "x", points: 0, centsPerPoint: 5 },
      { chainSlug: "y", points: -50, centsPerPoint: 5 },
      { chainSlug: "z", points: 100, centsPerPoint: 0 },
      { chainSlug: "ok", points: 100, centsPerPoint: 1 }, // $1
    ]);
    expect(total).toBeCloseTo(1, 5);
  });
});
