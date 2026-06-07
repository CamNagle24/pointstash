import { describe, it, expect } from "vitest";
import {
  isExpiringSoon,
  groupExpiringDealsByUser,
  removeAlreadyReminded,
  reminderKey,
  reminderDealLink,
  expiresInLabel,
  REMINDER_WINDOW_HOURS,
  type ReminderDeal,
  type ReminderUser,
  type UserReminder,
} from "@/lib/deal-reminders";

const now = new Date("2026-06-03T12:00:00Z");
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

function deal(over: Partial<ReminderDeal> & { id: string }): ReminderDeal {
  return {
    userId: null,
    title: "Free Fries",
    expiresAt: hoursFromNow(5),
    chainSlug: "wendys",
    chainName: "Wendy's",
    redeemUrl: null,
    anchorText: null,
    sourceUrl: null,
    ...over,
  };
}

describe("isExpiringSoon", () => {
  it("is true within the window and false outside it", () => {
    expect(isExpiringSoon(deal({ id: "a", expiresAt: hoursFromNow(5) }), now)).toBe(true);
    expect(isExpiringSoon(deal({ id: "b", expiresAt: hoursFromNow(71) }), now)).toBe(true);
    expect(isExpiringSoon(deal({ id: "c", expiresAt: hoursFromNow(80) }), now)).toBe(false);
  });

  it("is false for already-expired deals", () => {
    expect(isExpiringSoon(deal({ id: "d", expiresAt: hoursFromNow(-1) }), now)).toBe(false);
  });

  it("honors a custom window", () => {
    expect(isExpiringSoon(deal({ id: "e", expiresAt: hoursFromNow(40) }), now, 24)).toBe(false);
    expect(isExpiringSoon(deal({ id: "f", expiresAt: hoursFromNow(40) }), now, 48)).toBe(true);
  });

  it("defaults to a 72h window constant", () => {
    expect(REMINDER_WINDOW_HOURS).toBe(72);
  });
});

describe("groupExpiringDealsByUser", () => {
  const alice: ReminderUser = {
    id: "alice",
    email: "alice@example.com",
    name: "Alice",
    chainSlugs: ["wendys", "starbucks"],
  };
  const bob: ReminderUser = {
    id: "bob",
    email: "bob@example.com",
    name: null,
    chainSlugs: ["mcdonalds"],
  };

  it("matches global deals only for the user's linked chains", () => {
    const deals = [
      deal({ id: "w", chainSlug: "wendys", expiresAt: hoursFromNow(3) }),
      deal({ id: "m", chainSlug: "mcdonalds", expiresAt: hoursFromNow(3) }),
    ];
    const result = groupExpiringDealsByUser([alice, bob], deals, now);

    const aliceDeals = result.find((r) => r.user.id === "alice")?.deals.map((d) => d.id);
    const bobDeals = result.find((r) => r.user.id === "bob")?.deals.map((d) => d.id);
    expect(aliceDeals).toEqual(["w"]); // not the mcdonalds deal
    expect(bobDeals).toEqual(["m"]); // not the wendys deal
  });

  it("includes a user's own personal deal even for an unlinked chain", () => {
    const deals = [
      deal({ id: "p", chainSlug: "kfc", userId: "alice", expiresAt: hoursFromNow(2) }),
    ];
    const result = groupExpiringDealsByUser([alice], deals, now);
    expect(result[0].deals.map((d) => d.id)).toEqual(["p"]);
  });

  it("does not leak one user's personal deal to another user", () => {
    const deals = [deal({ id: "p", chainSlug: "wendys", userId: "bob", expiresAt: hoursFromNow(2) })];
    const result = groupExpiringDealsByUser([alice, bob], deals, now);
    // Alice has wendys linked but the deal is Bob's personal deal — only Bob gets it.
    expect(result.find((r) => r.user.id === "alice")).toBeUndefined();
    expect(result.find((r) => r.user.id === "bob")?.deals.map((d) => d.id)).toEqual(["p"]);
  });

  it("omits users with no relevant expiring deals", () => {
    const deals = [deal({ id: "m", chainSlug: "mcdonalds", expiresAt: hoursFromNow(3) })];
    const result = groupExpiringDealsByUser([alice], deals, now);
    expect(result).toEqual([]);
  });

  it("drops deals outside the window before grouping", () => {
    const deals = [
      deal({ id: "soon", chainSlug: "wendys", expiresAt: hoursFromNow(3) }),
      deal({ id: "later", chainSlug: "wendys", expiresAt: hoursFromNow(80) }),
    ];
    const result = groupExpiringDealsByUser([alice], deals, now);
    expect(result[0].deals.map((d) => d.id)).toEqual(["soon"]);
  });

  it("sorts each user's deals soonest-expiry first", () => {
    const deals = [
      deal({ id: "late", chainSlug: "wendys", expiresAt: hoursFromNow(10) }),
      deal({ id: "early", chainSlug: "starbucks", expiresAt: hoursFromNow(1) }),
    ];
    const result = groupExpiringDealsByUser([alice], deals, now);
    expect(result[0].deals.map((d) => d.id)).toEqual(["early", "late"]);
  });
});

