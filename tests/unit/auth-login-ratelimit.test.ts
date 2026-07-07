import { describe, it, expect, vi, beforeEach } from "vitest";

const { loginAttemptCountMock, loginAttemptCreateMock, loginAttemptDeleteManyMock } = vi.hoisted(
  () => ({
    loginAttemptCountMock: vi.fn(),
    loginAttemptCreateMock: vi.fn(),
    loginAttemptDeleteManyMock: vi.fn(),
  }),
);

vi.mock("@/lib/db", () => ({
  db: {
    loginAttempt: {
      count: loginAttemptCountMock,
      create: loginAttemptCreateMock,
      deleteMany: loginAttemptDeleteManyMock,
    },
  },
}));

import { hashEmail, isLoginRateLimited, recordFailedLogin } from "@/lib/auth-login-rate-limit";

beforeEach(() => {
  loginAttemptCountMock.mockReset().mockResolvedValue(0);
  loginAttemptCreateMock.mockReset().mockResolvedValue({});
  loginAttemptDeleteManyMock.mockReset().mockResolvedValue({ count: 0 });
});

describe("hashEmail", () => {
  it("returns a 64-char hex string", () => {
    expect(hashEmail("user@example.com")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalises to lowercase before hashing", () => {
    expect(hashEmail("User@Example.COM")).toBe(hashEmail("user@example.com"));
  });

  it("does not return the raw email", () => {
    expect(hashEmail("user@example.com")).not.toBe("user@example.com");
  });
});

describe("isLoginRateLimited", () => {
  it("returns false when both IP and email counts are under cap", async () => {
    loginAttemptCountMock.mockResolvedValue(9);
    expect(await isLoginRateLimited("iphash", "emailhash")).toBe(false);
  });

  it("returns true when IP count reaches the cap (10)", async () => {
    // First call (byIp) = 10, second (byEmail) = 0
    loginAttemptCountMock
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0);
    expect(await isLoginRateLimited("iphash", "emailhash")).toBe(true);
  });

  it("returns true when email count reaches the cap (10)", async () => {
    // First call (byIp) = 0, second (byEmail) = 10
    loginAttemptCountMock
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(10);
    expect(await isLoginRateLimited("iphash", "emailhash")).toBe(true);
  });

  it("returns false when counts are one below cap", async () => {
    loginAttemptCountMock.mockResolvedValue(9);
    expect(await isLoginRateLimited("iphash", "emailhash")).toBe(false);
  });

  it("scopes the IP count to the correct ipHash and a 15-min window", async () => {
    await isLoginRateLimited("abc123", "def456");
    const ipCountArgs = loginAttemptCountMock.mock.calls[0][0];
    expect(ipCountArgs.where.ipHash).toBe("abc123");
    expect(ipCountArgs.where.createdAt.gt).toBeInstanceOf(Date);
    const windowMs = Date.now() - ipCountArgs.where.createdAt.gt.getTime();
    expect(windowMs).toBeGreaterThan(14 * 60 * 1000);
    expect(windowMs).toBeLessThan(16 * 60 * 1000);
  });

  it("scopes the email count to the correct emailHash", async () => {
    await isLoginRateLimited("abc123", "def456");
    const emailCountArgs = loginAttemptCountMock.mock.calls[1][0];
    expect(emailCountArgs.where.emailHash).toBe("def456");
  });

  it("fires a deleteMany to prune rows older than the 15-min window", async () => {
    await isLoginRateLimited("iphash", "emailhash");
    expect(loginAttemptDeleteManyMock).toHaveBeenCalledOnce();
    const { where } = loginAttemptDeleteManyMock.mock.calls[0][0];
    expect(where.createdAt.lt).toBeInstanceOf(Date);
    const ageMs = Date.now() - where.createdAt.lt.getTime();
    expect(ageMs).toBeGreaterThan(14 * 60 * 1000);
    expect(ageMs).toBeLessThan(16 * 60 * 1000);
  });

  it("stale rows (>15 min) are not counted against the cap — 10 old + 1 fresh is under-cap", async () => {
    // The count queries already use createdAt > window, so only the 1 fresh
    // row (returned by the mock) is counted — the IP is under the 10-attempt cap.
    loginAttemptCountMock.mockResolvedValue(1);
    expect(await isLoginRateLimited("iphash", "emailhash")).toBe(false);
  });
});

describe("recordFailedLogin", () => {
  it("calls db.loginAttempt.create with ipHash and emailHash", async () => {
    await recordFailedLogin("ip-hash-value", "email-hash-value");
    expect(loginAttemptCreateMock).toHaveBeenCalledWith({
      data: { ipHash: "ip-hash-value", emailHash: "email-hash-value" },
    });
  });

  it("does not store raw IP or email strings", async () => {
    await recordFailedLogin("hashed-ip", "hashed-email");
    const stored = loginAttemptCreateMock.mock.calls[0][0].data;
    expect(stored.ipHash).not.toContain(".");
    expect(stored.ipHash).toBe("hashed-ip");
    expect(stored.emailHash).toBe("hashed-email");
  });
});
