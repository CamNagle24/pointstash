import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AffordableRedemptionItem } from "@/lib/affordable-alert-email";

// Capture what Resend.emails.send receives without hitting the network.
const sendMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

// Keep unsubscribe-token real but allow toggling the secret.
const { unsubscribeSecretMock } = vi.hoisted(() => ({ unsubscribeSecretMock: vi.fn() }));
vi.mock("@/lib/unsubscribe-token", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/unsubscribe-token")>();
  return { ...real, unsubscribeSecret: unsubscribeSecretMock };
});

import { sendAffordableRedemptionEmail } from "@/lib/affordable-alert-email";

function item(over: Partial<AffordableRedemptionItem> = {}): AffordableRedemptionItem {
  return {
    chainSlug: "wendys",
    chainName: "Wendy's",
    itemName: "Frosty",
    pointsCost: 500,
    ...over,
  };
}

const baseArgs = {
  to: "user@example.com",
  name: "Alice",
  userId: "user_1",
};

describe("sendAffordableRedemptionEmail (no RESEND_API_KEY — dev mode)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    unsubscribeSecretMock.mockReturnValue(null);
    sendMock.mockClear();
  });

  it("returns 'logged' and does not call Resend when API key is absent", async () => {
    const result = await sendAffordableRedemptionEmail({ ...baseArgs, items: [item()] });
    expect(result).toBe("logged");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 'logged' even for zero items (edge: caller should filter first)", async () => {
    const result = await sendAffordableRedemptionEmail({ ...baseArgs, items: [] });
    expect(result).toBe("logged");
  });
});

describe("sendAffordableRedemptionEmail (production, no RESEND_API_KEY)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.stubEnv("NODE_ENV", "production");
    unsubscribeSecretMock.mockReturnValue(null);
    sendMock.mockClear();
  });

  it("throws instead of logging in production", async () => {
    await expect(
      sendAffordableRedemptionEmail({ ...baseArgs, items: [item()] }),
    ).rejects.toThrow("RESEND_API_KEY is not configured");
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendAffordableRedemptionEmail — subject line", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    unsubscribeSecretMock.mockReturnValue(null);
    sendMock.mockClear().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("uses singular subject for exactly 1 item", async () => {
    await sendAffordableRedemptionEmail({ ...baseArgs, items: [item({ itemName: "Frosty" })] });
    expect(sendMock.mock.calls[0][0].subject).toBe("You can now afford: Frosty");
  });

  it("uses plural subject for 2+ items", async () => {
    await sendAffordableRedemptionEmail({
      ...baseArgs,
      items: [
        item({ itemName: "Frosty" }),
        item({ chainSlug: "dunkin", chainName: "Dunkin'", itemName: "Free Coffee" }),
      ],
    });
    expect(sendMock.mock.calls[0][0].subject).toBe("2 redemptions you can now afford");
  });
});

describe("sendAffordableRedemptionEmail — body rendering", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    unsubscribeSecretMock.mockReturnValue(null);
    sendMock.mockClear().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("includes the item name and chain name in the HTML and text body", async () => {
    await sendAffordableRedemptionEmail({
      ...baseArgs,
      items: [item({ chainSlug: "wendys", chainName: "Wendy's", itemName: "Frosty" })],
    });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Frosty");
    expect(html).toContain("Wendy's");
    expect(text).toContain("Frosty");
    expect(text).toContain("Wendy's");
  });

  it("includes the points cost", async () => {
    await sendAffordableRedemptionEmail({ ...baseArgs, items: [item({ pointsCost: 750 })] });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("750");
    expect(text).toContain("750");
  });

  it("links to the redeem page for the item's chain", async () => {
    await sendAffordableRedemptionEmail({ ...baseArgs, items: [item({ chainSlug: "tacobell" })] });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("/dashboard/redeem?chain=tacobell");
    expect(text).toContain("/dashboard/redeem?chain=tacobell");
  });

  it("includes the greeting with the user's name", async () => {
    await sendAffordableRedemptionEmail({ ...baseArgs, name: "Bob", items: [item()] });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Hi Bob,");
    expect(text).toContain("Hi Bob,");
  });

  it("uses a generic greeting when name is null", async () => {
    await sendAffordableRedemptionEmail({ ...baseArgs, name: null, items: [item()] });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Hi there,");
    expect(text).toContain("Hi there,");
  });

  it("renders all chains and items for a multi-chain digest", async () => {
    const items: AffordableRedemptionItem[] = [
      item({ chainSlug: "wendys", chainName: "Wendy's", itemName: "Frosty" }),
      item({ chainSlug: "dunkin", chainName: "Dunkin'", itemName: "Free Coffee" }),
    ];
    await sendAffordableRedemptionEmail({ ...baseArgs, items });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Wendy's");
    expect(html).toContain("Frosty");
    expect(html).toContain("Dunkin'");
    expect(html).toContain("Free Coffee");
    expect(text).toContain("Wendy's: Frosty");
    expect(text).toContain("Dunkin': Free Coffee");
  });

  it("omits the unsubscribe link when AUTH_SECRET is not configured", async () => {
    unsubscribeSecretMock.mockReturnValue(null);
    await sendAffordableRedemptionEmail({ ...baseArgs, items: [item()] });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Settings");
    expect(html).not.toContain("/api/unsubscribe");
    expect(text).not.toContain("/api/unsubscribe");
  });

  it("includes the unsubscribe URL when AUTH_SECRET is configured", async () => {
    unsubscribeSecretMock.mockReturnValue("super-secret");
    await sendAffordableRedemptionEmail({ ...baseArgs, items: [item()] });
    const { html } = sendMock.mock.calls[0][0];
    expect(html).toContain("/api/unsubscribe");
  });

  it("returns 'sent' on success", async () => {
    const result = await sendAffordableRedemptionEmail({ ...baseArgs, items: [item()] });
    expect(result).toBe("sent");
  });

  it("throws with Resend's error message when the send fails", async () => {
    sendMock.mockResolvedValueOnce({ error: { message: "Rate limited" } });
    await expect(
      sendAffordableRedemptionEmail({ ...baseArgs, items: [item()] }),
    ).rejects.toThrow("Rate limited");
  });
});
