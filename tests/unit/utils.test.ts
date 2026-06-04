import { describe, it, expect } from "vitest";
import {
  cn,
  formatPoints,
  formatCurrency,
  formatCurrencyDollars,
  pointsToCents,
  pointsToDollars,
  getExpirationLabel,
  timeAgo,
  dealHref,
} from "@/lib/utils";

describe("cn", () => {
  it("dedupes conflicting tailwind utilities", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatPoints", () => {
  it("adds commas correctly", () => {
    expect(formatPoints(6240)).toBe("6,240");
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(1_234_567)).toBe("1,234,567");
  });
});

describe("formatCurrency", () => {
  it("formats cents to 2 decimal places", () => {
    expect(formatCurrency(599)).toBe("$5.99");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1234567)).toBe("$12345.67");
  });

  it("formats dollar floats to 2 decimal places", () => {
    expect(formatCurrencyDollars(5.45)).toBe("$5.45");
    expect(formatCurrencyDollars(5)).toBe("$5.00");
    // Standard JS rounding (banker's-rounding-ish) — keep the tolerance flexible.
    expect(formatCurrencyDollars(0.1 + 0.2)).toBe("$0.30");
  });
});

describe("pointsToCents / pointsToDollars", () => {
  it("pointsToCents multiplies points by per-point dollar value × 100", () => {
    // 1000 points at $0.005/pt = $5.00 = 500 cents
    expect(pointsToCents(1000, 0.005)).toBeCloseTo(500);
  });

  it("pointsToDollars multiplies points by per-point dollar value", () => {
    expect(pointsToDollars(1000, 0.005)).toBeCloseTo(5);
  });
});

describe("getExpirationLabel", () => {
  const now = new Date("2026-05-09T12:00:00Z");

  it("returns countdown for future dates", () => {
    expect(getExpirationLabel("2026-05-12T12:00:00Z", now)).toBe("Expires in 3 days");
    expect(getExpirationLabel("2026-05-10T12:00:00Z", now)).toBe("Expires in 1 day");
  });

  it("says 'Expires today!' for sub-24h windows", () => {
    expect(getExpirationLabel("2026-05-09T22:00:00Z", now)).toBe("Expires today!");
  });

  it("says 'Expired' for past dates", () => {
    expect(getExpirationLabel("2026-05-08T12:00:00Z", now)).toBe("Expired");
    expect(getExpirationLabel("2025-01-01T00:00:00Z", now)).toBe("Expired");
  });

  it("accepts Date objects too", () => {
    const future = new Date("2026-05-14T12:00:00Z");
    expect(getExpirationLabel(future, now)).toBe("Expires in 5 days");
  });
});

describe("dealHref", () => {
  const chain = { appDeepLink: "https://wendys.com/rewards", domain: "wendys.com" };

  it("deep-links to redeemUrl with a #ps-deal anchor (prefers anchorText)", () => {
    expect(
      dealHref(
        { redeemUrl: "https://order.wendys.com/loyalty/rewards", anchorText: "$1 Dave's Single", title: "x" },
        chain,
      ),
    ).toBe("https://order.wendys.com/loyalty/rewards#ps-deal=%241%20Dave's%20Single");
  });

  it("falls back to the title when anchorText is missing", () => {
    expect(dealHref({ redeemUrl: "https://order.wendys.com/r", title: "Free Fries" }, chain)).toBe(
      "https://order.wendys.com/r#ps-deal=Free%20Fries",
    );
  });

  it("uses sourceUrl when there's no redeemUrl", () => {
    expect(dealHref({ sourceUrl: "https://news.example.com/promo", title: "x" }, chain)).toBe(
      "https://news.example.com/promo",
    );
  });

  it("falls back to appDeepLink with a scroll anchor derived from the title", () => {
    expect(dealHref({ title: "$1 Dave's Single" }, chain)).toBe(
      "https://wendys.com/rewards#ps-deal=%241%20Dave's%20Single",
    );
  });

  it("uses bare domain (no anchor) when there's no appDeepLink", () => {
    expect(dealHref({ title: "x" }, { domain: "kfc.com" })).toBe("https://kfc.com");
  });

  it("omits the anchor when there's no anchorText or title", () => {
    expect(dealHref({}, chain)).toBe("https://wendys.com/rewards");
  });
});

describe("timeAgo", () => {
  it("formats recent timestamps as 'just now'", () => {
    expect(timeAgo(new Date())).toBe("just now");
  });

  it("formats minute and hour windows", () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60 * 1000))).toBe("5m ago");
    expect(timeAgo(new Date(Date.now() - 2 * 60 * 60 * 1000))).toBe("2h ago");
  });
});
