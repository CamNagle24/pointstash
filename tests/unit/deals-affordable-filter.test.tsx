import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Deal } from "@/types/deal";

// Same offline harness as the sort test: stub the data hooks and the on-mount
// extension poke so the feed renders deterministically.
const { useDealsMock, useAccountsMock, searchParamsRef } = vi.hoisted(() => ({
  useDealsMock: vi.fn(),
  useAccountsMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams() },
}));
vi.mock("@/hooks/useDeals", () => ({ useDeals: useDealsMock }));
vi.mock("@/hooks/useAccounts", () => ({ useAccounts: useAccountsMock }));
vi.mock("@/lib/extension-bridge", () => ({ syncOffers: vi.fn().mockResolvedValue({ synced: [] }) }));
// Override the global next/navigation stub so this file can drive the URL params
// the page reads on mount (the ?affordable=1 deep link).
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsRef.current }));

import DealsPage from "@/app/dashboard/deals/page";

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

const wendysChain = { id: "c1", slug: "wendys", name: "Wendy's", color: "#e2231a", pointsName: "points" };
const kfcChain = { id: "c2", slug: "kfc", name: "KFC", color: "#e4002b", pointsName: "points" };

// A wendys deal the user can afford, one they can't, and a non-points freebie.
const CHEAP = deal({ title: "Cheap", pointsCost: 100, chain: wendysChain });
const PRICEY = deal({ title: "Pricey", pointsCost: 900, chain: wendysChain });
const FREEBIE = deal({ title: "Freebie", pointsCost: null, chain: wendysChain });

// User tracks wendys with 500 points.
const wendysAccount = { chain: { slug: "wendys" }, currentPoints: 500 };

const shown = (title: string) => screen.queryByRole("heading", { level: 3, name: title }) != null;

beforeEach(() => {
  useDealsMock.mockReset().mockReturnValue({
    deals: [CHEAP, PRICEY, FREEBIE],
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  });
  useAccountsMock.mockReset().mockReturnValue({ accounts: [wendysAccount] });
  searchParamsRef.current = new URLSearchParams();
});

describe("DealsPage — Affordable filter", () => {
  it("hides the toggle when no accounts are linked", () => {
    useAccountsMock.mockReturnValue({ accounts: [] });
    render(<DealsPage />);
    expect(screen.queryByRole("button", { name: "Affordable" })).not.toBeInTheDocument();
  });

  it("hides the toggle when no deal has a points cost", () => {
    useDealsMock.mockReturnValue({
      deals: [deal({ title: "Freebie", pointsCost: null, chain: wendysChain })],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    render(<DealsPage />);
    expect(screen.queryByRole("button", { name: "Affordable" })).not.toBeInTheDocument();
  });

  it("keeps only deals the tracked balance covers when toggled on", async () => {
    const user = userEvent.setup();
    render(<DealsPage />);
    // All three visible by default.
    expect(shown("Cheap") && shown("Pricey") && shown("Freebie")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Affordable" }));

    expect(shown("Cheap")).toBe(true); // 100 ≤ 500
    expect(shown("Pricey")).toBe(false); // 900 > 500
    expect(shown("Freebie")).toBe(false); // no points cost
  });

  it("pre-enables the filter from a ?affordable=1 deep link", () => {
    searchParamsRef.current = new URLSearchParams("affordable=1");
    render(<DealsPage />);
    // Filtered on mount with no click: only the affordable deal survives.
    expect(shown("Cheap")).toBe(true); // 100 ≤ 500
    expect(shown("Pricey")).toBe(false); // 900 > 500
    expect(shown("Freebie")).toBe(false); // no points cost
  });

  it("shows an affordability-specific empty state when nothing is affordable", () => {
    // Only unaffordable deals on the user's tracked chain, filter pre-enabled.
    useDealsMock.mockReturnValue({
      deals: [PRICEY, FREEBIE],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    searchParamsRef.current = new URLSearchParams("affordable=1");
    render(<DealsPage />);
    expect(screen.getByText("No deals you can afford yet")).toBeInTheDocument();
    expect(screen.queryByText("No deals match those filters")).not.toBeInTheDocument();
  });

  it("excludes a points deal on an untracked chain (unknown balance)", async () => {
    useDealsMock.mockReturnValue({
      deals: [CHEAP, deal({ title: "Untracked", pointsCost: 50, chain: kfcChain })],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const user = userEvent.setup();
    render(<DealsPage />);
    // Clear the chain filter (seeded to the user's tracked chains) so the kfc
    // deal isn't hidden by chain scoping before the affordability check runs.
    await user.click(screen.getByRole("button", { name: "All chains" }));
    await user.click(screen.getByRole("button", { name: "Affordable" }));

    expect(shown("Cheap")).toBe(true);
    expect(shown("Untracked")).toBe(false); // balance unknown ⇒ not affordable
  });
});
