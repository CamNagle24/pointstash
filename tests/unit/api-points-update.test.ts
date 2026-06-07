import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { authMock, acctFindUniqueMock, acctUpdateMock, pointsCreateMock, transactionMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    acctFindUniqueMock: vi.fn(),
    acctUpdateMock: vi.fn(),
    pointsCreateMock: vi.fn(),
    transactionMock: vi.fn(),
  }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    account: { findUnique: acctFindUniqueMock, update: acctUpdateMock },
    pointsHistory: { create: pointsCreateMock },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/points/update/route";

const signedIn = { user: { id: "user_1", email: "u@example.com" } };
const tx = { account: { update: acctUpdateMock }, pointsHistory: { create: pointsCreateMock } };

function req(body: unknown) {
  return new NextRequest("http://localhost/api/points/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockReset().mockResolvedValue(signedIn);
  acctFindUniqueMock.mockReset();
  acctUpdateMock.mockReset().mockResolvedValue({ id: "acct_1", currentPoints: 250 });
  pointsCreateMock.mockReset().mockResolvedValue({});
  transactionMock.mockReset().mockImplementation(async (fn) => fn(tx));
});

describe("POST /api/points/update", () => {
  const body = { accountId: "acct_1", newPoints: 250 };

  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect((await POST(req(body))).status).toBe(401);
  });

  it("400s on invalid input", async () => {
    expect((await POST(req({ accountId: "acct_1", newPoints: -5 }))).status).toBe(400);
  });

  it("404s a missing account", async () => {
    acctFindUniqueMock.mockResolvedValue(null);
    expect((await POST(req(body))).status).toBe(404);
  });

  it("403s an account owned by someone else", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", userId: "other", currentPoints: 100 });
    const res = await POST(req(body));
    expect(res.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("writes a history row and updates the balance", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", userId: "user_1", currentPoints: 100 });
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(pointsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousPoints: 100,
          newPoints: 250,
          changeReason: "MANUAL_UPDATE",
        }),
      }),
    );
    expect(acctUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "acct_1" } }),
    );
  });
});
