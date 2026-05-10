import { BaseConnector } from "./base";

/**
 * Starbucks uses a public OIDC flow at:
 *   - https://account.starbucks.com/oauth/authorize
 *   - https://account.starbucks.com/oauth/token       (PKCE code_verifier + code_challenge)
 *   - https://api.starbucks.com/loyalty/v1/me/account (returns starBalance, tier, expirationDate)
 *
 * This is the friendliest of the chains: any browser with a logged-in
 * starbucks.com session can hit /loyalty/v1/me/account and get JSON. A real
 * implementation should run a hosted OAuth callback at /api/connect/starbucks,
 * then persist refresh_token in Account.credentials (Json column).
 */
export class StarbucksConnector extends BaseConnector {
  readonly chainSlug = "starbucks";
  readonly authLabel = "Sign in with Starbucks (OAuth)";
  readonly implemented = false;
}

export const starbucksConnector = new StarbucksConnector();
