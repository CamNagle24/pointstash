import crypto from "node:crypto";

// Stateless, signed unsubscribe tokens. Unlike password-reset tokens (which are
// short-lived, single-use, and stored hashed in the DB), an unsubscribe link
// should keep working forever and needs no server-side state — so we HMAC the
// user id with the app secret instead of persisting a row. The token is opaque
// and tamper-proof: changing the embedded user id invalidates the signature.

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Build an unsubscribe token for `userId`, signed with `secret`. */
export function signUnsubscribeToken(userId: string, secret: string): string {
  const payload = Buffer.from(userId, "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verify an unsubscribe token and return the embedded user id, or null if the
 * token is malformed or its signature doesn't match `secret`. Uses a
 * constant-time comparison so a mismatched signature leaks no timing info.
 */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, secret);

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  const userId = Buffer.from(payload, "base64url").toString("utf8");
  return userId.length > 0 ? userId : null;
}

/** The app secret used to sign unsubscribe tokens (shared with NextAuth). */
export function unsubscribeSecret(): string | null {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? null;
}
