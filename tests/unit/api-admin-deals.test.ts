import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The real requireAdmin guard runs against the mocked auth() + ADMIN_EMAIL env,
// so the 401/403 gating is genuinely exercised; only auth + db are stubbed.
const { authMock, dealFindManyMock, dealFindUniqueMock, dealCreateMock, dealUpdateMock, dealDeleteMock, chainFindUniqueMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    dealFindManyMock: vi.fn(),
    dealFindUniqueMock: vi.fn(),
    dealCreateMock: vi.fn(),
    dealUpdateMock: vi.fn(),
    dealDeleteMock: vi.fn(),
    chainFindUniqueMock: vi.fn(),
  }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    deal: {
      findMany: dealFindManyMock,
      findUnique: dealFindUniqueMock,
      create: dealCreateMock,
      update: dealUpdateMock,
      delete: dealDeleteMock,
    },
    chain: { findUnique: chainFindUniqueMock },
  },
}));

import { GET, POST } from "@/app/api/admin/deals/route";
import { PATCH, DELETE } from "@/app/api/admin/deals/[id]/route";

const ADMIN = "admin@example.com";
const asAdmin = () => authMock.mockResolvedValue({ user: { id: "a1", email: ADMIN } });
const asUser = () => authMock.mockResolvedValue({ user: { id: "u1", email: "nope@example.com" } });

function jsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const validCreate = {
  chainSlug: "wendys",
  title: "Free Fries",
  dealType: "APP_EXCLUSIVE",
  discountType: "FREE_ITEM",
  redeemUrl: "https://order.wendys.com/rewards",
  anchorText: "Free Fries",
};

beforeEach(() => {
  process.env.ADMIN_EMAIL = ADMIN;
  authMock.mockReset();
  dealFindManyMock.mockReset().mockResolvedValue([]);
  dealFindUniqueMock.mockReset();
  dealCreateMock.mockReset();
  dealUpdateMock.mockReset();
  dealDeleteMock.mockReset();
  chainFindUniqueMock.mockReset().mockResolvedValue({ id: "chain_w", name: "Wendy's" });
});

describe("admin deals — gating", () => {
  it("401s an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);
    expect((await GET(jsonReq("http://localhost/api/admin/deals", "GET"))).status).toBe(401);
  });

  it("403s a signed-in non-admin", async () => {
    asUser();
    expect((await GET(jsonReq("http://localhost/api/admin/deals", "GET"))).status).toBe(403);
    expect(dealFindManyMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/deals", () => {
  it("lists all deals for an admin", async () => {
    asAdmin();
    dealFindManyMock.mockResolvedValue([{ id: "d1" }]);
    const res = await GET(jsonReq("http://localhost/api/admin/deals", "GET"));
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(1);
  });

  it("filters by a valid source", async () => {
    asAdmin();
    await GET(jsonReq("http://localhost/api/admin/deals?source=LLM", "GET"));
    expect(dealFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { source: "LLM" } }),
    );
  });

  it("400s an invalid source", async () => {
    asAdmin();
    const res = await GET(jsonReq("http://localhost/api/admin/deals?source=BOGUS", "GET"));
    expect(res.status).toBe(400);
    expect(dealFindManyMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/deals", () => {
  it("400s an invalid body", async () => {
    asAdmin();
    const res = await POST(jsonReq("http://localhost/api/admin/deals", "POST", { title: "x" }));
    expect(res.status).toBe(400);
    expect(dealCreateMock).not.toHaveBeenCalled();
  });

  it("400s an unknown chain", async () => {
    asAdmin();
    chainFindUniqueMock.mockResolvedValue(null);
    const res = await POST(jsonReq("http://localhost/api/admin/deals", "POST", validCreate));
    expect(res.status).toBe(400);
    expect(dealCreateMock).not.toHaveBeenCalled();
  });

  it("creates a MANUAL, verified, active deal with the redeem deep-link fields", async () => {
    asAdmin();
    dealCreateMock.mockResolvedValue({ id: "d_new" });
    const res = await POST(jsonReq("http://localhost/api/admin/deals", "POST", validCreate));
    expect(res.status).toBe(201);
    const data = dealCreateMock.mock.calls[0][0].data;
    expect(data).toMatchObject({
      chainId: "chain_w",
      title: "Free Fries",
      source: "MANUAL",
      isVerified: true,
      isActive: true,
      redeemUrl: "https://order.wendys.com/rewards",
      anchorText: "Free Fries",
    });
  });
});

describe("PATCH /api/admin/deals/[id]", () => {
  const params = { params: Promise.resolve({ id: "d1" }) };

  it("403s a non-admin", async () => {
    asUser();
    const res = await PATCH(jsonReq("http://localhost/api/admin/deals/d1", "PATCH", { title: "x" }), params);
    expect(res.status).toBe(403);
  });

  it("404s an unknown deal", async () => {
    asAdmin();
    dealFindUniqueMock.mockResolvedValue(null);
    const res = await PATCH(jsonReq("http://localhost/api/admin/deals/d1", "PATCH", { title: "x" }), params);
    expect(res.status).toBe(404);
    expect(dealUpdateMock).not.toHaveBeenCalled();
  });

  it("updates only supplied fields and can clear a nullable one", async () => {
    asAdmin();
    dealFindUniqueMock.mockResolvedValue({ id: "d1" });
    dealUpdateMock.mockResolvedValue({ id: "d1" });
    await PATCH(
      jsonReq("http://localhost/api/admin/deals/d1", "PATCH", { redeemUrl: "https://x.com/a", description: null }),
      params,
    );
    const data = dealUpdateMock.mock.calls[0][0].data;
    expect(data).toEqual({ redeemUrl: "https://x.com/a", description: null });
  });

  it("verifies an auto-scraped deal via isVerified (the review-queue action)", async () => {
    asAdmin();
    dealFindUniqueMock.mockResolvedValue({ id: "d1", isVerified: false });
    dealUpdateMock.mockResolvedValue({ id: "d1", isVerified: true });
    const res = await PATCH(
      jsonReq("http://localhost/api/admin/deals/d1", "PATCH", { isVerified: true }),
      params,
    );
    expect(res.status).toBe(200);
    expect(dealUpdateMock.mock.calls[0][0].data).toEqual({ isVerified: true });
  });
});

describe("DELETE /api/admin/deals/[id]", () => {
  const params = { params: Promise.resolve({ id: "d1" }) };

  it("404s an unknown deal", async () => {
    asAdmin();
    dealFindUniqueMock.mockResolvedValue(null);
    const res = await DELETE(jsonReq("http://localhost/api/admin/deals/d1", "DELETE"), params);
    expect(res.status).toBe(404);
  });

  it("hard-deletes by default", async () => {
    asAdmin();
    dealFindUniqueMock.mockResolvedValue({ id: "d1" });
    dealDeleteMock.mockResolvedValue({});
    const res = await DELETE(jsonReq("http://localhost/api/admin/deals/d1", "DELETE"), params);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(dealDeleteMock).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("soft-expires with ?expire=1 instead of deleting", async () => {
    asAdmin();
    dealFindUniqueMock.mockResolvedValue({ id: "d1" });
    dealUpdateMock.mockResolvedValue({ id: "d1" });
    const res = await DELETE(jsonReq("http://localhost/api/admin/deals/d1?expire=1", "DELETE"), params);
    expect(res.status).toBe(200);
    expect(dealDeleteMock).not.toHaveBeenCalled();
    const data = dealUpdateMock.mock.calls[0][0].data;
    expect(data.isActive).toBe(false);
    expect(data.expiresAt).toBeInstanceOf(Date);
  });
});
