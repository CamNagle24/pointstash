import { describe, it, expect } from "vitest";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

const SECRET = "test-secret-do-not-use-in-prod";

describe("unsubscribe tokens", () => {
  it("round-trips a user id through sign → verify", () => {
    const token = signUnsubscribeToken("user_abc123", SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toBe("user_abc123");
  });

  it("produces distinct tokens for distinct users", () => {
    expect(signUnsubscribeToken("alice", SECRET)).not.toBe(signUnsubscribeToken("bob", SECRET));
  });

  it("rejects a token signed with a different secret", () => {
    const token = signUnsubscribeToken("user_abc123", SECRET);
    expect(verifyUnsubscribeToken(token, "other-secret")).toBeNull();
  });

  it("rejects a token whose payload was tampered with", () => {
    const token = signUnsubscribeToken("alice", SECRET);
    const sig = token.slice(token.indexOf(".") + 1);
    // Re-point the signature at a different user id, keeping the stolen sig.
    const forged = `${Buffer.from("bob", "utf8").toString("base64url")}.${sig}`;
    expect(verifyUnsubscribeToken(forged, SECRET)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken("", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("no-dot", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(".onlysig", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("onlypayload.", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("a.b.c", SECRET)).toBeNull();
  });

  it("handles user ids containing url-unsafe characters", () => {
    const id = "weird/id+with=chars";
    const token = signUnsubscribeToken(id, SECRET);
    // The token itself must be url-safe (base64url, single dot separator).
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(verifyUnsubscribeToken(token, SECRET)).toBe(id);
  });
});
