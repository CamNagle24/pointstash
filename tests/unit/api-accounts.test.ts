import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const {
  authMock,
  acctFindManyMock,
  acctFindUniqueMock,
  acctCreateMock,
  acctUpdateMock,
  chainFindUniqueMock,
  pointsCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  acctFindManyMock: vi.fn(),
  acctFindUniqueMock: vi.fn(),
  acctCreateMock: vi.fn(),
  acctUpdateMock: vi.fn(),
  chainFindUniqueMock: vi.fn(),
  pointsCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    account: {
      findMany: acctFindManyMock,
      findUnique: acctFindUniqueMock,
      create: acctCreateMock,
      update: acctUpdateMock,
    },
    chain: { findUnique: chainFindUniqueMock },
    pointsHistory: { create: pointsCreateMock },
    $transaction: transactionMock,
  },
}));

import { GET, POST } from "@/app/api/accounts/route";
import { PUT, DELETE } from "@/app/api/accounts/[id]/route";

const signedIn = { user: { id: "user_1", email: "u@example.com" } };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function jsonReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/accounts", {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// Interactive-transaction stub: invoke the callback with a tx that proxies to
// the same account/pointsHistory mocks.
const tx = {
  account: { create: acctCreateMock, update: acctUpdateMock },
  pointsHistory: { create: pointsCreateMock },
};

beforeEach(() => {
  authMock.mockReset().mockResolvedValue(signedIn);
  acctFindManyMock.mockReset().mockResolvedValue([]);
  acctFindUniqueMock.mockReset();
  acctCreateMock.mockReset().mockResolvedValue({ id: "acct_1" });
  acctUpdateMock.mockReset().mockResolvedValue({ id: "acct_1" });
  chainFindUniqueMock.mockReset().mockResolvedValue({ id: "chain_w" });
  pointsCreateMock.mockReset().mockResolvedValue({});
  transactionMock.mockReset().mockImplementation(async (arg) =>
    typeof arg === "function" ? arg(tx) : Promise.all(arg),
  );
});

describe("GET /api/accounts", () => {
  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(acctFindManyMock).not.toHaveBeenCalled();
  });

  it("returns the caller's active accounts only", async () => {
    await GET();
    expect(acctFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1", isActive: true } }),
    );
  });
});

describe("POST /api/accounts", () => {
  const body = { chainSlug: "wendys", currentPoints: 500 };

  it("404s an unknown chain", async () => {
    chainFindUniqueMock.mockResolvedValue(null);
    expect((await POST(jsonReq("POST", body))).status).toBe(404);
  });

  it("creates an account scoped to the caller and seeds lastSynced when points given", async () => {
    acctCreateMock.mockResolvedValue({ id: "acct_new" });
    const res = await POST(jsonReq("POST", body));
    expect(res.status).toBe(201);
    const data = acctCreateMock.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: "user_1", chainId: "chain_w", currentPoints: 500 });
    expect(data.lastSynced).toBeInstanceOf(Date);
  });

  it("409s when the user already linked that chain (P2002)", async () => {
    acctCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }),
    );
    expect((await POST(jsonReq("POST", body))).status).toBe(409);
  });
});

describe("PUT /api/accounts/[id]", () => {
  it("403s when the account belongs to another user", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", userId: "someone_else", currentPoints: 0 });
    const res = await PUT(jsonReq("PUT", { currentPoints: 10 }), params("acct_1"));
    expect(res.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("404s a missing account", async () => {
    acctFindUniqueMock.mockResolvedValue(null);
    expect((await PUT(jsonReq("PUT", { currentPoints: 10 }), params("x"))).status).toBe(404);
  });

  it("logs a history row when points change", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", userId: "user_1", currentPoints: 100 });
    const res = await PUT(jsonReq("PUT", { currentPoints: 250 }), params("acct_1"));
    expect(res.status).toBe(200);
    expect(pointsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ previousPoints: 100, newPoints: 250 }),
      }),
    );
  });

  it("does not log history when points are unchanged", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", userId: "user_1", currentPoints: 100 });
    await PUT(jsonReq("PUT", { currentPoints: 100, loyaltyId: "abc" }), params("acct_1"));
    expect(pointsCreateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/accounts/[id]", () => {
  it("403s another user's account", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", userId: "other" });
    expect((await DELETE(jsonReq("DELETE"), params("acct_1"))).status).toBe(403);
  });

  it("soft-deletes (isActive=false) the caller's account", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", userId: "user_1" });
    const res = await DELETE(jsonReq("DELETE"), params("acct_1"));
    expect(res.status).toBe(200);
    expect(acctUpdateMock).toHaveBeenCalledWith({
      where: { id: "acct_1" },
      data: { isActive: false },
    });
  });
});
