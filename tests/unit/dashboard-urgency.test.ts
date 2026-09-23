import { describe, it, expect } from "vitest";
import { urgencyMultiplier, urgencyScore } from "@/lib/dashboard";

describe("urgencyMultiplier", () => {
  it("returns 1 when expiresAt is null", () => {
    expect(urgencyMultiplier(null)).toBe(1);
  });

  it("returns 1 when more than 7 days away", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const expiresAt = new Date("2025-01-09T00:00:00Z"); // 8 days
    expect(urgencyMultiplier(expiresAt, now)).toBe(1);
  });

  it("returns 3 when at expiry", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    expect(urgencyMultiplier(now, now)).toBe(3);
  });

  it("returns 3 for already-expired deals (clamps at expiry)", () => {
    const now = new Date("2025-01-10T00:00:00Z");
    const expiresAt = new Date("2025-01-01T00:00:00Z");
    expect(urgencyMultiplier(expiresAt, now)).toBe(3);
  });

  it("returns ~2 at exactly 3.5 days remaining (halfway)", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const expiresAt = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000);
    expect(urgencyMultiplier(expiresAt, now)).toBeCloseTo(2, 10);
  });

  it("accepts a string ISO date", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    expect(urgencyMultiplier("2025-01-01T00:00:00Z", now)).toBe(3);
  });
});

describe("urgencyScore", () => {
  it("equals centsPerPoint × 1 when expiresAt is null", () => {
    expect(urgencyScore(2.5, null)).toBe(2.5);
  });

  it("equals centsPerPoint × 3 when at expiry", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    expect(urgencyScore(2, now.toISOString(), now)).toBe(6);
  });

  it("urgency score beats raw CPP when expiry is near", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    // Chain A: high CPP but expiry is far away
    const farScore = urgencyScore(3, null, now); // 3 × 1 = 3
    // Chain B: lower CPP but expires in 1 day → multiplier ≈ 2.71
    const nearExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nearScore = urgencyScore(1.5, nearExpiry, now); // 1.5 × ~2.71 ≈ 4.07
    expect(nearScore).toBeGreaterThan(farScore);
  });
});
