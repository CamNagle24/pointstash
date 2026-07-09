import type { ChainAccount } from "@/types/account";
import type { RedemptionOption } from "@/types/redemption";
import type { Deal } from "@/types/deal";

/** Urgency window: the final N days before a deal expires. */
export const URGENCY_WINDOW_DAYS = 7;
/** Max multiplier at the moment of expiry (or past expiry). */
export const URGENCY_MAX_MULTIPLIER = 3;

/**
 * Returns a multiplier that ramps linearly from 1 (outside the urgency window)
 * to 3 (at or past expiry) over the final 7 days before a deal expires.
 * Returns 1 when expiresAt is null/undefined.
 */
export function urgencyMultiplier(expiresAt: Date | null | undefined): number {
  if (expiresAt == null) return 1;
  const msRemaining = expiresAt.getTime() - Date.now();
  const msWindow = URGENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (msRemaining >= msWindow) return 1;
  if (msRemaining <= 0) return URGENCY_MAX_MULTIPLIER;
  const fraction = 1 - msRemaining / msWindow;
  return 1 + fraction * (URGENCY_MAX_MULTIPLIER - 1);
}

/**
 * Urgency-weighted score for ranking. A deal expiring soon scores higher than
 * a deal with the same CPP but further-off expiry.
 */
export function urgencyScore(
  centsPerPoint: number,
  expiresAt: Date | null | undefined,
): number {
  return centsPerPoint * urgencyMultiplier(expiresAt);
}

/**
 * For a given chain, return the redemption with the highest cents-per-point.
 * That's the user's "best deal" — what we surface on each account card.
 */
export function bestRedemptionFor(
  chainId: string,
  redemptions: RedemptionOption[],
): RedemptionOption | null {
  let best: RedemptionOption | null = null;
  for (const r of redemptions) {
    if (r.chainId !== chainId) continue;
    if (!best || r.centsPerPoint > best.centsPerPoint) best = r;
  }
  return best;
}

export function bestRedemptionLabel(
  redemption: RedemptionOption | null,
): string {
  if (!redemption) return "Linking redemptions…";
  return `${redemption.itemName} · ${redemption.pointsCost.toLocaleString()} pts`;
}

/**
 * Estimated cash value (in cents) of redeeming a points-cost deal, valued at
 * the chain's best cents-per-point redemption rate. Null when the deal has no
 * points cost or the chain has no known redemptions to price it against.
 */
export function estimatedDealValueCents(
  chainId: string,
  pointsCost: number | null | undefined,
  redemptions: RedemptionOption[],
): number | null {
  if (pointsCost == null) return null;
  const best = bestRedemptionFor(chainId, redemptions);
  if (!best) return null;
  return pointsCost * best.centsPerPoint;
}

/**
 * Sum total dollar value across linked accounts using each account's best
 * redemption rate (cents-per-point). Falls back to 0 for chains with no
 * redemptions yet.
 */
export function totalEstimatedDollars(
  accounts: ChainAccount[],
  redemptions: RedemptionOption[],
): number {
  return accounts.reduce((sum, a) => {
    const best = bestRedemptionFor(a.chainId, redemptions);
    if (!best) return sum;
    return sum + (a.currentPoints * best.centsPerPoint) / 100;
  }, 0);
}

/**
 * Fraction of a deal's points cost a balance may fall short by and still count
 * as "almost affordable". 0.15 = the user has at least 85% of what's needed.
 */
export const ALMOST_AFFORDABLE_THRESHOLD = 0.15;

/**
 * True when the user can't yet afford a points deal but is within
 * `threshold` of it — close enough to nudge them toward earning the rest.
 * Requires a known balance and a positive cost; an already-affordable deal
 * returns false (it's not "almost").
 */
export function isAlmostAffordable(
  pointsCost: number | null | undefined,
  pointsBalance: number | null | undefined,
  threshold = ALMOST_AFFORDABLE_THRESHOLD,
): boolean {
  if (pointsCost == null || pointsCost <= 0 || pointsBalance == null) return false;
  if (pointsBalance >= pointsCost) return false;
  return pointsBalance >= pointsCost * (1 - threshold);
}

/**
 * Count deals the user can redeem right now: those with a points cost on a
 * chain they track, where the tracked balance covers the cost. Mirrors the
 * affordability check the deals feed applies per card.
 */
export function affordableDealCount(deals: Deal[], accounts: ChainAccount[]): number {
  const balanceBySlug: Record<string, number> = {};
  for (const a of accounts) balanceBySlug[a.chain.slug] = a.currentPoints;
  return deals.reduce((n, d) => {
    if (d.pointsCost == null) return n;
    const balance = balanceBySlug[d.chain?.slug ?? ""];
    if (balance == null || balance < d.pointsCost) return n;
    return n + 1;
  }, 0);
}
