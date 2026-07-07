import crypto from "node:crypto";
import { db } from "@/lib/db";

const MAX_FAILED_LOGINS_PER_IP = 10;
const MAX_FAILED_LOGINS_PER_EMAIL = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window

export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
}

/** Returns true when the IP or email has hit the failed-login cap. */
export async function isLoginRateLimited(ipHash: string, emailHash: string): Promise<boolean> {
  const window = new Date(Date.now() - WINDOW_MS);

  // Prune rows older than the window before counting — fire-and-forget so it
  // never delays the hot path. The count queries below already filter by
  // createdAt > window, so pruning is purely table maintenance.
  void db.loginAttempt.deleteMany({ where: { createdAt: { lt: window } } });

  const [byIp, byEmail] = await Promise.all([
    db.loginAttempt.count({ where: { ipHash, createdAt: { gt: window } } }),
    db.loginAttempt.count({ where: { emailHash, createdAt: { gt: window } } }),
  ]);
  return byIp >= MAX_FAILED_LOGINS_PER_IP || byEmail >= MAX_FAILED_LOGINS_PER_EMAIL;
}

/** Records a failed login attempt. Fire-and-forget: caller should not await. */
export async function recordFailedLogin(ipHash: string, emailHash: string): Promise<void> {
  await db.loginAttempt.create({ data: { ipHash, emailHash } });
}
