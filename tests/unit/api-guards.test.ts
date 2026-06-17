import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// @/lib/api imports @/lib/auth → next-auth, which can't resolve next/server
// in this env, so stub it the same way the other api-* unit tests do.
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));

import { requireAuth, isCronRequest, requireAdmin } from "@/lib/api";

function cronReq(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  return new NextRequest("http://localhost/api/cron/whatever", { headers });
}

describe("requireAuth", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns a 401 response when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await requireAuth();

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  it("returns a 401 response when the session has no user id", async () => {
    authMock.mockResolvedValue({ user: {} });

    const result = await requireAuth();

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns the userId for an authenticated session", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });

    const result = await requireAuth();

    expect(result).toEqual({ userId: "user-123" });
  });
});

describe("isCronRequest", () => {
  const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  });

  it("accepts a request with the configured cron secret", () => {
    expect(isCronRequest(cronReq("Bearer test-cron-secret"))).toBe(true);
  });

  it("rejects a request with no authorization header", () => {
    expect(isCronRequest(cronReq())).toBe(false);
  });

  it("rejects a request with an incorrect secret", () => {
    expect(isCronRequest(cronReq("Bearer wrong-secret"))).toBe(false);
  });

  it("rejects a request missing the Bearer prefix", () => {
    expect(isCronRequest(cronReq("test-cron-secret"))).toBe(false);
  });

  it("rejects a previously-valid secret once CRON_SECRET changes", () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequest(cronReq("Bearer test-cron-secret"))).toBe(false);
  });

  it("rejects 'Bearer undefined' when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequest(cronReq("Bearer undefined"))).toBe(false);
  });

  it("rejects any header when CRON_SECRET is empty string", () => {
    process.env.CRON_SECRET = "";
    expect(isCronRequest(cronReq("Bearer "))).toBe(false);
    expect(isCronRequest(cronReq("Bearer undefined"))).toBe(false);
  });
});

describe("requireAdmin", () => {
  const ORIGINAL_ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    authMock.mockReset();
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = ORIGINAL_ADMIN_EMAIL;
  });

  it("returns 401 when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const result = await requireAdmin();
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toMatchObject({ error: "Unauthorized" });
    }
  });

  it("returns 401 when the session has no user id", async () => {
    authMock.mockResolvedValue({ user: { email: "admin@example.com" } });
    const result = await requireAdmin();
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(401);
  });

  it("returns 403 when the session email is not in ADMIN_EMAIL", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "other@example.com" } });
    const result = await requireAdmin();
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(403);
      expect(await result.response.json()).toMatchObject({ error: "Forbidden" });
    }
  });

  it("returns 403 (fails closed) when ADMIN_EMAIL is unset", async () => {
    delete process.env.ADMIN_EMAIL;
    authMock.mockResolvedValue({ user: { id: "u1", email: "anyone@example.com" } });
    const result = await requireAdmin();
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("returns 403 (fails closed) when ADMIN_EMAIL is empty string", async () => {
    process.env.ADMIN_EMAIL = "";
    authMock.mockResolvedValue({ user: { id: "u1", email: "anyone@example.com" } });
    const result = await requireAdmin();
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("accepts the correct admin email and returns { userId }", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "admin@example.com" } });
    const result = await requireAdmin();
    expect(result).toEqual({ userId: "u1" });
  });

  it("accepts the admin email case-insensitively", async () => {
    process.env.ADMIN_EMAIL = "Admin@Example.COM";
    authMock.mockResolvedValue({ user: { id: "u1", email: "admin@example.com" } });
    expect(await requireAdmin()).toEqual({ userId: "u1" });

    authMock.mockResolvedValue({ user: { id: "u1", email: "ADMIN@EXAMPLE.COM" } });
    expect(await requireAdmin()).toEqual({ userId: "u1" });
  });

  it("accepts any email from a comma-separated ADMIN_EMAIL list", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com, superuser@example.com , ops@example.com";
    authMock.mockResolvedValue({ user: { id: "u2", email: "superuser@example.com" } });
    expect(await requireAdmin()).toEqual({ userId: "u2" });
  });

  it("rejects an email not in the comma-separated list", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com,ops@example.com";
    authMock.mockResolvedValue({ user: { id: "u3", email: "intruder@example.com" } });
    const result = await requireAdmin();
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });
});
