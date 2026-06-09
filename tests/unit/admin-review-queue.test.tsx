import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Deal } from "@/types/deal";

// The admin page loads deals via SWR; stub the hook so we can render with a
// fixed mix of verified/unverified deals and exercise the review-queue filter
// without any network. mutate is a no-op — we never assert on refetches here.
const { useSWRMock } = vi.hoisted(() => ({ useSWRMock: vi.fn() }));
vi.mock("swr", () => ({ default: useSWRMock }));

import AdminDealsPage from "@/app/dashboard/admin/deals/page";

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
    expiresAt: null,
    isVerified: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    chain: { id: "c1", slug: "wendys", name: "Wendy's", color: "#e2231a", pointsName: "points" },
    ...over,
  };
}

const DEALS = [
  deal({ title: "Verified burger", isVerified: true }),
  deal({ title: "Scraped fries", isVerified: false, source: "EXTENSION" }),
  deal({ title: "Scraped nuggets", isVerified: false, source: "LLM" }),
];

beforeEach(() => {
  useSWRMock.mockReset().mockReturnValue({
    data: { deals: DEALS },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  });
});

describe("AdminDealsPage — review queue", () => {
  it("surfaces the count of deals needing review in the header", () => {
    render(<AdminDealsPage />);
    expect(screen.getByText(/2 need review/)).toBeInTheDocument();
  });

  it("shows every deal under the default 'All' filter", () => {
    render(<AdminDealsPage />);
    expect(screen.getByText("Verified burger")).toBeInTheDocument();
    expect(screen.getByText("Scraped fries")).toBeInTheDocument();
    expect(screen.getByText("Scraped nuggets")).toBeInTheDocument();
  });

  it("narrows to only unverified deals under 'Needs review'", () => {
    render(<AdminDealsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Needs review/ }));
    expect(screen.queryByText("Verified burger")).not.toBeInTheDocument();
    expect(screen.getByText("Scraped fries")).toBeInTheDocument();
    expect(screen.getByText("Scraped nuggets")).toBeInTheDocument();
  });

  it("shows the all-caught-up empty state when nothing needs review", () => {
    useSWRMock.mockReturnValue({
      data: { deals: [deal({ title: "Verified burger", isVerified: true })] },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    render(<AdminDealsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Needs review/ }));
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });
});
