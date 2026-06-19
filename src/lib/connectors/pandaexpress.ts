import { BaseConnector } from "./base";

/**
 * Panda Rewards is delivered via pandaexpress.com's loyalty API:
 *   - POST /api/auth/login              (email + password → Bearer JWT)
 *   - GET  /api/loyalty/me              (pointsBalance, tier, expiringPoints)
 *   - GET  /api/loyalty/transactions    (cursor pagination)
 *
 * Shape mirrors chipotle.ts closely (same loyalty platform vendor). No bot
 * wall observed yet, but unverified at scale.
 */
export class PandaExpressConnector extends BaseConnector {
  readonly chainSlug = "pandaexpress";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const pandaexpressConnector = new PandaExpressConnector();
