import type { ChainAccount } from "@/types/account";
import type { RedemptionOption } from "@/types/redemption";
import type { Deal } from "@/types/deal";

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
