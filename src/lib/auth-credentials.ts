import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp, hashClientIp } from "@/lib/api";
import { hashEmail, isLoginRateLimited, recordFailedLogin } from "@/lib/auth-login-rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

/**
 * Validates credentials, enforces the login rate-limit, checks the DB password,
 * and records failed attempts. Returns a user object on success, null otherwise.
 * Extracted from NextAuth's `authorize()` so it can be unit-tested directly.
 */
export async function authenticateCredentials(
  credentials: unknown,
  request: Request,
): Promise<AuthUser | null> {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const ipHash = hashClientIp(getClientIp(request));
  const emailHash = hashEmail(parsed.data.email);

  if (await isLoginRateLimited(ipHash, emailHash)) return null;

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.password) {
    void recordFailedLogin(ipHash, emailHash);
    return null;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.password);
  if (!valid) {
    void recordFailedLogin(ipHash, emailHash);
    return null;
  }

  return { id: user.id, email: user.email, name: user.name, image: user.image };
}
