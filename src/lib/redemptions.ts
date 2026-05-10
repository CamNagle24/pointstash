/**
 * Helpers for valuing redemptions across chains.
 *
 * `centsPerPoint` is our universal yardstick — every chain prices points
 * differently (a Starbucks star buys ~2.7¢, a McDonald's point ~0.1¢) so the
 * only fair comparison is "how much retail value does one point of this chain
 * get me." Everything in this file converts back to that metric.
 */

export type Redemption = {
  id: string;
  chainSlug: string;
  itemName: string;
  pointsCost: number;
  retailPriceCents: number;
};

export type ValuedRedemption = Redemption & { centsPerPoint: number };

export type AccountValuation = {
  chainSlug: string;
  points: number;
  /** Avg/best ¢-per-point we use to estimate the account's $ value. */
  centsPerPoint: number;
};

/**
 * Cents-per-point. Returns 0 for free-or-impossible redemptions
 * (`pointsCost <= 0`) instead of `Infinity`/`NaN`.
 */
export function centsPerPoint(retailPriceCents: number, pointsCost: number): number {
  if (!Number.isFinite(retailPriceCents) || !Number.isFinite(pointsCost)) return 0;
  if (pointsCost <= 0) return 0;
  return retailPriceCents / pointsCost;
}

/** Returns a new array sorted best-value first (highest ¢/pt). Stable. */
export function sortRedemptionsByValue<T extends Redemption>(items: T[]): ValuedRedemption[] {
  return items
    .map((r) => ({ ...r, centsPerPoint: centsPerPoint(r.retailPriceCents, r.pointsCost) }))
    .sort((a, b) => b.centsPerPoint - a.centsPerPoint);
}

/**
 * Sum total dollar value across linked accounts. Skips negative balances and
 * accounts whose chain is missing from the provided rate table.
 */
export function calculateTotalValue(accounts: AccountValuation[]): number {
  return accounts.reduce((sum, a) => {
    if (!Number.isFinite(a.points) || a.points <= 0) return sum;
    if (!Number.isFinite(a.centsPerPoint) || a.centsPerPoint <= 0) return sum;
    return sum + (a.points * a.centsPerPoint) / 100;
  }, 0);
}
