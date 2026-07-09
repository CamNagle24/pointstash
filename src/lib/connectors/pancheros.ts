import { PaytronixConnector } from "./paytronix";

/**
 * Pancheros Rewards via the Paytronix multi-tenant loyalty platform.
 * Endpoints:
 *   POST /api/paytronix/login   — email/pwd → session cookie
 *   GET  /api/paytronix/balance — points balance
 *
 * `implemented` stays false until the HTTP calls are wired in step 3+
 * of the graduation plan (see docs/DECISIONS.md 2026-06-29).
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
