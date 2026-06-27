import { describe, it, expect } from "vitest";
import {
  affordableAlertKey,
  findNewlyAffordableAccounts,
  type AffordableAccount,
} from "@/lib/affordable-alerts";
import type { RedemptionOption } from "@/types/redemption";

function account(over: Partial<AffordableAccount> & { id: string }): AffordableAccount {
  return {
    userId: "user_1",
    chainId: "wendys",
    chainSlug: "wendys",
    chainName: "Wendy's",
    currentPoints: 0,
    ...over,
  };
}

function redemption(over: Partial<RedemptionOption> & { id: string }): RedemptionOption {
  return {
    chainId: "wendys",
    itemName: "Frosty",
    pointsCost: 500,
    retailPriceCents: 299,
    centsPerPoint: 0.598,
    category: "DESSERT",
    ...over,
  };
}

describe("affordableAlertKey", () => {
  it("is a stable accountId:redemptionOptionId key", () => {
    expect(affordableAlertKey("acc1", "opt1")).toBe("acc1:opt1");
  });
});

describe("findNewlyAffordableAccounts", () => {
  it("excludes an account that can't yet afford the chain's best redemption", () => {
    const result = findNewlyAffordableAccounts(
      [account({ id: "a1", currentPoints: 100 })],
      [redemption({ id: "r1", pointsCost: 500 })],
      new Set(),
    );
    expect(result).toEqual([]);
  });

  it("includes an account that has newly crossed into affording the best redemption", () => {
    const result = findNewlyAffordableAccounts(
      [account({ id: "a1", currentPoints: 500 })],
      [redemption({ id: "r1", pointsCost: 500 })],
      new Set(),
    );
    expect(result).toHaveLength(1);
    expect(result[0].account.id).toBe("a1");
    expect(result[0].redemptionOption.id).toBe("r1");
  });

  it("does not repeat an already-alerted (account, redemptionOption) pair", () => {
    const result = findNewlyAffordableAccounts(
      [account({ id: "a1", currentPoints: 500 })],
      [redemption({ id: "r1", pointsCost: 500 })],
      new Set([affordableAlertKey("a1", "r1")]),
    );
    expect(result).toEqual([]);
  });

  it("re-evaluates once the balance exactly equals the points cost", () => {
    const result = findNewlyAffordableAccounts(
      [account({ id: "a1", currentPoints: 499 })],
      [redemption({ id: "r1", pointsCost: 500 })],
      new Set(),
    );
    expect(result).toEqual([]);
  });

  it("skips an account whose chain has no redemption options at all", () => {
    const result = findNewlyAffordableAccounts(
      [account({ id: "a1", chainId: "kfc", currentPoints: 10_000 })],
      [redemption({ id: "r1", chainId: "wendys", pointsCost: 500 })],
      new Set(),
    );
    expect(result).toEqual([]);
  });

  it("picks the chain's highest-centsPerPoint option, not just any affordable one", () => {
    const result = findNewlyAffordableAccounts(
      [account({ id: "a1", currentPoints: 1000 })],
      [
        redemption({ id: "low", pointsCost: 200, centsPerPoint: 0.3 }),
        redemption({ id: "high", pointsCost: 800, centsPerPoint: 0.6 }),
      ],
      new Set(),
    );
    expect(result).toHaveLength(1);
    expect(result[0].redemptionOption.id).toBe("high");
  });

  it("handles multiple accounts independently, alerting only the newly-affordable ones", () => {
    const result = findNewlyAffordableAccounts(
      [
        account({ id: "a1", currentPoints: 600 }),
        account({ id: "a2", currentPoints: 100 }),
        account({ id: "a3", currentPoints: 500 }),
      ],
      [redemption({ id: "r1", pointsCost: 500 })],
      new Set([affordableAlertKey("a3", "r1")]),
    );
    expect(result.map((c) => c.account.id)).toEqual(["a1"]);
  });
});
