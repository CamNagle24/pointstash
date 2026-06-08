import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, userFindUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
}));
// @/lib/api → @/lib/auth → next-auth can't resolve next/server here; stub it.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/extension-auth", () => ({ requireExtensionAuth: authMock }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: userFindUniqueMock } } }));

import { GET } from "@/app/api/extension/whoami/route";

const req = () =>
  new Request("http://localhost/api/extension/whoami", {
    headers: { authorization: "Bearer tok" },
  });

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ userId: "user_1", tokenId: "t1" });
  userFindUniqueMock.mockReset();
});

describe("GET /api/extension/whoami", () => {
  it("returns the auth guard's response on a bad token", async () => {
    const unauthorized = new Response(null, { status: 401 });
    authMock.mockResolvedValue({ response: unauthorized });
    expect(await GET(req())).toBe(unauthorized);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("404s when the token's user no longer exists", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    expect((await GET(req())).status).toBe(404);
  });

  it("returns the identity for a valid token", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "user_1", email: "u@x.com", name: "U" });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "user_1", email: "u@x.com", name: "U" });
  });
});
