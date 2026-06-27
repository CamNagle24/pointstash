import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the IO boundaries only; the real requireAuth guard (from @/lib/api) runs
// against the mocked auth(), so the 401 path is genuinely exercised.
const { authMock, findUniqueMock, updateMock, deleteMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: findUniqueMock, update: updateMock, delete: deleteMock } },
}));

import { GET, PATCH, DELETE } from "@/app/api/user/me/route";

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/me", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const signedIn = { user: { id: "user_1", email: "u@example.com" } };

beforeEach(() => {
  authMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("GET /api/user/me", () => {
  it("401s when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns the user's profile when signed in", async () => {
    authMock.mockResolvedValue(signedIn);
    findUniqueMock.mockResolvedValue({ id: "user_1", email: "u@example.com", name: "U" });
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("user_1");
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_1" } }),
    );
  });

  it("404s when the row is gone", async () => {
    authMock.mockResolvedValue(signedIn);
    findUniqueMock.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });
});

describe("PATCH /api/user/me", () => {
  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await PATCH(patchReq({ notifyExpiring: false }));
    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400s on an empty update (no fields)", async () => {
    authMock.mockResolvedValue(signedIn);
    const res = await PATCH(patchReq({}));
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400s on an out-of-range field", async () => {
    authMock.mockResolvedValue(signedIn);
    const res = await PATCH(patchReq({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("updates only the supplied fields, scoped to the caller", async () => {
    authMock.mockResolvedValue(signedIn);
    updateMock.mockResolvedValue({ id: "user_1", notifyExpiring: false });
    const res = await PATCH(patchReq({ notifyExpiring: false }));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_1" }, data: { notifyExpiring: false } }),
    );
  });

  it("updates notifyAffordable", async () => {
    authMock.mockResolvedValue(signedIn);
    updateMock.mockResolvedValue({ id: "user_1", notifyAffordable: false });
    const res = await PATCH(patchReq({ notifyAffordable: false }));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_1" }, data: { notifyAffordable: false } }),
    );
  });
});

describe("DELETE /api/user/me", () => {
  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await DELETE();
    expect(res.status).toBe(401);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the caller's account and returns 204", async () => {
    authMock.mockResolvedValue(signedIn);
    deleteMock.mockResolvedValue({});
    const res = await DELETE();
    expect(res.status).toBe(204);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "user_1" } });
  });
});
