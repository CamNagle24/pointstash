import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DealCard } from "@/components/dashboard/DealCard";
import { DealsCalendar } from "@/components/dashboard/DealsCalendar";
import type { Deal } from "@/types/deal";

afterEach(cleanup);

const baseCardProps = {
  chainSlug: "wendys" as const,
  title: "Free Fries",
  description: "Free medium fries with any purchase.",
  dealType: "APP_EXCLUSIVE",
  discountType: "FREE_ITEM",
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
};

describe("DealCard — Yours badge", () => {
  it('shows the "Yours" badge for the user\'s own synced deal', () => {
    render(<DealCard {...baseCardProps} userId="user_1" />);
    expect(screen.getByText("Yours")).toBeInTheDocument();
  });

  it('omits the badge for a global deal (userId null)', () => {
    render(<DealCard {...baseCardProps} userId={null} />);
    expect(screen.queryByText("Yours")).not.toBeInTheDocument();
  });
});

describe("DealCard — Unverified trust signal", () => {
  it("flags a global, unreviewed (auto-scraped) deal", () => {
    render(<DealCard {...baseCardProps} userId={null} isVerified={false} />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });

  it("does not flag a verified deal", () => {
    render(<DealCard {...baseCardProps} userId={null} isVerified={true} />);
    expect(screen.queryByText("Unverified")).not.toBeInTheDocument();
  });

  it("does not flag the user's own synced deal even though it's unverified", () => {
    // "Yours" conveys provenance; an alarming "Unverified" would be confusing.
    render(<DealCard {...baseCardProps} userId="user_1" isVerified={false} />);
    expect(screen.getByText("Yours")).toBeInTheDocument();
    expect(screen.queryByText("Unverified")).not.toBeInTheDocument();
  });
});

function calendarDeal(over: Partial<Deal>): Deal {
  const today = new Date().toISOString();
  return {
    id: "d1",
    chainId: "c1",
    userId: null,
    title: "Free Fries",
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
    source: "EXTENSION",
    startsAt: null,
    expiresAt: today,
    isVerified: false,
    isActive: true,
    createdAt: today,
    updatedAt: today,
    chain: { id: "c1", slug: "wendys", name: "Wendy's", color: "#e2231a", pointsName: "points" },
    ...over,
  };
}

describe("DealsCalendar — ownership hint", () => {
  it("marks the user's own deal chip with a (yours) tooltip in month view", () => {
    render(<DealsCalendar deals={[calendarDeal({ id: "mine", userId: "user_1" })]} />);
    // The month grid renders today's cell; the owned chip's title carries the hint.
    expect(screen.getByTitle(/Wendy's: Free Fries \(yours\)/)).toBeInTheDocument();
  });

  it("leaves a global deal chip without the hint", () => {
    render(<DealsCalendar deals={[calendarDeal({ id: "global", userId: null })]} />);
    expect(screen.getByTitle("Wendy's: Free Fries")).toBeInTheDocument();
    expect(screen.queryByTitle(/\(yours\)/)).not.toBeInTheDocument();
  });
});
