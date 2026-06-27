import { bestRedemptionFor } from "@/lib/dashboard";
import type { RedemptionOption } from "@/types/redemption";

export interface AffordableAccount {
  id: string;
  userId: string;
  chainId: string;
  chainSlug: string;
  chainName: string;
  currentPoints: number;
}

export interface AffordableCandidate {
  account: AffordableAccount;
  redemptionOption: RedemptionOption;
}

/** Stable idempotency key for a given (accountId, redemptionOptionId) pair. */
export function affordableAlertKey(accountId: string, redemptionOptionId: string): string {
  return `${accountId}:${redemptionOptionId}`;
}

/**
 * Accounts that can now afford their chain's best redemption
 * (`bestRedemptionFor`) and haven't already been alerted for that exact
 * (account, redemptionOption) pair. Per the no-re-arming design (see
 * docs/DECISIONS.md), each account yields at most one candidate — the
 * chain's single best option — and a pair already in `alreadyAlerted` is
 * never surfaced again even if it remains affordable.
 */
export function findNewlyAffordableAccounts(
  accounts: AffordableAccount[],
  redemptionOptions: RedemptionOption[],
  alreadyAlerted: Set<string>,
): AffordableCandidate[] {
  const out: AffordableCandidate[] = [];
  for (const account of accounts) {
    const best = bestRedemptionFor(account.chainId, redemptionOptions);
    if (!best) continue;
    if (account.currentPoints < best.pointsCost) continue;
    if (alreadyAlerted.has(affordableAlertKey(account.id, best.id))) continue;
    out.push({ account, redemptionOption: best });
  }
  return out;
}
