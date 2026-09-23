import { BaseConnector } from "./base";

export type PaytronixConfig = {
  /** Base URL for this brand's Paytronix-hosted endpoints. */
  baseUrl: string;
  /** Paytronix brand identifier used in API paths. */
  brandId: string;
};

/**
 * Shared base for chains whose loyalty program runs on the Paytronix platform.
 * Concrete subclasses supply `chainSlug` and `authLabel`, and override methods
 * once real endpoints are reverse-engineered.
 */
export abstract class PaytronixConnector extends BaseConnector {
  protected readonly config: PaytronixConfig;

  constructor(config: PaytronixConfig) {
    super();
    this.config = config;
  }
}
