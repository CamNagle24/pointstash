import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { RedemptionTable } from "@/components/dashboard/RedemptionTable";
import { resetMockStore } from "../mocks/handlers";
import type { ChainId } from "@/types/chain";

afterEach(() => {
  cleanup();
  resetMockStore();
});

const rows = [
  {
    id: "rdm_mcd_2",
    chainSlug: "mcdonalds" as ChainId,
    itemName: "Medium Fries",
    pointsCost: 1500,
    retailPriceCents: 349,
    centsPerPoint: 0.2327,
  },
  {
    id: "rdm_mcd_1",
    chainSlug: "mcdonalds" as ChainId,
    itemName: "Big Mac",
    pointsCost: 6000,
    retailPriceCents: 599,
    centsPerPoint: 0.0998,
  },
];

describe("RedemptionTable — mark as redeemed", () => {
  it("disables the action for rows the account can't afford", () => {
    render(<RedemptionTable rows={rows} accountId="acct_mcd_1" currentPoints={4850} />);

    // Sorted by cents-per-point descending: Medium Fries (affordable) first, Big Mac (not) second.
    const [friesButton, bigMacButton] = screen.getAllByRole("button", { name: "Mark redeemed" });

    expect(friesButton).not.toBeDisabled();
    expect(bigMacButton).toBeDisabled();
  });

  it("disables every action when there's no linked account", () => {
    render(<RedemptionTable rows={rows} />);
    for (const button of screen.getAllByRole("button", { name: "Mark redeemed" })) {
      expect(button).toBeDisabled();
    }
  });

  it("confirms, calls the redeem endpoint, and notifies the parent on success", async () => {
    const onRedeemed = vi.fn();
    render(
      <RedemptionTable
        rows={rows}
        accountId="acct_mcd_1"
        currentPoints={4850}
        onRedeemed={onRedeemed}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Mark redeemed" })[0]);

    expect(await screen.findByText("Mark as redeemed?")).toBeInTheDocument();
    expect(screen.getByText("3,350")).toBeInTheDocument(); // 4850 - 1500 resulting balance

    fireEvent.click(screen.getByRole("button", { name: "Confirm redemption" }));

    await waitFor(() => expect(onRedeemed).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Mark as redeemed?")).not.toBeInTheDocument();
  });
});
