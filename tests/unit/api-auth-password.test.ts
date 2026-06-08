import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// reset-tokens is fully mocked so no real email is ever sent and token values
// are deterministic. @/lib/auth is stubbed because the routes import @/lib/api
// → @/lib/auth → next-auth, which can't resolve next/server in this env.
const {
  userFindUniqueMock,
  prtUpdateManyMock,
  prtCreateMock,
  prtFindUniqueMock,
  prtUpdateMock,
  userUpdateMock,
  transactionMock,
  sendResetEmailMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  prtUpdateManyMock: vi.fn(),
  prtCreateMock: vi.fn(),
  prtFindUniqueMock: vi.fn(),
  prtUpdateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  sendResetEmailMock: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/reset-tokens", () => ({
  mintResetToken: () => "raw-token",
  hashResetToken: (t: string) => `hash:${t}`,
  resetTokenExpiry: () => new Date(Date.now() + 60 * 60 * 1000),
  sendResetEmail: sendResetEmailMock,
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUniqueMock, update: userUpdateMock },
    passwordResetToken: {
      updateMany: prtUpdateManyMock,
      create: prtCreateMock,
      findUnique: prtFindUniqueMock,
      update: prtUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";

function req(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const forgotReq = (b: unknown) => req("http://localhost/api/auth/forgot-password", b);
const resetReq = (b: unknown) => req("http://localhost/api/auth/reset-password", b);

beforeEach(() => {
  userFindUniqueMock.mockReset();
  prtUpdateManyMock.mockReset().mockResolvedValue({ count: 0 });
  prtCreateMock.mockReset().mockResolvedValue({});
  prtFindUniqueMock.mockReset();
  prtUpdateMock.mockReset().mockReturnValue({ __op: "upd" });
  userUpdateMock.mockReset().mockReturnValue({ __op: "user" });
  transactionMock.mockReset().mockResolvedValue([]);
  sendResetEmailMock.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/auth/forgot-password", () => {
  it("400s an invalid email", async () => {
    expect((await forgot(forgotReq({ email: "nope" }))).status).toBe(400);
  });

  it("200s without sending for an unknown email (no enumeration)", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    const res = await forgot(forgotReq({ email: "ghost@example.com" }));
    expect(res.status).toBe(200);
    expect(sendResetEmailMock).not.toHaveBeenCalled();
    expect(prtCreateMock).not.toHaveBeenCalled();
  });

  it("200s without sending for a passwordless (Google-only) account", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u1", email: "g@x.com", name: null, password: null });
    const res = await forgot(forgotReq({ email: "g@x.com" }));
    expect(res.status).toBe(200);
    expect(sendResetEmailMock).not.toHaveBeenCalled();
  });

  it("mints, invalidates prior tokens, and emails a credentials user", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u1", email: "a@x.com", name: "A", password: "hash" });
    const res = await forgot(forgotReq({ email: "a@x.com" }));
    expect(res.status).toBe(200);
    expect(prtUpdateManyMock).toHaveBeenCalled(); // burn outstanding tokens
    expect(prtCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tokenHash: "hash:raw-token" }) }),
    );
    expect(sendResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@x.com", token: "raw-token" }),
    );
  });

  it("still 200s when the email send throws", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u1", email: "a@x.com", name: "A", password: "hash" });
    sendResetEmailMock.mockRejectedValue(new Error("smtp down"));
    expect((await forgot(forgotReq({ email: "a@x.com" }))).status).toBe(200);
  });
});

describe("POST /api/auth/reset-password", () => {
  const body = { token: "raw-token", password: "supersecret" };

  it("400s a too-short password", async () => {
    expect((await reset(resetReq({ token: "x", password: "short" }))).status).toBe(400);
  });

  it("400s an unknown token", async () => {
    prtFindUniqueMock.mockResolvedValue(null);
    expect((await reset(resetReq(body))).status).toBe(400);
  });

  it("400s an already-used token", async () => {
    prtFindUniqueMock.mockResolvedValue({ id: "t1", userId: "u1", usedAt: new Date(), expiresAt: new Date(Date.now() + 1e6) });
    expect((await reset(resetReq(body))).status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("400s an expired token", async () => {
    prtFindUniqueMock.mockResolvedValue({ id: "t1", userId: "u1", usedAt: null, expiresAt: new Date(Date.now() - 1000) });
    expect((await reset(resetReq(body))).status).toBe(400);
  });

  it("sets a hashed password and consumes the token", async () => {
    prtFindUniqueMock.mockResolvedValue({ id: "t1", userId: "u1", usedAt: null, expiresAt: new Date(Date.now() + 1e6) });
    const res = await reset(resetReq(body));
    expect(res.status).toBe(200);
    // user.update was invoked with a hashed (not plaintext) password.
    const userData = userUpdateMock.mock.calls[0][0].data;
    expect(userData.password).not.toBe("supersecret");
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
