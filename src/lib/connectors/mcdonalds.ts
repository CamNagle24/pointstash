import { BaseConnector } from "./base";

/**
 * McDonald's GMA (Global Mobile App) talks to:
 *   - https://us-prod.api.mcd.com/exp/v1/customer/login        (auth, returns access_token + refresh_token, both JWT)
 *   - https://us-prod.api.mcd.com/exp/v1/loyalty/customer      (totalPoints field)
 *   - https://us-prod.api.mcd.com/exp/v1/loyalty/transactions  (paginated)
 *
 * Required headers: `mcd-clientid` (rotates per app version), `accept-language`,
 * `mcd-marketid=US`, `mcd-clientsecret` HMAC over the request. The HMAC is the
 * blocker — pulling it requires extracting the RN bundle and emulating the
 * native HMAC routine, which we should only do once and store in env.
 */
export class McDonaldsConnector extends BaseConnector {
  readonly chainSlug = "mcdonalds";
  readonly authLabel = "Email + password";
  readonly implemented = false;
}

export const mcdonaldsConnector = new McDonaldsConnector();
