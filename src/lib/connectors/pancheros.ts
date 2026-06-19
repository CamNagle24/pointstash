import { BaseConnector } from "./base";

/**
 * Pancheros Rewards is run through a third-party loyalty vendor (Paytronix)
 * rather than a first-party API:
 *   - https://www.pancheros.com/api/paytronix/login   (email/pwd → session cookie)
 *   - https://www.pancheros.com/api/paytronix/balance (points balance)
 *
 * Paytronix-hosted programs are common among smaller chains — once this
 * connector is real, the same shape should cover other Paytronix brands.
 */
export class PancherosConnector extends BaseConnector {
  readonly chainSlug = "pancheros";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const pancherosConnector = new PancherosConnector();
