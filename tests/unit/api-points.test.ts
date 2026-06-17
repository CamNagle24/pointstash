import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  authMock,
  acctFindManyMock,
  acctFindUniqueMock,
  acctFindFirstMock,
  historyFindManyMock,
  historyCountMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  acctFindManyMock: vi.fn(),
  acctFindUniqueMock: vi.fn(),
  acctFindFirstMock: vi.fn(),
  historyFindManyMock: vi.fn(),
  historyCountMock: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    account: {
      findMany: acctFindManyMock,
      findUnique: acctFindUniqueMock,
      findFirst: acctFindFirstMock,
    },
    pointsHistory: { findMany: historyFindManyMock, count: historyCountMock },
  },
}));

import { GET as summary } from "@/app/api/points/route";
import { GET as history } from "@/app/api/points/history/route";

const signedIn = { user: { id: "user_1", email: "u@x.com" } };
const historyReq = (query = "") => new NextRequest(`http://localhost/api/points/history${query}`);

beforeEach(() => {
  authMock.mockReset().mockResolvedValue(signedIn);
  acctFindManyMock.mockReset().mockResolvedValue([]);
  acctFindUniqueMock.mockReset();
  acctFindFirstMock.mockReset();
  historyFindManyMock.mockReset().mockResolvedValue([]);
  historyCountMock.mockReset().mockResolvedValue(0);
});

describe("GET /api/points (summary)", () => {
  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect((await summary()).status).toBe(401);
  });

  it("values points off the best redemption and totals across accounts", async () => {
    acctFindManyMock.mockResolvedValue([
      {
        id: "a1",
        currentPoints: 1000,
        lastSynced: null,
        chain: {
          name: "Wendy's",
          slug: "wendys",
          logo: "l",
          color: "#e2231a",
          pointsName: "points",
          redemptionOptions: [{ itemName: "Frosty", centsPerPoint: 1.5 }],
        },
      },
      {
        id: "a2",
        currentPoints: 500,
        lastSynced: null,
        chain: {
          name: "KFC",
          slug: "kfc",
          logo: "l",
          color: "#000",
          pointsName: "points",
          redemptionOptions: [], // no redemption → value 0, bestRedemption null
        },
      },
    ]);
    const res = await summary();
    expect(res.status).toBe(200);
    const body = await res.json();
    // 1000 * 1.5 / 100 = 15.00; second account contributes 0.
    expect(body.accounts[0].estimatedValue).toBe(15);
    expect(body.accounts[1].bestRedemption).toBeNull();
    expect(body.totalPointsValue).toBe(15);
    expect(body.totalAccounts).toBe(2);
  });
});

describe("GET /api/points/history", () => {
  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect((await history(historyReq())).status).toBe(401);
  });

  it("404s an unknown accountId filter", async () => {
    acctFindFirstMock.mockResolvedValue(null);
    expect((await history(historyReq("?accountId=nope"))).status).toBe(404);
  });

  it("404s (not 403) an accountId belonging to another user — no existence disclosure", async () => {
    // findFirst scopes by { id, userId } so another user's account returns null.
    acctFindFirstMock.mockResolvedValue(null);
    const res = await history(historyReq("?accountId=a1"));
    expect(res.status).toBe(404);
    expect(historyFindManyMock).not.toHaveBeenCalled();
  });

  it("scopes the account lookup to the authenticated user", async () => {
    acctFindFirstMock.mockResolvedValue(null);
    await history(historyReq("?accountId=a1"));
    expect(acctFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user_1", id: "a1" }) }),
    );
  });

  it("scopes history to the caller (and account when given)", async () => {
    acctFindFirstMock.mockResolvedValue({ userId: "user_1" });
    historyFindManyMock.mockResolvedValue([{ id: "h1" }]);
    historyCountMock.mockResolvedValue(1);
    const res = await history(historyReq("?accountId=a1"));
    expect(res.status).toBe(200);
    expect(historyFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1", accountId: "a1" } }),
    );
  });
});
