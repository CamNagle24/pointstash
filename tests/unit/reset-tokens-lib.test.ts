import { describe, it, expect } from "vitest";
import { hashResetToken, mintResetToken, resetTokenExpiry, RESET_TOKEN_TTL_MS } from "@/lib/reset-tokens";

describe("RESET_TOKEN_TTL_MS", () => {
  it("is 3,600,000 ms (1 hour)", () => {
    expect(RESET_TOKEN_TTL_MS).toBe(3_600_000);
  });
});

describe("hashResetToken", () => {
  it("returns a 64-character lowercase hex string", () => {
    const hash = hashResetToken("some-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — the same input always produces the same hash", () => {
    expect(hashResetToken("abc")).toBe(hashResetToken("abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashResetToken("abc")).not.toBe(hashResetToken("abd"));
  });
});

describe("mintResetToken", () => {
  it("returns a URL-safe base64 string with no +, /, or =", () => {
    const token = mintResetToken();
    expect(token).not.toMatch(/[+/=]/);
    expect(token.length).toBeGreaterThan(10);
  });

  it("generates a new unique token on each call", () => {
    expect(mintResetToken()).not.toBe(mintResetToken());
  });
});

describe("resetTokenExpiry", () => {
  it("returns a Date approximately 1 hour in the future (within ±5s)", () => {
    const before = Date.now();
    const expiry = resetTokenExpiry();
    const after = Date.now();
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + RESET_TOKEN_TTL_MS - 5000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + RESET_TOKEN_TTL_MS + 5000);
  });
});
