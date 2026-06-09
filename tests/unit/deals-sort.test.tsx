import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Deal } from "@/types/deal";

// The feed pulls deals/accounts through hooks and pokes the extension on mount;
// stub all three so the page renders offline and we can drive the sort control.
const { useDealsMock, useAccountsMock } = vi.hoisted(() => ({
  useDealsMock: vi.fn(),
  useAccountsMock: vi.fn(),
}));
vi.mock("@/hooks/useDeals", () => ({ useDeals: useDealsMock }));
vi.mock("@/hooks/useAccounts", () => ({ useAccounts: useAccountsMock }));
vi.mock("@/lib/extension-bridge", () => ({ syncOffers: vi.fn().mockResolvedValue({ synced: [] }) }));

import DealsPage from "@/app/dashboard/deals/page";

// Radix DropdownMenu relies on pointer-capture + scrollIntoView, absent in jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

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
    chain: { id: "c1", slug: "wendys", name: "Wendy's", color: "#e2231a", pointsName: "points" },
    ...over,
  };
}

const day = 1000 * 60 * 60 * 24;
const t = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();

// Three deals whose three sort orders are all distinct, so each assertion
// uniquely pins one mode:
//   expiring (expiresAt asc): Alpha, Bravo, Charlie
//   newest   (createdAt desc): Bravo, Charlie, Alpha
//   value    (pointsCost asc): Bravo(100), Charlie(200), Alpha(300)
const DEALS = [
  deal({ title: "Alpha", expiresAt: t(1), createdAt: t(-10), pointsCost: 300 }),
  deal({ title: "Bravo", expiresAt: t(5), createdAt: t(-1), pointsCost: 100 }),
  deal({ title: "Charlie", expiresAt: t(9), createdAt: t(-5), pointsCost: 200 }),
];

function titleOrder(): string[] {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent ?? "");
}

beforeEach(() => {
  useDealsMock.mockReset().mockReturnValue({
    deals: DEALS,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  });
  useAccountsMock.mockReset().mockReturnValue({ accounts: [] });
});

describe("DealsPage — sort control", () => {
  it("defaults to soonest-expiring order", () => {
    render(<DealsPage />);
    expect(titleOrder()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("reorders by newest when selected", async () => {
    const user = userEvent.setup();
    render(<DealsPage />);
    await user.click(screen.getByRole("button", { name: "Sort deals" }));
    await user.click(await screen.findByRole("menuitem", { name: /Newest/ }));
    expect(titleOrder()).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("reorders by points low-to-high when selected", async () => {
    const user = userEvent.setup();
    render(<DealsPage />);
    await user.click(screen.getByRole("button", { name: "Sort deals" }));
    await user.click(await screen.findByRole("menuitem", { name: /Points: low to high/ }));
    expect(titleOrder()).toEqual(["Bravo", "Charlie", "Alpha"]);
  });
});