describe("reminderKey", () => {
  it("is a stable chainSlug:title key, independent of the (churning) deal id", () => {
    const a = deal({ id: "row-1", chainSlug: "wendys", title: "$1 Frosty" });
    const b = deal({ id: "row-2", chainSlug: "wendys", title: "$1 Frosty" });
    expect(reminderKey(a)).toBe(reminderKey(b));
    expect(reminderKey(a)).toBe("wendys:$1 frosty");
  });

  it("normalizes case and whitespace so re-scrapes match", () => {
    expect(reminderKey(deal({ id: "x", chainSlug: "wendys", title: "  Free Fries  " }))).toBe(
      reminderKey(deal({ id: "y", chainSlug: "wendys", title: "free fries" })),
    );
  });
});

describe("removeAlreadyReminded", () => {
  const user: ReminderUser = { id: "u", email: "u@x.com", name: null, chainSlugs: ["wendys"] };
  const grouped: UserReminder[] = [
    {
      user,
      deals: [
        deal({ id: "1", chainSlug: "wendys", title: "Free Fries" }),
        deal({ id: "2", chainSlug: "wendys", title: "$1 Frosty" }),
      ],
    },
  ];

  it("drops deals already reminded (by stable key) and keeps the rest", () => {
    const sent = new Map([["u", new Set(["wendys:free fries"])]]);
    const result = removeAlreadyReminded(grouped, sent);
    expect(result[0].deals.map((d) => d.id)).toEqual(["2"]);
  });

  it("omits a user once all their deals have been reminded", () => {
    const sent = new Map([["u", new Set(["wendys:free fries", "wendys:$1 frosty"])]]);
    expect(removeAlreadyReminded(grouped, sent)).toEqual([]);
  });

  it("keeps everything when the user has no prior reminders", () => {
    const result = removeAlreadyReminded(grouped, new Map());
    expect(result[0].deals.map((d) => d.id)).toEqual(["1", "2"]);
  });

  it("matches a re-created deal row (new id, same offer) as already reminded", () => {
    const recreated: UserReminder[] = [
      { user, deals: [deal({ id: "new-row-99", chainSlug: "wendys", title: "Free Fries" })] },
    ];
    const sent = new Map([["u", new Set(["wendys:free fries"])]]);
    expect(removeAlreadyReminded(recreated, sent)).toEqual([]);
  });
});

describe("reminderDealLink", () => {
  it("builds a redeemUrl deep link with the scroll anchor", () => {
    const link = reminderDealLink(
      deal({ id: "x", redeemUrl: "https://order.wendys.com/rewards", title: "$1 Frosty" }),
    );
    expect(link).toBe("https://order.wendys.com/rewards#ps-deal=%241%20Frosty");
  });

  it("falls back to the chain rewards page + anchor when there's no redeemUrl", () => {
    const link = reminderDealLink(deal({ id: "y", chainSlug: "wendys", title: "Free Fries" }));
    expect(link).toContain("#ps-deal=Free%20Fries");
  });

  it("returns empty string for an unknown chain with no urls", () => {
    expect(reminderDealLink(deal({ id: "z", chainSlug: "not-a-chain" }))).toBe("");
  });
});

describe("expiresInLabel", () => {
  it("formats hours and minutes", () => {
    expect(expiresInLabel(deal({ id: "h", expiresAt: hoursFromNow(5) }), now)).toBe("in 5h");
    expect(expiresInLabel(deal({ id: "m", expiresAt: new Date(now.getTime() + 30 * 60 * 1000) }), now)).toBe(
      "in 30m",
    );
  });
});
