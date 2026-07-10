import { encode } from "@auth/core/jwt";

const AUTH_SECRET = "playwright-e2e-test-secret-do-not-use-in-prod";

// NextAuth v5 uses the cookie name as the `salt` when encoding/decoding JWTs.
// In non-HTTPS (dev) mode the cookie is "authjs.session-token" (no __Secure- prefix).
const SESSION_COOKIE_NAME = "authjs.session-token";

/**
 * Creates a valid NextAuth JWT session cookie for the fixture demo user.
 * Use `page.context().addCookies([await getSessionCookie()])` in a Playwright
 * test to simulate an authenticated session without going through the login UI.
 * This lets the middleware's JWT check pass so /dashboard isn't redirected.
 */
export async function getSessionCookie(): Promise<{
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  sameSite: "Lax";
}> {
  const value = await encode({
    salt: SESSION_COOKIE_NAME,
    secret: AUTH_SECRET,
    token: {
      sub: "user_demo",
      email: "you@stash.it",
      name: "You",
      picture: null,
      id: "user_demo",
    },
  });
  return {
    name: SESSION_COOKIE_NAME,
    value,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  };
}
