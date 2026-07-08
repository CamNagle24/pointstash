import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, chainFindUniqueMock, dealDeleteManyMock, dealCreateManyMock, transactionMock, extractMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    chainFindUniqueMock: vi.fn(),
    dealDeleteManyMock: vi.fn(),
    dealCreateManyMock: vi.fn(),
    transactionMock: vi.fn(),
    extractMock: vi.fn(),
  }));

// Stub next-auth-dependent imports used transitively by the route.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/extension-auth", () => ({ requireExtensionAuth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    chain: { findUnique: chainFindUniqueMock },
    deal: { deleteMany: dealDeleteManyMock, createMany: dealCreateManyMock },
    $transaction: transactionMock,
  },
}));
vi.mock("@/lib/scrapers/llm-extract", () => ({ extractDealsFromText: extractMock }));

import { POST } from "@/app/api/extension/sync-offers/route";

// pageText must be ≥40 chars (syncSchema requirement)
const PAGE_TEXT =
  "Earn 500 bonus points when you order any combo this week. Redeem for free fries!";

const VALID_BODY = {
  chainSlug: "wendys",
  pageText: PAGE_TEXT,
  pageUrl: "https://www.wendys.com/rewards/offers",
};

function req(body: unknown) {
  return new Request("http://localhost/api/extension/sync-offers", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer tok" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ userId: "user_1", tokenId: "t1" });
  chainFindUniqueMock.mockReset().mockResolvedValue({ id: "chain_w", name: "Wendy's" });
  dealDeleteManyMock.mockReset().mockResolvedValue({ count: 0 });
  dealCreateManyMock.mockReset().mockResolvedValue({ count: 0 });
  transactionMock.mockReset().mockResolvedValue([{ count: 0 }, { count: 0 }]);
  extractMock.mockReset().mockResolvedValue([]);
});

describe("POST /api/extension/sync-offers", () => {
  it("returns the auth guard response for an unauthenticated request (401)", async () => {
    const unauthorized = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    authMock.mockResolvedValue({ response: unauthorized });
    const res = await POST(req(VALID_BODY));
    expect(res).toBe(unauthorized);
    expect(res.status).toBe(401);
  });

  it("returns 400 when the pageUrl hostname does not match the chain (mismatched chain host)", async () => {
    const mismatchBody = {
      ...VALID_BODY,
      pageUrl: "https://www.mcdonalds.com/rewards",
    };
    const res = await POST(req(mismatchBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/host does not match chain/i);
    // DB should not be touched — the host check fires before any DB query.
    expect(chainFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown chain slug (hostBelongsToChain has no domain to match)", async () => {
    const bogusBody = {
      ...VALID_BODY,
      chainSlug: "bogus-chain",
      pageUrl: "https://bogus-chain.com/rewards/offers",
    };
    const res = await POST(req(bogusBody));
    expect(res.status).toBe(400);
    expect(chainFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 200 with { ok: true, count } for a valid chain + matching hostname", async () => {
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, count: 0 });
    expect(chainFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "wendys" } }),
    );
    expect(transactionMock).toHaveBeenCalled();
  });
});
