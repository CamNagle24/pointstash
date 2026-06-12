import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Deal } from "@/types/deal";

// Same offline harness as the other feed tests, plus a controllable
// searchParams ref so each test can seed the page from a specific query string
// and assert what gets mirrored back into the URL.
const { useDealsMock, useAccountsMock, searchParamsRef, redemptionsRef } = vi.hoisted(() => ({
  useDealsMock: vi.fn(),
  useAccountsMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams() },
  redemptionsRef: { current: [] as unknown[] },
}));
vi.mock("@/hooks/useDeals", () => ({ useDeals: useDealsMock }));
vi.mock("@/hooks/useAccounts", () => ({ useAccounts: useAccountsMock }));
vi.mock("@/hooks/useRedemptions", () => ({ useRedemptions: () => ({ redemptions: redemptionsRef.current }) }));
vi.mock("@/lib/extension-bridge", () => ({ syncOffers: vi.fn().mockResolvedValue({ synced: [] }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsRef.current }));

import DealsPage from "@/app/dashboard/deals/page";

// Radix DropdownMenu relies on pointer-capture + scrollIntoView, absent in jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

const wendys = { id: "c1", slug: "wendys", name: "Wendy's", color: "#e2231a", pointsName: "points" };
const kfc = { id: "c2", slug: "kfc", name: "KFC", color: "#e4002b", pointsName: "points" };

function deal(over: Partial<Deal>): Deal {
  const now = new Date().toISOString();
  return {
    id: Math.random().toString(36).slice(2),
    chainId: "c1",
    userId: null,
    title: "A deal",
    description: null,
    dealType: "APP_EXCLUSIVE",
    discountType: "FREE_ITEM",
    originalPrice: null,
    dealPrice: null,
    pointsCost: null,
    imageUrl: null,
    sourceUrl: null,
    redeemUrl: null,
    anchorText: null,
    source: "MANUAL",
    startsAt: null,
    expiresAt: now,
    isVerified: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    chain: wendys,
    ...over,
  };
}

const titleOrder = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent ?? "");
const shown = (title: string) =>
  screen.queryByRole("heading", { level: 3, name: title }) != null;

beforeEach(() => {
  useDealsMock.mockReset();
  useAccountsMock.mockReset().mockReturnValue({ accounts: [] });
  searchParamsRef.current = new URLSearchParams();
  redemptionsRef.current = [];
  window.history.replaceState(null, "", "/dashboard/deals");
});

function mockDeals(deals: Deal[]) {
  useDealsMock.mockReturnValue({ deals, error: undefined, isLoading: false, mutate: vi.fn() });
}

describe("DealsPage — URL view state", () => {
  it("seeds the sort order from ?sort", () => {
    // value sort = points ascending: Cheap(100), Mid(200), Pricey(300).
    mockDeals([
      deal({ title: "Pricey", pointsCost: 300 }),
      deal({ title: "Cheap", pointsCost: 100 }),
      deal({ title: "Mid", pointsCost: 200 }),
    ]);
    searchParamsRef.current = new URLSearchParams("sort=value");
    render(<DealsPage />);
    expect(titleOrder()).toEqual(["Cheap", "Mid", "Pricey"]);
  });

  it("opens in calendar view from ?view=calendar", () => {
    mockDeals([deal({ title: "Solo" })]);
    searchParamsRef.current = new URLSearchParams("view=calendar");
    render(<DealsPage />);
    // The calendar exposes month nav the list view doesn't.
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
  });

  it("seeds the chain filter from ?chains and suppresses the account seed", () => {
    // Account is on kfc; URL pins wendys, which must win.
    useAccountsMock.mockReturnValue({ accounts: [{ chain: { slug: "kfc" }, currentPoints: 0 }] });
    mockDeals([deal({ title: "Wendys deal", chain: wendys }), deal({ title: "KFC deal", chain: kfc })]);
    searchParamsRef.current = new URLSearchParams("chains=wendys");
    render(<DealsPage />);
    expect(shown("Wendys deal")).toBe(true);
    expect(shown("KFC deal")).toBe(false);
  });

  it("seeds the type filter from ?type", () => {
    mockDeals([
      deal({ title: "Online", dealType: "ONLINE" }),
      deal({ title: "InStore", dealType: "IN_STORE" }),
    ]);
    searchParamsRef.current = new URLSearchParams("type=ONLINE");
    render(<DealsPage />);
    expect(shown("Online")).toBe(true);
    expect(shown("InStore")).toBe(false);
  });

  it("ignores a bogus ?sort value and falls back to expiring", () => {
    const day = 1000 * 60 * 60 * 24;
    const at = (d: number) => new Date(Date.now() + d * day).toISOString();
    mockDeals([
      deal({ title: "Later", expiresAt: at(9) }),
      deal({ title: "Soon", expiresAt: at(1) }),
    ]);
    searchParamsRef.current = new URLSearchParams("sort=banana");
    render(<DealsPage />);
    expect(titleOrder()).toEqual(["Soon", "Later"]);
  });

  it("shows an estimated dollar value priced at the chain's best rate", () => {
    // 100 pts at 1.5¢/pt = 150¢ = $1.50.
    redemptionsRef.current = [{ chainId: "c1", centsPerPoint: 1.5 }];
    mockDeals([deal({ title: "Solo", pointsCost: 100 })]);
    render(<DealsPage />);
    expect(screen.getByText(/≈ \$1\.50 value/)).toBeInTheDocument();
  });

  it("omits the value when the chain has no redemptions to price against", () => {
    redemptionsRef.current = [];
    mockDeals([deal({ title: "Solo", pointsCost: 100 })]);
    render(<DealsPage />);
    expect(screen.queryByText(/value/)).not.toBeInTheDocument();
    expect(screen.getByText("100 pts")).toBeInTheDocument();
  });

  it("mirrors a sort change back into the URL", async () => {
    mockDeals([deal({ title: "Solo", pointsCost: 100 })]);
    const user = userEvent.setup();
    render(<DealsPage />);
    // Default expiring sort is omitted from the URL.
    expect(window.location.search).toBe("");
    await user.click(screen.getByRole("button", { name: "Sort deals" }));
    await user.click(await screen.findByRole("menuitem", { name: /Newest/ }));
    expect(new URLSearchParams(window.location.search).get("sort")).toBe("newest");
  });
});
