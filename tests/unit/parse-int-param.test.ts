import { describe, it, expect, vi } from "vitest";

// @/lib/api re-exports requireAuth which transitively loads next-auth.
// Stub @/lib/auth to avoid that resolution in this pure-function test.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { parseIntParam } from "@/lib/api";

describe("parseIntParam", () => {
  it("parses a valid positive integer string", () => {
    expect(parseIntParam("42", 10)).toBe(42);
    expect(parseIntParam("1", 0)).toBe(1);
    expect(parseIntParam("100", 0)).toBe(100);
  });

  it("returns the fallback for a negative number string", () => {
    expect(parseIntParam("-1", 50)).toBe(50);
    expect(parseIntParam("-999", 0)).toBe(0);
  });

  it("returns the fallback for a NaN / non-numeric string", () => {
    expect(parseIntParam("abc", 20)).toBe(20);
    expect(parseIntParam("1.5", 20)).toBe(1); // parseInt stops at the dot
    expect(parseIntParam("  ", 20)).toBe(20);
  });

  it("returns the fallback for null", () => {
    expect(parseIntParam(null, 99)).toBe(99);
  });

  it("returns the fallback for an empty string", () => {
    expect(parseIntParam("", 15)).toBe(15);
  });

  it("clamps to max when the value exceeds it", () => {
    expect(parseIntParam("500", 0, 200)).toBe(200);
    expect(parseIntParam("201", 0, 200)).toBe(200);
  });

  it("does not clamp when max is undefined", () => {
    expect(parseIntParam("999", 0)).toBe(999);
  });

  it("returns the value as-is when it is exactly max", () => {
    expect(parseIntParam("200", 0, 200)).toBe(200);
  });

  it("returns the value when it is below max", () => {
    expect(parseIntParam("50", 0, 200)).toBe(50);
  });

  it("accepts zero — not treated as falsy", () => {
    // "0" is a truthy string, so the !value guard should not fire.
    expect(parseIntParam("0", 99)).toBe(0);
    expect(parseIntParam("0", 99, 100)).toBe(0);
  });
});
