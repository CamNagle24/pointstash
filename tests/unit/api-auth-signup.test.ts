import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const { userCreateMock, signupAttemptCountMock, signupAttemptCreateMock, signupAttemptDeleteManyMock } = vi.hoisted(() => ({
  userCreateMock: vi.fn(),
  signupAttemptCountMock: vi.fn(),
  signupAttemptCreateMock: vi.fn(),
  signupAttemptDeleteManyMock: vi.fn(),
}));
// The route imports @/lib/api → @/lib/auth → next-auth, which fails to resolve
// next/server in this env. Stub auth; signup doesn't use it.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { create: userCreateMock },
    signupAttempt: {
      count: signupAttemptCountMock,
      create: signupAttemptCreateMock,
      deleteMany: signupAttemptDeleteManyMock,
    },
  },
}));

import { POST } from "@/app/api/auth/signup/route";

function req(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  userCreateMock.mockReset().mockResolvedValue({ id: "u1", email: "a@b.com", name: "A" });
  signupAttemptCountMock.mockReset().mockResolvedValue(0);
  signupAttemptCreateMock.mockReset().mockResolvedValue({});
  signupAttemptDeleteManyMock.mockReset().mockResolvedValue({ count: 0 });
});

describe("POST /api/auth/signup", () => {
  it("400s an invalid email", async () => {
    expect((await POST(req({ email: "nope", password: "longenough" }))).status).toBe(400);
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it("400s a too-short password", async () => {
    expect((await POST(req({ email: "a@b.com", password: "short" }))).status).toBe(400);
  });

  it("hashes the password (never stores plaintext) and returns 201", async () => {
    const res = await POST(req({ email: "a@b.com", password: "supersecret", name: "A" }));
    expect(res.status).toBe(201);
    const stored = userCreateMock.mock.calls[0][0].data.password;
    expect(stored).not.toBe("supersecret");
    expect(await bcrypt.compare("supersecret", stored)).toBe(true);
    // Response must not leak the hash.
    expect(await res.json()).toEqual({ id: "u1", email: "a@b.com", name: "A" });
  });

  it("409s a duplicate email (P2002)", async () => {
    userCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }),
    );
    expect((await POST(req({ email: "a@b.com", password: "longenough" }))).status).toBe(409);
  });

  it("allows signup just under the per-IP cap and records the attempt", async () => {
    signupAttemptCountMock.mockResolvedValue(4);
    const res = await POST(req({ email: "a@b.com", password: "longenough" }));
    expect(res.status).toBe(201);
    expect(signupAttemptCreateMock).toHaveBeenCalledTimes(1);
    expect(userCreateMock).toHaveBeenCalledTimes(1);
  });

  it("429s once the per-IP hourly cap is hit, without creating a user", async () => {
    signupAttemptCountMock.mockResolvedValue(5);
    const res = await POST(req({ email: "a@b.com", password: "longenough" }));
    expect(res.status).toBe(429);
    expect(userCreateMock).not.toHaveBeenCalled();
    expect(signupAttemptCreateMock).not.toHaveBeenCalled();
  });

  it("scopes the rate-limit count to the requesting IP and a 1h window", async () => {
    signupAttemptCountMock.mockResolvedValue(0);
    await POST(req({ email: "a@b.com", password: "longenough" }, { "x-forwarded-for": "1.2.3.4" }));
    expect(signupAttemptCountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ipHash: expect.any(String),
          createdAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
    const countArgs = signupAttemptCountMock.mock.calls[0][0];
    const createArgs = signupAttemptCreateMock.mock.calls[0][0];
    expect(createArgs.data.ipHash).toBe(countArgs.where.ipHash);
  });

  it("does not store the raw IP, only its hash", async () => {
    await POST(req({ email: "a@b.com", password: "longenough" }, { "x-forwarded-for": "9.9.9.9" }));
    const stored = signupAttemptCreateMock.mock.calls[0][0].data.ipHash;
    expect(stored).not.toBe("9.9.9.9");
    expect(stored).toMatch(/^[a-f0-9]{64}$/);
  });

  it("prunes rows older than 1 hour and succeeds when only 2 recent attempts exist", async () => {
    // Simulate 3 stale attempts already deleted server-side; count returns only the 2 recent ones.
    signupAttemptCountMock.mockResolvedValue(2);

    const res = await POST(req({ email: "a@b.com", password: "longenough" }));
    expect(res.status).toBe(201);

    // deleteMany must be called with a createdAt lt cutoff to prune stale rows
    expect(signupAttemptDeleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }),
    );

    // The cutoff must be approximately 1 hour in the past
    const deletedWhere = signupAttemptDeleteManyMock.mock.calls[0][0].where;
    const cutoff = deletedWhere.createdAt.lt as Date;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - oneHourAgo)).toBeLessThan(5000);
  });
});
