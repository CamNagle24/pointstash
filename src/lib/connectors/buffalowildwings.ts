import { BaseConnector } from "./base";

/**
 * Buffalo Wild Wings' Blazin' Rewards runs on Inspire Brands' shared loyalty
 * backend — the same one behind dunkin.ts (Dunkin', Arby's, Sonic):
 *   - https://api.buffalowildwings.com/cmaapi/v1/login
 *   - https://api.buffalowildwings.com/loyalty/v1/balance      (pointBalance)
 *   - https://api.buffalowildwings.com/loyalty/v1/transactions
 *
 * Same Akamai bot-manager hurdle as Dunkin'. Once that's solved for one
 * Inspire brand, the others are a host swap.
 */
export class BuffaloWildWingsConnector extends BaseConnector {
  readonly chainSlug = "buffalowildwings";
  readonly authLabel = "Blazin' Rewards email + password";
  readonly implemented = false;
}

export const buffalowildwingsConnector = new BuffaloWildWingsConnector();
