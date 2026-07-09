import { BaseConnector, NotImplementedError } from "./base";
import type { AuthCredentials, AuthToken } from "./base";

export type PaytronixConfig = {
  /**
   * Root URL of the chain's Paytronix-hosted API, e.g.
   * `https://www.pancheros.com/api/paytronix`. Concrete subclasses supply
   * this so the base class can build `/login` and `/balance` URLs without
   * hard-coding a brand.
   */
  baseUrl: string;
  /**
   * Paytronix brand identifier used in API payloads to route requests to
   * the correct tenant (e.g. `"pancheros"`).
   */
  brandId: string;
};

/**
 * Base class for chains that run their loyalty programme through the Paytronix
 * multi-tenant platform. Concrete connectors (e.g. `PancherosConnector`)
 * extend this class, passing their brand-specific config via `super()`.
 *
 * Step 2 of the connector graduation plan (see docs/DECISIONS.md 2026-06-29).
 * The HTTP implementations live in step 3+; this step establishes the
 * shared URL-construction and config-validation contract.
 */
export abstract class PaytronixConnector extends BaseConnector {
  protected readonly config: PaytronixConfig;

  constructor(config: PaytronixConfig) {
    super();
    if (!config.baseUrl) throw new Error("PaytronixConnector requires a non-empty baseUrl");
    if (!config.brandId) throw new Error("PaytronixConnector requires a non-empty brandId");
    this.config = config;
  }

  /** Full URL for the Paytronix login endpoint. */
  get loginUrl(): string {
    return `${this.config.baseUrl}/login`;
  }

  /** Full URL for the Paytronix balance endpoint. */
  get balanceUrl(): string {
    return `${this.config.baseUrl}/balance`;
  }

  async authenticate(_credentials: AuthCredentials): Promise<AuthToken> {
    throw new NotImplementedError(this.chainSlug);
  }

  async getPointsBalance(_token: AuthToken): Promise<number> {
    throw new NotImplementedError(this.chainSlug);
  }
}
