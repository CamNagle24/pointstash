import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const { userCreateMock } = vi.hoisted(() => ({ userCreateMock: vi.fn() }));
// The route imports @/lib/api → @/lib/auth → next-auth, which fails to resolve
// next/server in this env. Stub auth; signup doesn't use it.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { create: userCreateMock } } }));

import { POST } from "@/app/api/auth/signup/route";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  userCreateMock.mockReset().mockResolvedValue({ id: "u1", email: "a@b.com", name: "A" });
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
});
