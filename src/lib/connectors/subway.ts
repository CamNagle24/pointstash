import { BaseConnector } from "./base";

/**
 * Subway MVP Rewards uses subway.com's `/restapi/v3/loyalty/*` endpoints:
 *   - POST /restapi/v3/auth/login           (email + password → Bearer)
 *   - GET  /restapi/v3/loyalty/me           (tokenBalance, tier)
 *   - GET  /restapi/v3/loyalty/transactions (page/size cursor)
 *
 * Auth challenge is light (no bot wall observed) but tokens expire after
 * 30 minutes — refreshToken endpoint exists at /restapi/v3/auth/refresh.
 */
export class SubwayConnector extends BaseConnector {
  readonly chainSlug = "subway";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const subwayConnector = new SubwayConnector();
