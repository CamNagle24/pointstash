import { BaseConnector } from "./base";

/**
 * DQ Rewards is operated by American Dairy Queen's mobile API:
 *   - https://api.dairyqueen.com/auth/login          (email + password → Bearer)
 *   - https://api.dairyqueen.com/loyalty/v1/balance  (pointBalance, tier)
 *   - https://api.dairyqueen.com/loyalty/v1/history  (paginated)
 *
 * Owned by Berkshire Hathaway/IDQ, not part of the RBI/Inspire/Yum! shared
 * platforms — auth flow hasn't been reverse-engineered yet.
 */
export class DairyQueenConnector extends BaseConnector {
  readonly chainSlug = "dairyqueen";
  readonly authLabel = "DQ Rewards email + password";
  readonly implemented = false;
}

export const dairyqueenConnector = new DairyQueenConnector();
