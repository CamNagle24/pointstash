import { BaseConnector } from "./base";

export type PaytronixConfig = {
  baseUrl: string;
  brandId: string;
};

/**
 * Base class for Paytronix-hosted loyalty programs. Parametrize with the
 * brand-specific endpoint base URL and vendor brand ID; the subclass sets
 * implemented=true once the network integration is wired up (step 7 of
 * the graduation plan in docs/DECISIONS.md).
 */
export abstract class PaytronixConnector extends BaseConnector {
  readonly config: PaytronixConfig;

  constructor(config: PaytronixConfig) {
    super();
    if (!config.baseUrl) throw new Error("PaytronixConnector: config.baseUrl is required");
    if (!config.brandId) throw new Error("PaytronixConnector: config.brandId is required");
    this.config = config;
  }
}
