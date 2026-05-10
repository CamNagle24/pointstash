import { BaseConnector } from "./base";

/**
 * Chick-fil-A One uses Auth0 for authentication and a private REST API at
 *   - https://www.chick-fil-a.com/api/customers/me/balance
 * fronted by their CDN. Mobile app traffic adds a `cfa-app-version` header
 * and signs requests with a per-build secret. The web account page exposes
 * the same balance through their internal /api endpoint when the customer
 * is signed in, so a Playwright-style flow is feasible if the API headers
 * prove too painful.
 */
export class ChickFilAConnector extends BaseConnector {
  readonly chainSlug = "chickfila";
  readonly authLabel = "Email + password (Auth0)";
  readonly implemented = false;
}

export const chickfilaConnector = new ChickFilAConnector();
