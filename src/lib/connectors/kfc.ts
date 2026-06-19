import { BaseConnector } from "./base";

/**
 * KFC Rewards runs on the same Yum! Brands loyalty platform as Taco Bell —
 *   - https://api.kfc.com/auth/login           (email/pwd → cognito JWT)
 *   - https://api.kfc.com/loyalty/v2/balance   (points, tier, expiringSoon)
 *   - https://api.kfc.com/loyalty/v2/history
 *
 * Same AWS Cognito user pool family as tacobell.ts — once one Yum! connector
 * is real, parameterizing the host should cover the rest of the brand family.
 */
export class KfcConnector extends BaseConnector {
  readonly chainSlug = "kfc";
  readonly authLabel = "Email + password (Cognito)";
  readonly implemented = false;
}

export const kfcConnector = new KfcConnector();
