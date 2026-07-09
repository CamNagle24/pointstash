import { describe, it, expect } from "vitest";
import {
  urgencyMultiplier,
  urgencyScore,
  URGENCY_WINDOW_DAYS,
  URGENCY_MAX_MULTIPLIER,
} from "@/lib/dashboard";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

describe("urgencyMultiplier", () => {
  it("returns 1 when expiresAt is null", () => {
    expect(urgencyMultiplier(null)).toBe(1);
  });

  it("returns 1 when expiresAt is undefined", () => {
    expect(urgencyMultiplier(undefined)).toBe(1);
  });

  it("returns 1 when expiry is outside the urgency window", () => {
    expect(urgencyMultiplier(daysFromNow(URGENCY_WINDOW_DAYS + 1))).toBe(1);
  });

  it("returns 1 exactly at the urgency window boundary", () => {
    expect(urgencyMultiplier(daysFromNow(URGENCY_WINDOW_DAYS))).toBe(1);
  });

  it("returns URGENCY_MAX_MULTIPLIER when already expired", () => {
    expect(urgencyMultiplier(daysFromNow(-1))).toBe(URGENCY_MAX_MULTIPLIER);
  });

  it("returns URGENCY_MAX_MULTIPLIER at exact expiry moment", () => {
    // Date slightly in the past
    const justExpired = new Date(Date.now() - 1);
    expect(urgencyMultiplier(justExpired)).toBe(URGENCY_MAX_MULTIPLIER);
  });

  it("returns an intermediate value in the middle of the urgency window", () => {
    // Use ms-based arithmetic to get exactly the midpoint (avoids setDate integer truncation).
    const midpoint = new Date(Date.now() + (URGENCY_WINDOW_DAYS / 2) * 24 * 60 * 60 * 1000);
    const result = urgencyMultiplier(midpoint);
    // fraction = 0.5, so multiplier = 1 + 0.5 * (3-1) = 2
    expect(result).toBeGreaterThan(1.9);
    expect(result).toBeLessThan(2.1);
  });

  it("ramps linearly: closer to expiry means higher multiplier", () => {
    const farOut = daysFromNow(6); // 1 day into the 7-day window
    const closer = daysFromNow(3); // 4 days into the window
    expect(urgencyMultiplier(closer)).toBeGreaterThan(urgencyMultiplier(farOut));
  });
});

describe("urgencyScore", () => {
  it("equals centsPerPoint when outside the urgency window", () => {
    const cpp = 1.5;
    expect(urgencyScore(cpp, daysFromNow(30))).toBe(cpp);
  });

  it("boosts score when expiry is within the urgency window", () => {
    const cpp = 1.0;
    const nearExpiry = daysFromNow(3);
    expect(urgencyScore(cpp, nearExpiry)).toBeGreaterThan(cpp);
  });

  it("urgency score beats raw CPP when expiry is near", () => {
    // A deal with lower CPP but near expiry should outscore a higher-CPP deal with far expiry
    const lowCpp = 1.0;
    const highCpp = 2.0;
    const nearExpiry = daysFromNow(1); // very close — multiplier close to 3
    const farExpiry = daysFromNow(30);
    expect(urgencyScore(lowCpp, nearExpiry)).toBeGreaterThan(urgencyScore(highCpp, farExpiry));
  });

  it("returns centsPerPoint when expiresAt is null", () => {
    const cpp = 2.0;
    expect(urgencyScore(cpp, null)).toBe(cpp);
  });
});
