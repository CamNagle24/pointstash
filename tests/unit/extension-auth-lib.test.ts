import { describe, it, expect, vi } from "vitest";

// extension-auth.ts imports db (used only by requireExtensionAuth, not the pure helpers).
vi.mock("@/lib/db", () => ({ db: { extensionToken: {} } }));

import { mintExtensionToken, hashExtensionToken } from "@/lib/extension-auth";

describe("hashExtensionToken", () => {
  it("returns a 64-character lowercase hex string", () => {
    const hash = hashExtensionToken("some-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input always produces the same hash", () => {
    const token = "ps_dev_abcdef123456";
    expect(hashExtensionToken(token)).toBe(hashExtensionToken(token));
  });

  it("produces different hashes for different tokens", () => {
    const a = hashExtensionToken("token-alpha");
    const b = hashExtensionToken("token-beta");
    expect(a).not.toBe(b);
  });

  it("is sensitive to every character — a one-char difference changes the hash", () => {
    const h1 = hashExtensionToken("ps_dev_abc");
    const h2 = hashExtensionToken("ps_dev_abC");
    expect(h1).not.toBe(h2);
  });
});

describe("mintExtensionToken", () => {
  it("returns a string starting with 'ps_dev_' in non-production (NODE_ENV=test)", () => {
    // Vitest sets NODE_ENV to 'test' by default — not 'production'.
    const token = mintExtensionToken();
    expect(token).toMatch(/^ps_dev_/);
  });

  it("contains only URL-safe characters (no +, /, or =)", () => {
    for (let i = 0; i < 20; i++) {
      const token = mintExtensionToken();
      expect(token).not.toMatch(/[+/=]/);
    }
  });

  it("generates a new unique token on each call", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => mintExtensionToken()));
    expect(tokens.size).toBe(20);
  });

  it("token is non-empty and reasonably long (> 10 chars)", () => {
    const token = mintExtensionToken();
    expect(token.length).toBeGreaterThan(10);
  });
});
