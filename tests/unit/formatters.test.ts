import { describe, it, expect } from "vitest";
import {
  dealTypeLabel,
  dealTypeBadgeVariant,
  discountTypeLabel,
  discountTypeBadgeVariant,
} from "@/lib/formatters";

const DEAL_TYPE_VARIANTS = ["accent", "info", "muted", "success"];
const DISCOUNT_TYPE_VARIANTS = ["success", "accent", "info", "warning", "danger"];

describe("dealTypeLabel", () => {
  it("maps every key to a non-empty string", () => {
    for (const key of Object.keys(dealTypeLabel)) {
      expect(typeof dealTypeLabel[key]).toBe("string");
      expect(dealTypeLabel[key].length).toBeGreaterThan(0);
    }
  });

  it("covers all four deal types with no silent gaps", () => {
    expect(Object.keys(dealTypeLabel).sort()).toEqual(
      ["APP_EXCLUSIVE", "IN_STORE", "ONLINE", "REWARD_MEMBER"].sort(),
    );
  });
});

describe("dealTypeBadgeVariant", () => {
  it("maps every key to one of the expected badge variants", () => {
    for (const key of Object.keys(dealTypeBadgeVariant)) {
      expect(DEAL_TYPE_VARIANTS).toContain(dealTypeBadgeVariant[key]);
    }
  });

  it("has an entry for every dealTypeLabel key", () => {
    expect(Object.keys(dealTypeBadgeVariant).sort()).toEqual(Object.keys(dealTypeLabel).sort());
  });
});

describe("discountTypeLabel", () => {
  it("maps every key to a non-empty string", () => {
    for (const key of Object.keys(discountTypeLabel)) {
      expect(typeof discountTypeLabel[key]).toBe("string");
      expect(discountTypeLabel[key].length).toBeGreaterThan(0);
    }
  });

  it("covers all five discount types with no silent gaps", () => {
    expect(Object.keys(discountTypeLabel).sort()).toEqual(
      ["FREE_ITEM", "BOGO", "PERCENTAGE_OFF", "DOLLAR_OFF", "POINTS_MULTIPLIER"].sort(),
    );
  });
});

describe("discountTypeBadgeVariant", () => {
  it("maps every key to one of the expected badge variants", () => {
    for (const key of Object.keys(discountTypeBadgeVariant)) {
      expect(DISCOUNT_TYPE_VARIANTS).toContain(discountTypeBadgeVariant[key]);
    }
  });

  it("has an entry for every discountTypeLabel key", () => {
    expect(Object.keys(discountTypeBadgeVariant).sort()).toEqual(
      Object.keys(discountTypeLabel).sort(),
    );
  });
});
