import { BaseConnector } from "./base";

/**
 * Wendy's Rewards is implemented on Punchh (now Par Tech) — a multi-tenant
 * loyalty backend used by hundreds of restaurants. Useful endpoints:
 *   - https://wendys.app.link / wendys.com/auth/login (returns Punchh JWT)
 *   - https://wendys.com/api/users/me (loyalty.points)
 *   - https://wendys.com/api/users/me/transactions
 *
 * Punchh accepts the standard `Authorization: Bearer <jwt>` header. The
 * trickiest piece is the bot challenge ("PerimeterX") in front of /api/users
 * — we'll likely need a residential proxy or Playwright login.
 */
export class WendysConnector extends BaseConnector {
  readonly chainSlug = "wendys";
  readonly authLabel = "Email + password (Punchh)";
  readonly implemented = false;
}

export const wendysConnector = new WendysConnector();
