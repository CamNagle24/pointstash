import { BaseConnector } from "./base";

/**
 * Freaky Fast Rewards is delivered via jimmyjohns.com's loyalty API:
 *   - POST /api/auth/login              (email + password → Bearer JWT)
 *   - GET  /api/loyalty/me              (pointsBalance, tier)
 *   - GET  /api/loyalty/transactions    (cursor pagination)
 *
 * Privately held (Inspire Brands minority stake, not yet on the shared
 * Inspire loyalty backend used by Dunkin'/Arby's/Sonic/BWW) — auth flow is
 * unverified.
 */
export class JimmyJohnsConnector extends BaseConnector {
  readonly chainSlug = "jimmyjohns";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const jimmyjohnsConnector = new JimmyJohnsConnector();
