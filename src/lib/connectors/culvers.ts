import { BaseConnector } from "./base";

/**
 * Culver's Rewards is delivered via culvers.com's loyalty API:
 *   - POST /api/account/login            (email + password → Bearer JWT)
 *   - GET  /api/loyalty/balance          (pointsBalance, tier)
 *   - GET  /api/loyalty/transactions     (cursor pagination)
 *
 * Privately held, no shared-platform vendor identified yet — auth flow is
 * unverified.
 */
export class CulversConnector extends BaseConnector {
  readonly chainSlug = "culvers";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const culversConnector = new CulversConnector();
