import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashExtensionToken } from "@/lib/extension-auth";

// @/lib/extension-auth is left REAL (mint/hash are pure crypto); only auth + db
// are mocked. requireAuth (from @/lib/api) runs for real against the mock.
const { authMock, updateManyMock, createMock, transactionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  updateManyMock: vi.fn(),
  createMock: vi.fn(),
  transactionMock: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    extensionToken: { updateMany: updateManyMock, create: createMock },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/extension/pair/route";

beforeEach(() => {
  authMock.mockReset();
  updateManyMock.mockReset().mockReturnValue({ __op: "revoke" });
  createMock.mockReset().mockReturnValue({ __op: "create" });
  transactionMock.mockReset().mockImplementation(async (arg) =>
    typeof arg === "function" ? arg({}) : Promise.all(arg),
  );
});

describe("POST /api/extension/pair", () => {
  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("revokes existing tokens, stores only the hash, and returns the raw token once", async () => {
    authMock.mockResolvedValue({ user: { id: "user_1", email: "u@example.com" } });

    const res = await POST();
    expect(res.status).toBe(200);
    const { token } = await res.json();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    // Prior tokens for this user get revoked.
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });

    // Only the HASH is persisted — never the raw token.
    const stored = createMock.mock.calls[0][0].data;
    expect(stored.userId).toBe("user_1");
    expect(stored.tokenHash).toBe(hashExtensionToken(token));
    expect(stored.tokenHash).not.toBe(token);
  });
});
