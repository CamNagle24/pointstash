import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReminderDeal } from "@/lib/deal-reminders";

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

import { sendExpiringDealsEmail } from "@/lib/deal-reminder-email";

const now = new Date("2026-06-16T12:00:00Z");
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

function deal(over: Partial<ReminderDeal> & { id: string; title: string }): ReminderDeal {
  return {
    userId: null,
    expiresAt: hoursFromNow(5),
    chainSlug: "wendys",
    chainName: "Wendy's",
    redeemUrl: null,
    anchorText: null,
    sourceUrl: null,
    ...over,
  };
}

const baseArgs = {
  to: "user@example.com",
  name: "Alice",
  userId: "user_1",
  now,
};

describe("sendExpiringDealsEmail (no RESEND_API_KEY — dev mode)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    unsubscribeSecretMock.mockReturnValue(null);
    sendMock.mockClear();
  });

  it("returns 'logged' and does not call Resend when API key is absent", async () => {
    const result = await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [deal({ id: "d1", title: "Free Fries" })],
    });
    expect(result).toBe("logged");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 'logged' even for zero deals (edge: caller should filter first)", async () => {
    const result = await sendExpiringDealsEmail({ ...baseArgs, deals: [] });
    expect(result).toBe("logged");
  });
});

describe("sendExpiringDealsEmail — subject line", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    unsubscribeSecretMock.mockReturnValue(null);
    sendMock.mockClear().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("uses singular subject for exactly 1 deal", async () => {
    await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [deal({ id: "d1", title: "Free Frosty" })],
    });
    const [call] = sendMock.mock.calls;
    expect(call[0].subject).toBe("A deal is expiring soon: Free Frosty");
  });

  it("uses plural subject for 2 deals", async () => {
    await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [
        deal({ id: "d1", title: "Free Frosty" }),
        deal({ id: "d2", title: "Free Baconator" }),
      ],
    });
    expect(sendMock.mock.calls[0][0].subject).toBe("2 deals expiring soon");
  });

  it("uses plural subject for 3+ deals", async () => {
    await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [
        deal({ id: "d1", title: "Deal 1" }),
        deal({ id: "d2", title: "Deal 2" }),
        deal({ id: "d3", title: "Deal 3" }),
      ],
    });
    expect(sendMock.mock.calls[0][0].subject).toBe("3 deals expiring soon");
  });
});

describe("sendExpiringDealsEmail — body rendering", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    unsubscribeSecretMock.mockReturnValue(null);
    sendMock.mockClear().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("includes the deal title and chain name in the HTML body", async () => {
    await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [deal({ id: "d1", title: "Free Frosty", chainName: "Wendy's" })],
    });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Free Frosty");
    expect(html).toContain("Wendy's");
    expect(text).toContain("Free Frosty");
    expect(text).toContain("Wendy's");
  });

  it("includes the greeting with user name", async () => {
    await sendExpiringDealsEmail({
      ...baseArgs,
      name: "Bob",
      deals: [deal({ id: "d1", title: "Free Frosty" })],
    });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Hi Bob,");
    expect(text).toContain("Hi Bob,");
  });

  it("uses generic greeting when name is null", async () => {
    await sendExpiringDealsEmail({
      ...baseArgs,
      name: null,
      deals: [deal({ id: "d1", title: "Free Frosty" })],
    });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Hi there,");
    expect(text).toContain("Hi there,");
  });

  it("renders all chains and titles for a multi-chain digest", async () => {
    const deals: ReminderDeal[] = [
      deal({ id: "d1", title: "Free Frosty", chainSlug: "wendys", chainName: "Wendy's" }),
      deal({
        id: "d2",
        title: "Free Coffee",
        chainSlug: "dunkin",
        chainName: "Dunkin'",
        expiresAt: hoursFromNow(10),
      }),
      deal({
        id: "d3",
        title: "BOGO Tacos",
        chainSlug: "tacobell",
        chainName: "Taco Bell",
        expiresAt: hoursFromNow(20),
      }),
    ];
    await sendExpiringDealsEmail({ ...baseArgs, deals });
    const { html, text } = sendMock.mock.calls[0][0];
    // All three chain names appear (apostrophes are not HTML-escaped in chainName)
    expect(html).toContain("Wendy's");
    expect(html).toContain("Dunkin'");
    expect(html).toContain("Taco Bell");
    // All three deal titles appear
    expect(html).toContain("Free Frosty");
    expect(html).toContain("Free Coffee");
    expect(html).toContain("BOGO Tacos");
    // Text version includes all
    expect(text).toContain("Wendy's: Free Frosty");
    expect(text).toContain("Dunkin': Free Coffee");
    expect(text).toContain("Taco Bell: BOGO Tacos");
  });

  it("omits the unsubscribe link when AUTH_SECRET is not configured", async () => {
    unsubscribeSecretMock.mockReturnValue(null);
    await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [deal({ id: "d1", title: "Free Frosty" })],
    });
    const { html, text } = sendMock.mock.calls[0][0];
    expect(html).toContain("Settings");
    expect(html).not.toContain("/api/unsubscribe");
    expect(text).not.toContain("/api/unsubscribe");
  });

  it("includes the unsubscribe URL when AUTH_SECRET is configured", async () => {
    unsubscribeSecretMock.mockReturnValue("super-secret");
    await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [deal({ id: "d1", title: "Free Frosty" })],
    });
    const { html } = sendMock.mock.calls[0][0];
    expect(html).toContain("/api/unsubscribe");
  });

  it("returns 'sent' on success", async () => {
    const result = await sendExpiringDealsEmail({
      ...baseArgs,
      deals: [deal({ id: "d1", title: "Free Frosty" })],
    });
    expect(result).toBe("sent");
  });

  it("throws when Resend returns an error", async () => {
    sendMock.mockResolvedValueOnce({ error: { message: "Rate limited" } });
    await expect(
      sendExpiringDealsEmail({
        ...baseArgs,
        deals: [deal({ id: "d1", title: "Free Frosty" })],
      }),
    ).rejects.toThrow("Rate limited");
  });
});
