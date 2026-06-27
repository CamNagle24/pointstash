import { http, HttpResponse } from "msw";
import deals from "./fixtures/deals.json";
import accountsFixture from "./fixtures/accounts.json";
import redemptionsFixture from "./fixtures/redemptions.json";
import chains from "./fixtures/chains.json";

// In-memory stores so handlers can mutate state across the lifetime of a
// single test run / dev session.
type Account = (typeof accountsFixture)[number];
type Deal = (typeof deals)[number];
type Redemption = (typeof redemptionsFixture)[number];

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  notifyExpiring: boolean;
  notifyDeals: boolean;
  notifyDigest: boolean;
  notifyAffordable: boolean;
  createdAt: string;
};

const seedUser: UserRow = {
  id: "user_demo",
  email: "you@stash.it",
  name: "You",
  image: null,
  notifyExpiring: true,
  notifyDeals: true,
  notifyDigest: true,
  notifyAffordable: true,
  createdAt: "2024-01-01T00:00:00.000Z",
};

let accounts: Account[] = structuredClone(accountsFixture);
let dealsList: Deal[] = structuredClone(deals);
let redemptions: Redemption[] = structuredClone(redemptionsFixture);
let user: UserRow = structuredClone(seedUser);
let pointsHistory: Array<{
  id: string;
  accountId: string;
  previousPoints: number;
  newPoints: number;
  changeReason: string;
  occurredAt: string;
}> = [];

function findChain(slug: string) {
  return chains.find((c) => c.slug === slug);
}

function buildAccount(input: {
  chainSlug: string;
  loyaltyId?: string;
  currentPoints?: number;
  syncMethod?: string;
}): Account {
  const chain = findChain(input.chainSlug);
  return {
    id: `acct_${input.chainSlug}_${Date.now()}`,
    userId: "user_demo",
    chainSlug: input.chainSlug,
    loyaltyId: input.loyaltyId ?? null,
    currentPoints: input.currentPoints ?? 0,
    lastSynced: input.currentPoints != null ? new Date().toISOString() : null,
    syncMethod: input.syncMethod ?? "MANUAL",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chain: chain
      ? {
          slug: chain.slug,
          name: chain.name,
          color: chain.color,
          pointsName: chain.pointsName,
        }
      : { slug: input.chainSlug, name: input.chainSlug, color: "#52525b", pointsName: "points" },
  } as Account;
}

/** Reset to seeded data. Call from a test's beforeEach if needed. */
export function resetMockStore() {
  accounts = structuredClone(accountsFixture);
  dealsList = structuredClone(deals);
  redemptions = structuredClone(redemptionsFixture);
  user = structuredClone(seedUser);
  pointsHistory = [];
}

/** Drop *all* seed data — used for "empty state" tests. */
export function clearMockStore() {
  accounts = [];
  dealsList = [];
  redemptions = [];
  pointsHistory = [];
}

