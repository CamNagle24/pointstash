import type { ChainAccount } from "@/types/account";
import type { RedemptionOption } from "@/types/redemption";

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
