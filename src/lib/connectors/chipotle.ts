import { BaseConnector } from "./base";

/**
 * Chipotle Rewards is delivered via chipotle.com's loyalty API:
 *   - POST /api/auth/login              (email + password → Bearer JWT)
 *   - GET  /api/loyalty/me              (pointsBalance, tier, expiringPoints)
 *   - GET  /api/loyalty/transactions    (cursor pagination)
 *
 * Server-side scraping isn't implemented yet — sync runs through the
 * PointStash Sync browser extension piggybacking on the user's chipotle.com
 * session. This stub marks the slug as a future server-side target.
 */
export class ChipotleConnector extends BaseConnector {
  readonly chainSlug = "chipotle";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const chipotleConnector = new ChipotleConnector();
