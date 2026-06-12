import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ChainAccount } from "@/types/account";

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

afterEach(cleanup);

const now = new Date().toISOString();
const account: ChainAccount = {
  id: "acc-1",
  userId: "u1",
  chainId: "chain-wendys",
  loyaltyId: null,
  currentPoints: 200,
  lastSynced: now,
  syncMethod: "MANUAL",
  isActive: true,
  createdAt: now,
  updatedAt: now,
  chain: { id: "chain-wendys", slug: "wendys", name: "Wendy's", logo: "", color: "#e2231a", pointsName: "points" },
};

const renderDialog = () =>
  render(<AccountDetailsDialog account={account} open onOpenChange={() => {}} />);

describe("AccountDetailsDialog — balance history", () => {
  it("charts the trend once there are enough balance changes", () => {
    historyMock.mockReturnValue({
      history: [
        { previousPoints: 100, newPoints: 200, createdAt: "2026-06-02T00:00:00Z" },
        { previousPoints: 0, newPoints: 100, createdAt: "2026-06-01T00:00:00Z" },
      ],
      isLoading: false,
    });
    renderDialog();
    expect(screen.getByText("Balance history")).toBeInTheDocument();
    // Took the chart branch, not the sparse-history hint.
    expect(screen.queryByText(/Balances will chart here/)).not.toBeInTheDocument();
  });

  it("shows a hint instead of a chart when history is too sparse", () => {
    historyMock.mockReturnValue({ history: [], isLoading: false });
    renderDialog();
    expect(screen.getByText("Balance history")).toBeInTheDocument();
    expect(screen.getByText(/Balances will chart here/)).toBeInTheDocument();
  });

  it("shows a loader while history is loading", () => {
    historyMock.mockReturnValue({ history: [], isLoading: true });
    renderDialog();
    expect(screen.queryByText(/Balances will chart here/)).not.toBeInTheDocument();
  });
});
