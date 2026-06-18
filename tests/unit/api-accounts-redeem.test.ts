import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  authMock,
  acctFindFirstMock,
  acctUpdateMock,
  optionFindUniqueMock,
  pointsCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  acctFindFirstMock: vi.fn(),
  acctUpdateMock: vi.fn(),
  optionFindUniqueMock: vi.fn(),
  pointsCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    account: { findFirst: acctFindFirstMock, update: acctUpdateMock },
    redemptionOption: { findUnique: optionFindUniqueMock },
    pointsHistory: { create: pointsCreateMock },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/accounts/[id]/redeem/route";

const signedIn = { user: { id: "user_1", email: "u@example.com" } };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function jsonReq(body?: unknown) {
  return new NextRequest("http://localhost/api/accounts/acct_1/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const tx = {
  account: { update: acctUpdateMock },
  pointsHistory: { create: pointsCreateMock },
};

beforeEach(() => {
  authMock.mockReset().mockResolvedValue(signedIn);
  acctFindFirstMock.mockReset();
  acctUpdateMock.mockReset().mockResolvedValue({ id: "acct_1" });
  optionFindUniqueMock.mockReset();
  pointsCreateMock.mockReset().mockResolvedValue({ id: "ph_1" });
  transactionMock.mockReset().mockImplementation(async (arg) =>
    typeof arg === "function" ? arg(tx) : Promise.all(arg),
  );
});

describe("POST /api/accounts/[id]/redeem", () => {
  it("404s when the account belongs to another user (no existence leak)", async () => {
    acctFindFirstMock.mockResolvedValue(null);
    const res = await POST(jsonReq({ redemptionOptionId: "opt_1" }), params("acct_1"));
    expect(res.status).toBe(404);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("scopes the account lookup to the authenticated user", async () => {
    acctFindFirstMock.mockResolvedValue(null);
    await POST(jsonReq({ redemptionOptionId: "opt_1" }), params("acct_1"));
    expect(acctFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "acct_1", userId: "user_1" } }),
    );
  });

  it("400s when the body is missing redemptionOptionId", async () => {
    acctFindFirstMock.mockResolvedValue({
      id: "acct_1",
      userId: "user_1",
      chainId: "chain_w",
      currentPoints: 1000,
    });
    const res = await POST(jsonReq({}), params("acct_1"));
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("400s when the redemption option doesn't exist", async () => {
    acctFindFirstMock.mockResolvedValue({
      id: "acct_1",
      userId: "user_1",
      chainId: "chain_w",
      currentPoints: 1000,
    });
    optionFindUniqueMock.mockResolvedValue(null);
    const res = await POST(jsonReq({ redemptionOptionId: "opt_1" }), params("acct_1"));
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("400s when the redemption option belongs to a different chain", async () => {
    acctFindFirstMock.mockResolvedValue({
      id: "acct_1",
      userId: "user_1",
      chainId: "chain_w",
      currentPoints: 1000,
    });
    optionFindUniqueMock.mockResolvedValue({
      id: "opt_1",
      chainId: "chain_other",
      itemName: "Free Frosty",
      pointsCost: 500,
    });
    const res = await POST(jsonReq({ redemptionOptionId: "opt_1" }), params("acct_1"));
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("400s when the account doesn't have enough points", async () => {
    acctFindFirstMock.mockResolvedValue({
      id: "acct_1",
      userId: "user_1",
      chainId: "chain_w",
      currentPoints: 100,
    });
    optionFindUniqueMock.mockResolvedValue({
      id: "opt_1",
      chainId: "chain_w",
      itemName: "Free Frosty",
      pointsCost: 500,
    });
    const res = await POST(jsonReq({ redemptionOptionId: "opt_1" }), params("acct_1"));
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("atomically deducts points and logs a REDEMPTION history row on the happy path", async () => {
    acctFindFirstMock.mockResolvedValue({
      id: "acct_1",
      userId: "user_1",
      chainId: "chain_w",
      currentPoints: 1000,
    });
    optionFindUniqueMock.mockResolvedValue({
      id: "opt_1",
      chainId: "chain_w",
      itemName: "Free Frosty",
      pointsCost: 500,
    });

    const res = await POST(jsonReq({ redemptionOptionId: "opt_1" }), params("acct_1"));
    expect(res.status).toBe(200);

    expect(acctUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "acct_1" },
        data: expect.objectContaining({ currentPoints: 500 }),
      }),
    );
    expect(pointsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: "acct_1",
        userId: "user_1",
        previousPoints: 1000,
        newPoints: 500,
        changeReason: "REDEMPTION",
        note: "Free Frosty",
      }),
    });

    const json = await res.json();
    expect(json).toHaveProperty("account");
    expect(json).toHaveProperty("pointsHistory");
  });
});
