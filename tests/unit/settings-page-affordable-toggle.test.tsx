import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

import SettingsPage from "@/app/dashboard/settings/page";
import { resetMockStore } from "../mocks/handlers";

afterEach(() => {
  cleanup();
  resetMockStore();
});

describe("SettingsPage — affordable redemption alerts toggle", () => {
  it("renders on, persists off via PATCH, and reflects the saved state", async () => {
    render(<SettingsPage />);

    const toggle = await screen.findByRole("switch", { name: "Affordable redemption alerts" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: "Affordable redemption alerts" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    // Re-rendering reflects the persisted (not just optimistic) state.
    cleanup();
    render(<SettingsPage />);
    const persisted = await screen.findByRole("switch", { name: "Affordable redemption alerts" });
    expect(persisted).toHaveAttribute("aria-checked", "false");
  });
});
