import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// @/lib/api imports @/lib/auth → next-auth, which can't resolve next/server
// in this env, so stub it the same way the other api-* unit tests do.
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));

import { requireAuth, isCronRequest } from "@/lib/api";

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
});
