import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { ChainAccount } from "@/types/account";
import { resetMockStore } from "../mocks/handlers";

// Drive the dialog's history straight from the hook so we don't hit the network.
const { historyMock } = vi.hoisted(() => ({ historyMock: vi.fn() }));
vi.mock("@/hooks/usePointsHistory", () => ({ usePointsHistory: () => historyMock() }));

import { AccountDetailsDialog } from "@/components/dashboard/AccountDetailsDialog";

// recharts' ResponsiveContainer + Radix Dialog poke browser APIs jsdom lacks.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  cleanup();
  resetMockStore();
});

// Matches the seeded Chick-fil-A row in tests/mocks/fixtures/accounts.json so
// the real DELETE /api/accounts/:id mock handler has a row to remove.
const account: ChainAccount = {
  id: "acct_cfa_1",
  userId: "user_demo",
  chainId: "chain-chickfila",
  loyaltyId: null,
  currentPoints: 320,
  lastSynced: "2026-05-09T11:00:00Z",
  syncMethod: "MANUAL",
  isActive: true,
  createdAt: "2026-02-20T18:00:00Z",
  updatedAt: "2026-05-09T11:00:00Z",
  chain: {
    id: "chain-chickfila",
    slug: "chickfila",
    name: "Chick-fil-A",
    logo: "",
    color: "#E51636",
    pointsName: "Chick-fil-A points",
  },
};

describe("AccountDetailsDialog — disconnect confirmation", () => {
  beforeAll(() => {
    historyMock.mockReturnValue({ history: [], isLoading: false });
  });

  it("requires an in-app confirm step before unlinking, instead of a native confirm()", async () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AccountDetailsDialog account={account} open onOpenChange={onOpenChange} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(await screen.findByText("Unlink Chick-fil-A?")).toBeInTheDocument();
    expect(screen.getByText("You can always relink later.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("backs out of the confirm step on Cancel without calling the delete endpoint", () => {
    const onChange = vi.fn();
    render(<AccountDetailsDialog account={account} open onOpenChange={() => {}} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(screen.getByText("Unlink Chick-fil-A?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Unlink Chick-fil-A?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
