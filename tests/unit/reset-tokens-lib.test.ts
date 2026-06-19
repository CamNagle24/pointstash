import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture what Resend.emails.send receives without hitting the network.
const sendMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

import {
  hashResetToken,
  mintResetToken,
  resetTokenExpiry,
  sendResetEmail,
  RESET_TOKEN_TTL_MS,
} from "@/lib/reset-tokens";

describe("RESET_TOKEN_TTL_MS", () => {
  it("is 3,600,000 ms (1 hour)", () => {
    expect(RESET_TOKEN_TTL_MS).toBe(3_600_000);
  });
});

describe("hashResetToken", () => {
  it("returns a 64-character lowercase hex string", () => {
    const hash = hashResetToken("some-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — the same input always produces the same hash", () => {
    expect(hashResetToken("abc")).toBe(hashResetToken("abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashResetToken("abc")).not.toBe(hashResetToken("abd"));
  });
});

describe("mintResetToken", () => {
  it("returns a URL-safe base64 string with no +, /, or =", () => {
    const token = mintResetToken();
    expect(token).not.toMatch(/[+/=]/);
    expect(token.length).toBeGreaterThan(10);
  });

  it("generates a new unique token on each call", () => {
    expect(mintResetToken()).not.toBe(mintResetToken());
  });
});

describe("resetTokenExpiry", () => {
  it("returns a Date approximately 1 hour in the future (within ±5s)", () => {
    const before = Date.now();
    const expiry = resetTokenExpiry();
    const after = Date.now();
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + RESET_TOKEN_TTL_MS - 5000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + RESET_TOKEN_TTL_MS + 5000);
  });
});

describe("sendResetEmail", () => {
  beforeEach(() => {
    sendMock.mockClear().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.unstubAllEnvs();
  });

  it("logs the reset link and returns without throwing when RESEND_API_KEY is unset (dev)", async () => {
    delete process.env.RESEND_API_KEY;
    vi.stubEnv("NODE_ENV", "development");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      sendResetEmail({ to: "user@example.com", token: "raw-token" }),
    ).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("reset link"),
      expect.stringContaining("token=raw-token"),
    );
    logSpy.mockRestore();
  });

  it("throws when RESEND_API_KEY is unset in production", async () => {
    delete process.env.RESEND_API_KEY;
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      sendResetEmail({ to: "user@example.com", token: "raw-token" }),
    ).rejects.toThrow("RESEND_API_KEY is not configured");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("throws with Resend's error message when the send fails", async () => {
    process.env.RESEND_API_KEY = "test-key";
    sendMock.mockResolvedValueOnce({ error: { message: "Rate limited" } });

    await expect(
      sendResetEmail({ to: "user@example.com", token: "raw-token" }),
    ).rejects.toThrow("Rate limited");
  });

  it("calls Resend with the right to/from/subject and a link-bearing html/text body", async () => {
    process.env.RESEND_API_KEY = "test-key";

    await sendResetEmail({ to: "user@example.com", token: "raw-token", name: "Alice" });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [call] = sendMock.mock.calls[0];
    expect(call.to).toBe("user@example.com");
    expect(call.from).toMatch(/PointStash/);
    expect(call.subject).toBe("Reset your PointStash password");
    expect(call.html).toContain("token=raw-token");
    expect(call.text).toContain("token=raw-token");
  });
});
