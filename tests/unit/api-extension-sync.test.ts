import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  authMock,
  chainFindUniqueMock,
  acctFindUniqueMock,
  acctCreateMock,
  acctUpdateMock,
  pointsCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  chainFindUniqueMock: vi.fn(),
  acctFindUniqueMock: vi.fn(),
  acctCreateMock: vi.fn(),
  acctUpdateMock: vi.fn(),
  pointsCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));
// The route imports @/lib/api → @/lib/auth → next-auth, which fails to resolve
// next/server in this env. Stub auth; sync uses the extension guard instead.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/extension-auth", () => ({ requireExtensionAuth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    chain: { findUnique: chainFindUniqueMock },
    account: { findUnique: acctFindUniqueMock, create: acctCreateMock, update: acctUpdateMock },
    pointsHistory: { create: pointsCreateMock },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/extension/sync/route";

const tx = {
  account: { create: acctCreateMock, update: acctUpdateMock },
  pointsHistory: { create: pointsCreateMock },
};

function req(body: unknown) {
  return new Request("http://localhost/api/extension/sync", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer tok" },
    body: JSON.stringify(body),
  });
}

const body = { chainSlug: "wendys", balance: 500 };

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ userId: "user_1", tokenId: "t1" });
  chainFindUniqueMock.mockReset().mockResolvedValue({ id: "chain_w", slug: "wendys" });
  acctFindUniqueMock.mockReset();
  acctCreateMock.mockReset().mockResolvedValue({ id: "acct_1", currentPoints: 500 });
  acctUpdateMock.mockReset().mockResolvedValue({ id: "acct_1", currentPoints: 500 });
  pointsCreateMock.mockReset().mockResolvedValue({});
  transactionMock.mockReset().mockImplementation(async (fn) => fn(tx));
});

describe("POST /api/extension/sync", () => {
  it("returns the auth guard's response on a bad token", async () => {
    const unauthorized = new Response(null, { status: 401 });
    authMock.mockResolvedValue({ response: unauthorized });
    expect(await POST(req(body))).toBe(unauthorized);
  });

  it("400s invalid input", async () => {
    expect((await POST(req({ chainSlug: "wendys", balance: -1 }))).status).toBe(400);
  });

  it("404s an unknown chain", async () => {
    chainFindUniqueMock.mockResolvedValue(null);
    expect((await POST(req(body))).status).toBe(404);
  });

  it("first sync creates the account and seeds a 0→balance history row", async () => {
    acctFindUniqueMock.mockResolvedValue(null);
    const res = await POST(req(body));
    expect((await res.json()).updated).toBe(true);
    expect(acctCreateMock).toHaveBeenCalled();
    expect(pointsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ previousPoints: 0, newPoints: 500 }) }),
    );
  });

  it("unchanged balance is a no-op (no history), just touches lastSynced", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", currentPoints: 500, isActive: true });
    const res = await POST(req(body));
    expect((await res.json()).updated).toBe(false);
    expect(pointsCreateMock).not.toHaveBeenCalled();
    expect(acctUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: true }) }),
    );
  });

  it("changed balance writes history and updates the account", async () => {
    acctFindUniqueMock.mockResolvedValue({ id: "acct_1", currentPoints: 300, isActive: true });
    const res = await POST(req(body));
    expect((await res.json()).updated).toBe(true);
    expect(pointsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ previousPoints: 300, newPoints: 500 }) }),
    );
  });
});
