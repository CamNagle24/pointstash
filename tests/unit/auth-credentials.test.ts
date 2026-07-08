import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  userFindUniqueMock,
  isRateLimitedMock,
  recordFailedMock,
  hashEmailMock,
  getClientIpMock,
  hashClientIpMock,
  bcryptCompareMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  isRateLimitedMock: vi.fn(),
  recordFailedMock: vi.fn(),
  hashEmailMock: vi.fn(),
  getClientIpMock: vi.fn(),
  hashClientIpMock: vi.fn(),
  bcryptCompareMock: vi.fn(),
}));

// auth-credentials imports @/lib/api → @/lib/auth → next-auth/next/server;
// mock the whole module to break the import chain.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: userFindUniqueMock } },
}));
vi.mock("@/lib/api", () => ({
  getClientIp: getClientIpMock,
  hashClientIp: hashClientIpMock,
}));
vi.mock("@/lib/auth-login-rate-limit", () => ({
  hashEmail: hashEmailMock,
  isLoginRateLimited: isRateLimitedMock,
  recordFailedLogin: recordFailedMock,
}));
vi.mock("bcryptjs", () => ({
  default: { compare: bcryptCompareMock },
}));

import { authenticateCredentials } from "@/lib/auth-credentials";

const VALID_CREDENTIALS = { email: "user@example.com", password: "supersecret123" };
const MOCK_REQUEST = new Request("http://localhost/api/auth/callback/credentials", {
  method: "POST",
  headers: { "x-forwarded-for": "1.2.3.4" },
});
const STORED_USER = {
  id: "user_1",
  email: "user@example.com",
  name: "Test User",
  image: null,
  password: "$2b$10$hashedpassword",
};

beforeEach(() => {
  userFindUniqueMock.mockReset().mockResolvedValue(null);
  isRateLimitedMock.mockReset().mockResolvedValue(false);
  recordFailedMock.mockReset().mockResolvedValue(undefined);
  hashEmailMock.mockReset().mockReturnValue("email_hash");
  getClientIpMock.mockReset().mockReturnValue("1.2.3.4");
  hashClientIpMock.mockReset().mockReturnValue("ip_hash");
  bcryptCompareMock.mockReset().mockResolvedValue(false);
});

describe("authenticateCredentials", () => {
  it("returns null for an invalid credentials shape (missing password)", async () => {
    const result = await authenticateCredentials({ email: "user@example.com" }, MOCK_REQUEST);
    expect(result).toBeNull();
    expect(isRateLimitedMock).not.toHaveBeenCalled();
  });

  it("returns null for an invalid credentials shape (bad email format)", async () => {
    const result = await authenticateCredentials(
      { email: "not-an-email", password: "supersecret123" },
      MOCK_REQUEST,
    );
    expect(result).toBeNull();
    expect(isRateLimitedMock).not.toHaveBeenCalled();
  });

  it("returns null when rate-limited and does not query the database", async () => {
    isRateLimitedMock.mockResolvedValue(true);
    const result = await authenticateCredentials(VALID_CREDENTIALS, MOCK_REQUEST);
    expect(result).toBeNull();
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(recordFailedMock).not.toHaveBeenCalled();
  });

  it("returns null and records a failure for an unknown email", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    const result = await authenticateCredentials(VALID_CREDENTIALS, MOCK_REQUEST);
    expect(result).toBeNull();
    expect(recordFailedMock).toHaveBeenCalledWith("ip_hash", "email_hash");
  });

  it("returns null and records a failure when the user has no stored password (Google-only account)", async () => {
    userFindUniqueMock.mockResolvedValue({ ...STORED_USER, password: null });
    const result = await authenticateCredentials(VALID_CREDENTIALS, MOCK_REQUEST);
    expect(result).toBeNull();
    expect(recordFailedMock).toHaveBeenCalledWith("ip_hash", "email_hash");
  });

  it("returns null and records a failure for a wrong password", async () => {
    userFindUniqueMock.mockResolvedValue(STORED_USER);
    bcryptCompareMock.mockResolvedValue(false);
    const result = await authenticateCredentials(VALID_CREDENTIALS, MOCK_REQUEST);
    expect(result).toBeNull();
    expect(recordFailedMock).toHaveBeenCalledWith("ip_hash", "email_hash");
  });

  it("returns the user object for valid credentials", async () => {
    userFindUniqueMock.mockResolvedValue(STORED_USER);
    bcryptCompareMock.mockResolvedValue(true);
    const result = await authenticateCredentials(VALID_CREDENTIALS, MOCK_REQUEST);
    expect(result).toEqual({
      id: "user_1",
      email: "user@example.com",
      name: "Test User",
      image: null,
    });
  });

  it("does not record a failure on a successful login", async () => {
    userFindUniqueMock.mockResolvedValue(STORED_USER);
    bcryptCompareMock.mockResolvedValue(true);
    await authenticateCredentials(VALID_CREDENTIALS, MOCK_REQUEST);
    expect(recordFailedMock).not.toHaveBeenCalled();
  });

  it("passes the hashed IP and email to isLoginRateLimited", async () => {
    await authenticateCredentials(VALID_CREDENTIALS, MOCK_REQUEST);
    expect(hashClientIpMock).toHaveBeenCalledWith("1.2.3.4");
    expect(hashEmailMock).toHaveBeenCalledWith("user@example.com");
    expect(isRateLimitedMock).toHaveBeenCalledWith("ip_hash", "email_hash");
  });
});
