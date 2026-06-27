import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Regression coverage for screen-reader users navigating the sidebar/mobile
// menu: the active route must be exposed via aria-current, not just color.

const { pathnameRef } = vi.hoisted(() => ({ pathnameRef: { current: "/dashboard" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathnameRef.current }));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark", setTheme: vi.fn() }) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Jordan", email: "jordan@example.com" } } }),
  signOut: vi.fn(),
}));

import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

afterEach(cleanup);

describe("Sidebar — aria-current on the active nav link", () => {
  it.each([
    ["/dashboard", "Dashboard"],
    ["/dashboard/deals", "Deals"],
    ["/dashboard/redeem", "Redeem"],
    ["/dashboard/settings", "Settings"],
  ])("marks %s as current for the %s link", (pathname, label) => {
    pathnameRef.current = pathname;
    render(<Sidebar collapsed={false} onToggleCollapse={vi.fn()} />);

    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(label);
  });

  it("treats nested deal routes as the Deals link being current", () => {
    pathnameRef.current = "/dashboard/deals/123";
    render(<Sidebar collapsed={false} onToggleCollapse={vi.fn()} />);

    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Deals");
  });

  it("does not mark Dashboard as current on a nested route", () => {
    pathnameRef.current = "/dashboard/deals";
    render(<Sidebar collapsed={false} onToggleCollapse={vi.fn()} />);

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).not.toHaveAttribute("aria-current");
  });
});

describe("MobileNav — aria-current on the active nav link", () => {
  it.each([
    ["/dashboard", "Overview"],
    ["/dashboard/deals", "Deals"],
    ["/dashboard/redeem", "Redeem"],
    ["/dashboard/settings", "Settings"],
  ])("marks %s as current for the %s link", (pathname, label) => {
    pathnameRef.current = pathname;
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(label);
  });
});
