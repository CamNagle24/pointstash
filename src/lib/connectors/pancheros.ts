import { PaytronixConnector } from "./paytronix";

/**
 * Pancheros Rewards is hosted on Paytronix:
 *   - https://www.pancheros.com/api/paytronix/login   (email/pwd → session cookie)
 *   - https://www.pancheros.com/api/paytronix/balance (points balance)
 */
export class PancherosConnector extends PaytronixConnector {
  readonly chainSlug = "pancheros";
  readonly authLabel = "Email + password";
  readonly implemented = false;

  constructor() {
    super({
      baseUrl: "https://www.pancheros.com/api/paytronix",
      brandId: "pancheros",
    });
  }
}

export const pancherosConnector = new PancherosConnector();
