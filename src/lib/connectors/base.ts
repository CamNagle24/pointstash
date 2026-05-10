/**
 * Connector contract for chains that expose (or that we've reverse-engineered)
 * a programmatic way to fetch a user's points balance.
 *
 * Today every chain falls back to MANUAL or SCREENSHOT entry. As soon as a
 * connector is implemented, AddAccountModal can offer "Auto-sync" as a third
 * sync method and a background job can refresh balances on a schedule.
 */

export type AuthCredentials = {
  // Username/email + password is the most common shape for the loyalty mobile
  // apps that don't expose OAuth. OAuth-style chains (e.g. Starbucks via
  // sso.starbucks.com) override this with a code-flow handler.
  email?: string;
  password?: string;
  // Some chains use phone + SMS OTP; we stash the verified token here.
  phone?: string;
  otp?: string;
  // Catch-all for chain-specific extras (loyalty card number, device ID, etc.).
  extras?: Record<string, string>;
};

export type AuthToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  // Most apps tie the session to a generated device ID — keep it so we can
  // present the same identity on refresh.
  deviceId?: string;
  // Free-form payload for chain-specific session state (cookies, JWE, etc.).
  metadata?: Record<string, unknown>;
};

export type Transaction = {
  occurredAt: Date;
  description: string;
  // Positive for points earned, negative for points redeemed.
  pointsDelta: number;
  // Cents spent at the chain in this transaction, when available.
  amountCents?: number;
};

export class NotImplementedError extends Error {
  constructor(chainSlug: string) {
    super(`${chainSlug}: API connector not implemented — use manual entry or screenshot OCR.`);
    this.name = "NotImplementedError";
  }
}

/**
 * BaseConnector is the contract every chain integration fulfils. Implementers
 * should override the four methods. Until then the base implementation throws
 * `NotImplementedError`, which the caller (e.g. AddAccountModal "Auto-sync")
 * uses to fall back to MANUAL/SCREENSHOT.
 */
export abstract class BaseConnector {
  abstract readonly chainSlug: string;
  /** Human-readable label for the auth method, e.g. "Email + password". */
  abstract readonly authLabel: string;
  /** Whether the connector is ready to serve real traffic. */
  readonly implemented: boolean = false;

  async authenticate(_credentials: AuthCredentials): Promise<AuthToken> {
    throw new NotImplementedError(this.chainSlug);
  }

  async getPointsBalance(_token: AuthToken): Promise<number> {
    throw new NotImplementedError(this.chainSlug);
  }

  async getRecentTransactions(_token: AuthToken): Promise<Transaction[]> {
    throw new NotImplementedError(this.chainSlug);
  }

  async refreshToken(_token: AuthToken): Promise<AuthToken> {
    throw new NotImplementedError(this.chainSlug);
  }
}