export const handlers = [
  // ────────────────────────────── auth ──────────────────────────────
  http.get("/api/auth/session", () =>
    HttpResponse.json({ user: { id: "user_demo", name: "You", email: "you@stash.it" } }),
  ),

  // ───────────────────────────────  user  ────────────────────────────
  http.get("/api/user/me", () => HttpResponse.json(user)),

  http.patch("/api/user/me", async ({ request }) => {
    const body = (await request.json()) as Partial<UserRow>;
    user = { ...user, ...body };
    return HttpResponse.json(user);
  }),

  http.delete("/api/user/me", () => new HttpResponse(null, { status: 204 })),

  // ───────────────────────────── chains ─────────────────────────────
  http.get("/api/chains", () => HttpResponse.json({ chains })),

  // ──────────────────────────── accounts ────────────────────────────
  http.get("/api/accounts", () => HttpResponse.json({ accounts })),

  http.post("/api/accounts", async ({ request }) => {
    const body = (await request.json()) as {
      chainSlug: string;
      loyaltyId?: string;
      currentPoints?: number;
      syncMethod?: string;
    };
    if (!body?.chainSlug) {
      return HttpResponse.json({ error: "Missing chainSlug" }, { status: 400 });
    }
    if (accounts.some((a) => a.chainSlug === body.chainSlug)) {
      return HttpResponse.json(
        { error: "Account already exists for this chain" },
        { status: 409 },
      );
    }
    const created = buildAccount(body);
    accounts.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put("/api/accounts/:id", async ({ params, request }) => {
    const body = (await request.json()) as Partial<Account>;
    const idx = accounts.findIndex((a) => a.id === params.id);
    if (idx < 0) return HttpResponse.json({ error: "Not found" }, { status: 404 });
    accounts[idx] = { ...accounts[idx], ...body, updatedAt: new Date().toISOString() };
    return HttpResponse.json(accounts[idx]);
  }),

  http.delete("/api/accounts/:id", ({ params }) => {
    const before = accounts.length;
    accounts = accounts.filter((a) => a.id !== params.id);
    if (accounts.length === before) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json({ ok: true });
  }),

  // ─────────────────────────────── points ───────────────────────────
  http.get("/api/points", () => {
    const totals = accounts.map((a) => ({
      chainSlug: a.chainSlug,
      points: a.currentPoints,
    }));
    return HttpResponse.json({ totals });
  }),

  http.post("/api/points/update", async ({ request }) => {
    const body = (await request.json()) as {
      accountId: string;
      newPoints: number;
      reason?: string;
      note?: string;
    };
    const idx = accounts.findIndex((a) => a.id === body.accountId);
    if (idx < 0) return HttpResponse.json({ error: "Account not found" }, { status: 404 });
    const previous = accounts[idx].currentPoints;
    accounts[idx] = {
      ...accounts[idx],
      currentPoints: body.newPoints,
      lastSynced: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pointsHistory.push({
      id: `ph_${Date.now()}`,
      accountId: accounts[idx].id,
      previousPoints: previous,
      newPoints: body.newPoints,
      changeReason: body.reason ?? "MANUAL_UPDATE",
      occurredAt: new Date().toISOString(),
    });
    return HttpResponse.json(accounts[idx]);
  }),

  http.post("/api/accounts/:id/redeem", async ({ params, request }) => {
    const body = (await request.json()) as { redemptionOptionId?: string };
    if (!body?.redemptionOptionId) {
      return HttpResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const accountIdx = accounts.findIndex((a) => a.id === params.id);
    if (accountIdx < 0) return HttpResponse.json({ error: "Account not found" }, { status: 404 });
    const account = accounts[accountIdx];

    const option = redemptions.find((r) => r.id === body.redemptionOptionId);
    if (!option || option.chainSlug !== account.chainSlug) {
      return HttpResponse.json(
        { error: "Redemption option not found for this account's chain" },
        { status: 400 },
      );
    }
    if (account.currentPoints < option.pointsCost) {
      return HttpResponse.json({ error: "Not enough points to redeem this option" }, { status: 400 });
    }

    const previous = account.currentPoints;
    const newPoints = previous - option.pointsCost;
    accounts[accountIdx] = {
      ...account,
      currentPoints: newPoints,
      lastSynced: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const pointsHistoryRow = {
      id: `ph_${Date.now()}`,
      accountId: account.id,
      previousPoints: previous,
      newPoints,
      changeReason: "REDEMPTION",
      occurredAt: new Date().toISOString(),
    };
    pointsHistory.push(pointsHistoryRow);
    return HttpResponse.json({ account: accounts[accountIdx], pointsHistory: pointsHistoryRow });
  }),

  http.get("/api/points/history", ({ request }) => {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId");
    const filtered = accountId
      ? pointsHistory.filter((h) => h.accountId === accountId)
      : pointsHistory;
    return HttpResponse.json({ history: filtered });
  }),

  // ─────────────────────────────── deals ────────────────────────────
  http.get("/api/deals", ({ request }) => {
    const url = new URL(request.url);
    const chain = url.searchParams.get("chain");
    const dealType = url.searchParams.get("dealType");
    let result = dealsList.filter((d) => d.isActive !== false);
    if (chain) result = result.filter((d) => d.chainSlug === chain);
    if (dealType) result = result.filter((d) => d.dealType === dealType);
    return HttpResponse.json({ deals: result });
  }),

  http.post("/api/deals/scrape", () =>
    HttpResponse.json({ scraped: 9, inserted: 27, errors: [] }),
  ),

  // ───────────────────────────── redemptions ────────────────────────
  http.get("/api/redemptions", ({ request }) => {
    const url = new URL(request.url);
    const chain = url.searchParams.get("chain");
    const result = chain
      ? redemptions.filter((r) => r.chainSlug === chain)
      : redemptions;
    const sorted = [...result].sort((a, b) => b.centsPerPoint - a.centsPerPoint);
    return HttpResponse.json({ redemptions: sorted });
  }),

  // ────────────────────────────── upload ────────────────────────────
  http.post("/api/upload", async ({ request }) => {
    const form = await request.formData();
    const chainSlug = form.get("chainSlug")?.toString() ?? "mcdonalds";
    return HttpResponse.json({
      imageUrl: "https://blob.example.com/screenshot.webp",
      extractedPoints: 6240,
      confidence: "high" as const,
      matchedPattern: "chain" as const,
      chainSlug,
    });
  }),

  // ──────────────────────────────── cron ────────────────────────────
  http.get("/api/cron/scrape-deals", () =>
    HttpResponse.json({
      ok: true,
      chainsScanned: 9,
      dealsInserted: 27,
      dealsDeactivated: 4,
      errors: [],
    }),
  ),
];
