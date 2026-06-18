import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Regression coverage for icon-only buttons: each one must expose an
// accessible name (via aria-label) so screen readers announce its action
// instead of silently reading nothing.

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark", setTheme: vi.fn() }) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Jordan", email: "jordan@example.com" } } }),
  signOut: vi.fn(),
}));

import { ChainAccountCard } from "@/components/dashboard/ChainAccountCard";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/dashboard/Sidebar";

afterEach(cleanup);

describe("ChainAccountCard — icon-only button accessible names", () => {
  it("exposes accessible names for edit, open, and settings actions", () => {
    render(
      <ChainAccountCard
        accountId="acc_1"
        chainSlug="mcdonalds"
        points={1240}
        lastSyncedAt={new Date()}
        bestRedemptionLabel="Free fries · 500 pts"
        onOpenDetails={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit points" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open McDonald's rewards page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account settings" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all McDonald's redemptions" }),
    ).toBeInTheDocument();
  });

  it("exposes accessible names for save and cancel while editing", () => {
    render(
      <ChainAccountCard
        accountId="acc_1"
        chainSlug="mcdonalds"
        points={1240}
        lastSyncedAt={new Date()}
        bestRedemptionLabel="Free fries · 500 pts"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit points" }));

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("exposes an accessible name for the sync action on extension-supported chains", () => {
    render(
      <ChainAccountCard
        accountId="acc_1"
        chainSlug="wendys"
        points={500}
        lastSyncedAt={new Date()}
        bestRedemptionLabel="Free Frosty · 500 pts"
      />,
    );

    expect(screen.getByRole("button", { name: "Sync Wendy's now" })).toBeInTheDocument();
  });
});

describe("MobileNav — icon-only menu toggle", () => {
  it("exposes an accessible name for the menu toggle", () => {
    render(<MobileNav />);
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });
});

describe("Sidebar — icon-only button accessible names", () => {
  it("exposes accessible names for theme toggle, sign out, and collapse", () => {
    render(<Sidebar collapsed={false} onToggleCollapse={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });

  it("flips the collapse button's label when collapsed", () => {
    render(<Sidebar collapsed={true} onToggleCollapse={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });
});
