import { BaseConnector } from "./base";

/**
 * Burger King and Popeyes share the Restaurant Brands International (RBI)
 * GraphQL gateway at https://use1-prod-bk.rbictg.com/graphql:
 *   - mutation login(email, password)         → idToken (JWT)
 *   - query LoyaltyUser { points, tier }       → crowns balance for BK
 *   - query LoyaltyTransactions(first, after)  → cursor-paginated
 *
 * Bearer token + the operation hash in `x-ui-language` and `x-session-id`.
 * No HMAC, but Cloudflare bot management blocks data-center IPs aggressively.
 */
export class BurgerKingConnector extends BaseConnector {
  readonly chainSlug = "burgerking";
  readonly authLabel = "Royal Perks email + password";
  readonly implemented = false;
}

export const burgerkingConnector = new BurgerKingConnector();
