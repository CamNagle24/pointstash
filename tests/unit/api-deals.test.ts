import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth + db before importing the route. The route's interesting behavior
// is how it shapes the Prisma `where` clause for the hybrid (global + personal)
// feed, so we capture the args db.deal.findMany is called with.
const { authMock, findManyMock, countMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findManyMock: vi.fn(),
  countMock: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: { deal: { findMany: findManyMock, count: countMock } },
}));

import { GET } from "@/app/api/deals/route";

function req(query = "") {
  return new NextRequest(`http://localhost/api/deals${query}`);
}

beforeEach(() => {
  authMock.mockReset();
  findManyMock.mockReset().mockResolvedValue([]);
  countMock.mockReset().mockResolvedValue(0);
});

/** The ownership clause is the first entry of the top-level AND. */
function ownershipClause() {
  const where = findManyMock.mock.calls[0][0].where;
  return where.AND[0];
}

describe("GET /api/deals — hybrid feed", () => {
  it("shows only global deals (userId=null) when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(ownershipClause()).toEqual({ userId: null });
  });

  it("shows global + the signed-in user's personal deals when authenticated", async () => {
    authMock.mockResolvedValue({ user: { id: "user_42" } });

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(ownershipClause()).toEqual({ OR: [{ userId: null }, { userId: "user_42" }] });
  });

  it("rejects an invalid sort value without touching the db", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(req("?sort=bogus"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 500 (not throw) when the query fails", async () => {
    authMock.mockResolvedValue(null);
    findManyMock.mockRejectedValue(new Error("db down"));

    const res = await GET(req());
    expect(res.status).toBe(500);
  });

  it("returns 200 with empty deals array for an unknown chain slug", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(req("?chain=doesnotexist"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deals).toEqual([]);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("limit");
    expect(body).toHaveProperty("offset");
  });

  it("passes the unknown chain slug through to the where clause (no 404)", async () => {
    authMock.mockResolvedValue(null);
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    await GET(req("?chain=doesnotexist"));

    const where = findManyMock.mock.calls[0][0].where;
    // The AND array should include the chain filter with the unknown slug
    const chainFilter = where.AND.find(
      (clause: Record<string, unknown>) => clause.chain !== undefined,
    );
    expect(chainFilter).toEqual({ chain: { slug: { in: ["doesnotexist"] } } });
  });
});
