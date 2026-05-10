import { BaseConnector } from "./base";

/**
 * Taco Bell Rewards lives on Yum! Brands' shared loyalty platform. Endpoints
 * observed in mobile traffic:
 *   - https://api.tacobell.com/auth/login           (email/pwd → cognito JWT)
 *   - https://api.tacobell.com/loyalty/v2/balance   (points, tier, expiringSoon)
 *   - https://api.tacobell.com/loyalty/v2/history
 *
 * Backed by AWS Cognito user pools. Connector should refresh via the standard
 * Cognito InitiateAuth REFRESH_TOKEN_AUTH flow rather than re-authing.
 */
export class TacoBellConnector extends BaseConnector {
  readonly chainSlug = "tacobell";
  readonly authLabel = "Email + password (Cognito)";
  readonly implemented = false;
}

export const tacobellConnector = new TacoBellConnector();
