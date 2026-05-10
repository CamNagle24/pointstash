import { BaseConnector } from "./base";

/**
 * Popeyes runs on the same RBI GraphQL platform as Burger King — the host
 * is `use1-prod-plk.rbictg.com/graphql`, the schema and auth flow are
 * effectively identical. Real implementation: extract the BurgerKing one,
 * parameterize the host, and reuse here.
 */
export class PopeyesConnector extends BaseConnector {
  readonly chainSlug = "popeyes";
  readonly authLabel = "Popeyes Rewards email + password";
  readonly implemented = false;
}

export const popeyesConnector = new PopeyesConnector();
