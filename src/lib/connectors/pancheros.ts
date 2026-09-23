import { PaytronixConnector } from "./paytronix";

/**
 * Pancheros Rewards is hosted on the Paytronix loyalty platform:
 *   - https://www.pancheros.com/api/paytronix/login   (email/pwd → session cookie)
 *   - https://www.pancheros.com/api/paytronix/balance (points balance)
 */
export class PancherosConnector extends PaytronixConnector {
  readonly chainSlug = "pancheros";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const pancherosConnector = new PancherosConnector({
  baseUrl: "https://www.pancheros.com/api/paytronix",
  brandId: "pancheros",
});
