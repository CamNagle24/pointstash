import { BaseConnector } from "./base";

/**
 * Dunkin' Rewards runs on Inspire Brands' shared loyalty backend
 * (Arby's, Sonic, Buffalo Wild Wings share the same):
 *   - https://api.dunkindonuts.com/cmaapi/v1/login
 *   - https://api.dunkindonuts.com/loyalty/v1/balance      (pointBalance)
 *   - https://api.dunkindonuts.com/loyalty/v1/transactions
 *
 * Custom session cookie (DDPHPSESSID) plus Bearer JWT. Akamai bot manager is
 * the main hurdle — the same hurdle BK/Popeyes have. Likely solution: route
 * through a residential proxy and cache the puzzle solution.
 */
export class DunkinConnector extends BaseConnector {
  readonly chainSlug = "dunkin";
  readonly authLabel = "DD Perks email + password";
  readonly implemented = false;
}

export const dunkinConnector = new DunkinConnector();
