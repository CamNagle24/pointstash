import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing the module under test.
const { findUniqueMock, updateMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db", () => ({
  db: {
    extensionToken: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

import {
  requireExtensionAuth,
  hashExtensionToken,
} from "@/lib/extension-auth";
import {
  chainHasExtensionSupport,
  EXTENSION_SUPPORTED_CHAINS,
} from "@/lib/extension-bridge";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function req(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  return new Request("http://localhost/api/extension/sync", { headers });
}

const validRecord = { id: "tok_1", userId: "user_1", revokedAt: null };

// ──────────────────────────────────────────────────────────────────────────────
// requireExtensionAuth
// ──────────────────────────────────────────────────────────────────────────────

describe("requireExtensionAuth", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset().mockResolvedValue({});
  });

  it("returns 401 when there is no Authorization header", async () => {
    const result = await requireExtensionAuth(req());
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toMatchObject({ error: expect.any(String) });
    }
  });

  it("returns 401 for a non-Bearer Authorization header", async () => {
    const result = await requireExtensionAuth(req("Basic dXNlcjpwYXNz"));
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(401);
  });

  it("returns 401 when the token is not found in the DB", async () => {
    findUniqueMock.mockResolvedValue(null);
    const result = await requireExtensionAuth(req("Bearer unknown-token"));
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(401);
  });

  it("returns 401 when the token has been revoked", async () => {
    findUniqueMock.mockResolvedValue({ ...validRecord, revokedAt: new Date() });
    const result = await requireExtensionAuth(req("Bearer revoked-token"));
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(401);
  });

  it("returns { userId, tokenId } for a valid, unrevoked token", async () => {
    findUniqueMock.mockResolvedValue(validRecord);
    const result = await requireExtensionAuth(req("Bearer valid-token"));
    expect(result).toEqual({ userId: "user_1", tokenId: "tok_1" });
  });

  it("looks up the token by its SHA-256 hash — never the raw value", async () => {
    findUniqueMock.mockResolvedValue(validRecord);
    const rawToken = "my-raw-bearer-token";
    await requireExtensionAuth(req(`Bearer ${rawToken}`));
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { tokenHash: hashExtensionToken(rawToken) },
    });
  });

  it("strips extra whitespace from the bearer token before hashing", async () => {
    findUniqueMock.mockResolvedValue(validRecord);
    const rawToken = "padded-token";
    await requireExtensionAuth(req(`Bearer   ${rawToken}  `));
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { tokenHash: hashExtensionToken(rawToken) },
    });
  });

  it("does not block on the lastUsedAt touch (best-effort fire-and-forget)", async () => {
    findUniqueMock.mockResolvedValue(validRecord);
    updateMock.mockRejectedValue(new Error("db blip"));
    // Should resolve without throwing even if the update fails.
    await expect(requireExtensionAuth(req("Bearer valid-token"))).resolves.toEqual({
      userId: "user_1",
      tokenId: "tok_1",
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// chainHasExtensionSupport + EXTENSION_SUPPORTED_CHAINS
// ──────────────────────────────────────────────────────────────────────────────

describe("EXTENSION_SUPPORTED_CHAINS", () => {
  it("contains exactly 14 slugs", () => {
    expect(EXTENSION_SUPPORTED_CHAINS.size).toBe(14);
  });

  it("includes the expected chain slugs", () => {
    const expected = [
      "starbucks",
      "chickfila",
      "wendys",
      "burgerking",
      "popeyes",
      "dunkin",
      "chipotle",
      "pancheros",
      "dairyqueen",
      "culvers",
      "jimmyjohns",
      "buffalowildwings",
      "kfc",
      "pandaexpress",
    ];
    for (const slug of expected) {
      expect(EXTENSION_SUPPORTED_CHAINS.has(slug)).toBe(true);
    }
  });
});

describe("chainHasExtensionSupport", () => {
  it("returns true for every slug in EXTENSION_SUPPORTED_CHAINS", () => {
    for (const slug of EXTENSION_SUPPORTED_CHAINS) {
      expect(chainHasExtensionSupport(slug)).toBe(true);
    }
  });

  it("returns false for an unknown chain slug", () => {
    expect(chainHasExtensionSupport("not-a-real-chain")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(chainHasExtensionSupport("")).toBe(false);
  });
});
