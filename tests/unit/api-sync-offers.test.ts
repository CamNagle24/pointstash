import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the route's collaborators. hostBelongsToChain is left real (it's a pure,
// separately-tested security check) and exercised with genuine URLs below.
const { authMock, extractMock, findUniqueMock, transactionMock, deleteManyMock, createManyMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    extractMock: vi.fn(),
    findUniqueMock: vi.fn(),
    transactionMock: vi.fn(),
    deleteManyMock: vi.fn(),
    createManyMock: vi.fn(),
  }));

// @/lib/api (imported by the route) pulls in @/lib/auth → next-auth, which
// fails to resolve in this test env. Stub it; the route doesn't use it here.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/extension-auth", () => ({ requireExtensionAuth: authMock }));
vi.mock("@/lib/scrapers/llm-extract", () => ({ extractDealsFromText: extractMock }));
vi.mock("@/lib/db", () => ({
  db: {
    chain: { findUnique: findUniqueMock },
    deal: { deleteMany: deleteManyMock, createMany: createManyMock },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/extension/sync-offers/route";

const WENDYS_URL = "https://order.wendys.com/loyalty/rewards";

function post(body: unknown) {
  return new Request("http://localhost/api/extension/sync-offers", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer tok" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  chainSlug: "wendys",
  pageUrl: WENDYS_URL,
  pageText: "x".repeat(60), // satisfies the min(40) schema bound
};

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ userId: "user_1", tokenId: "tok_1" });
  extractMock.mockReset().mockResolvedValue([]);
  findUniqueMock.mockReset().mockResolvedValue({ id: "chain_w", name: "Wendy's" });
  transactionMock.mockReset().mockResolvedValue([]);
  deleteManyMock.mockReset().mockReturnValue({ __op: "delete" });
  createManyMock.mockReset().mockReturnValue({ __op: "create" });
});

describe("POST /api/extension/sync-offers", () => {
  it("returns the auth guard's response when the bearer token is bad", async () => {
    const unauthorized = new Response(null, { status: 401 });
    authMock.mockResolvedValue({ response: unauthorized });

    const res = await POST(post(validBody));
    expect(res).toBe(unauthorized);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects a body that fails schema validation (pageText too short)", async () => {
    const res = await POST(post({ ...validBody, pageText: "too short" }));
    expect(res.status).toBe(400);
    expect(extractMock).not.toHaveBeenCalled();
  });

  it("rejects a pageUrl whose host doesn't belong to the claimed chain", async () => {
    const res = await POST(post({ ...validBody, pageUrl: "https://evilwendys.com/phish" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/host does not match/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown chain slug", async () => {
    findUniqueMock.mockResolvedValue(null);
    const res = await POST(post(validBody));
    expect(res.status).toBe(404);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("replaces the user's EXTENSION deals and returns the count on success", async () => {
    extractMock.mockResolvedValue([
      {
        title: "Free Fries",
        dealType: "APP_EXCLUSIVE",
        discountType: "FREE_ITEM",
        sourceUrl: WENDYS_URL,
      },
      {
        title: "$1 Frosty",
        dealType: "REWARD_MEMBER",
        discountType: "DOLLAR_OFF",
        sourceUrl: WENDYS_URL,
      },
    ]);

    const res = await POST(post(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });

    // Delete-then-insert, scoped to this user + chain + EXTENSION source.
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1", chainId: "chain_w", source: "EXTENSION" },
    });
    const rows = createManyMock.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.userId).toBe("user_1");
      expect(r.chainId).toBe("chain_w");
      expect(r.source).toBe("EXTENSION");
      expect(r.isVerified).toBe(false);
      expect(r.redeemUrl).toBe(WENDYS_URL); // trusted server-set, not model-set
      expect(r.anchorText).toBe(r.title);
    }
    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it("returns 500 (not throw) when the transaction fails", async () => {
    extractMock.mockResolvedValue([
      { title: "x", dealType: "ONLINE", discountType: "FREE_ITEM", sourceUrl: WENDYS_URL },
    ]);
    transactionMock.mockRejectedValue(new Error("db down"));

    const res = await POST(post(validBody));
    expect(res.status).toBe(500);
  });
});
