import { describe, it, expect } from "vitest";
import { extractPointsFromText, correctOcrDigits } from "@/lib/ocr";

describe("extractPointsFromText", () => {
  it("extracts McDonald's points from a typical OCR string", () => {
    const result = extractPointsFromText("You have 6,240 Points · earned this week", "mcdonalds");
    expect(result.extractedPoints).toBe(6240);
    expect(result.confidence).toBe("high");
    expect(result.matchedPattern).toBe("chain");
  });

  it("extracts Starbucks stars (★ glyph)", () => {
    const result = extractPointsFromText("142 ★ Star Rewards", "starbucks");
    expect(result.extractedPoints).toBe(142);
    expect(result.confidence).toBe("high");
  });

  it("extracts Starbucks stars (word form)", () => {
    const result = extractPointsFromText("Welcome — you have 280 Stars to spend", "starbucks");
    expect(result.extractedPoints).toBe(280);
    expect(result.confidence).toBe("high");
  });

  it("extracts Chick-fil-A points", () => {
    const result = extractPointsFromText("Member balance: 320 points", "chickfila");
    expect(result.extractedPoints).toBe(320);
    expect(result.confidence).toBe("high");
  });

  it("extracts Burger King crowns", () => {
    const result = extractPointsFromText("750 Crowns available", "burgerking");
    expect(result.extractedPoints).toBe(750);
  });

  it("extracts Subway tokens", () => {
    const result = extractPointsFromText("MVP — 1,240 tokens", "subway");
    expect(result.extractedPoints).toBe(1240);
  });

  it("handles common OCR artifacts (O instead of 0)", () => {
    const result = extractPointsFromText("6,24O Points", "mcdonalds");
    expect(result.extractedPoints).toBe(6240);
  });

  it("handles other letter-for-digit confusions inside numbers", () => {
    expect(correctOcrDigits("l42")).toBe("142");
    expect(correctOcrDigits("S00")).toBe("500");
    expect(correctOcrDigits("8O0")).toBe("800");
    // Does not corrupt actual words.
    expect(correctOcrDigits("Points earned today")).toBe("Points earned today");
  });

  it("falls back when chain pattern fails but a generic one matches", () => {
    // McDonald's pattern requires "point|pt|mcd"; here we use a token from a
    // different chain to force the fallback.
    const result = extractPointsFromText("420 crowns", "mcdonalds");
    expect(result.extractedPoints).toBe(420);
    expect(result.matchedPattern).toBe("fallback");
    expect(result.confidence).toBe("low");
  });

  it("returns null when no recognizable pattern is found", () => {
    const result = extractPointsFromText("This screenshot is unrelated.", "mcdonalds");
    expect(result.extractedPoints).toBeNull();
    expect(result.matchedPattern).toBe("none");
  });

  it("ignores totally empty input", () => {
    const result = extractPointsFromText("   ", "mcdonalds");
    expect(result.extractedPoints).toBeNull();
  });

  it("handles an unrecognized chain slug without throwing", () => {
    const result = extractPointsFromText("1,500 points available", "some-unknown-chain");
    expect(result.extractedPoints).toBe(1500);
    expect(result.matchedPattern).toBe("fallback");
    expect(result.confidence).toBe("low");
  });

  it("does not throw on an empty chain slug", () => {
    expect(() => extractPointsFromText("420 points", "")).not.toThrow();
  });

  it("does not throw on garbage/symbol-only input", () => {
    const result = extractPointsFromText("@#$%^&*()_+ ???!!!", "mcdonalds");
    expect(result.extractedPoints).toBeNull();
    expect(result.matchedPattern).toBe("none");
  });

  it("collapses newlines and tabs before matching", () => {
    const result = extractPointsFromText("You have\n\t6,240\nPoints", "mcdonalds");
    expect(result.extractedPoints).toBe(6240);
    expect(result.rawText).toBe("You have 6,240 Points");
  });

  it("is case-insensitive for chain and fallback patterns", () => {
    const result = extractPointsFromText("420 POINTS earned", "mcdonalds");
    expect(result.extractedPoints).toBe(420);
    expect(result.confidence).toBe("high");
  });

  it("corrects combined OCR digit confusions within a single number", () => {
    // Digit-letter-digit runs get every letter swapped, not just the first.
    expect(correctOcrDigits("62S0")).toBe("6250");
    // A leading letter run swaps too when it precedes a digit.
    expect(correctOcrDigits("B42O")).toBe("8420");
  });

  it("corrects OCR artifacts for Dunkin' points", () => {
    const result = extractPointsFromText("S5O points redeemed", "dunkin");
    expect(result.extractedPoints).toBe(550);
    expect(result.confidence).toBe("high");
  });

  it("corrects OCR artifacts for Subway tokens", () => {
    const result = extractPointsFromText("MVP balance: 62S0 tokens", "subway");
    expect(result.extractedPoints).toBe(6250);
    expect(result.confidence).toBe("high");
  });

  it("handles extremely large point totals", () => {
    const result = extractPointsFromText("999,999,999 points", "wendys");
    expect(result.extractedPoints).toBe(999999999);
  });

  it.each([
    ["chipotle", "Chipotle Rewards: 1,300 points"],
    ["pancheros", "Pancheros Rewards balance: 480 points"],
    ["dairyqueen", "DQ Rewards — 920 points"],
    ["culvers", "Culver's Rewards: 650 points"],
    ["jimmyjohns", "Freaky Fast Rewards: 1,050 points"],
    ["buffalowildwings", "Blazin' Rewards balance: 2,200 points"],
    ["kfc", "KFC Rewards: 740 points"],
    ["pandaexpress", "Panda Rewards: 1,890 points"],
  ])("extracts %s points with high confidence", (slug, text) => {
    const result = extractPointsFromText(text, slug);
    expect(result.extractedPoints).not.toBeNull();
    expect(result.confidence).toBe("high");
    expect(result.matchedPattern).toBe("chain");
  });
});

describe("correctOcrDigits", () => {
  it("replaces O/o with 0 adjacent to a digit", () => {
    expect(correctOcrDigits("6,24O")).toBe("6,240");
    expect(correctOcrDigits("1o2")).toBe("102");
    expect(correctOcrDigits("8OO")).toBe("800");
  });

  it("replaces I and l with 1 adjacent to a digit", () => {
    expect(correctOcrDigits("l42")).toBe("142");
    expect(correctOcrDigits("4I2")).toBe("412");
  });

  it("replaces S with 5 adjacent to a digit", () => {
    expect(correctOcrDigits("S00")).toBe("500");
    expect(correctOcrDigits("62S0")).toBe("6250");
  });

  it("replaces B with 8 adjacent to a digit", () => {
    expect(correctOcrDigits("B42")).toBe("842");
    expect(correctOcrDigits("10B")).toBe("108");
  });

  it("does not corrupt standalone words like 'Points'", () => {
    expect(correctOcrDigits("Points earned today")).toBe("Points earned today");
    expect(correctOcrDigits("Balance")).toBe("Balance");
  });

  it("handles comma-separated numbers where artifact is adjacent to a digit", () => {
    // The digit before the comma anchors the trailing run (e.g. 5OO → 500)
    expect(correctOcrDigits("1,5OO")).toBe("1,500");
    expect(correctOcrDigits("6,24O")).toBe("6,240");
  });

  it("applies multiple substitutions in the same contiguous run", () => {
    // B leads into digits (lookahead), then 2O is an inner run.
    expect(correctOcrDigits("B42O")).toBe("8420");
    // S leads into 00, then 0B closes.
    expect(correctOcrDigits("S0B")).toBe("508");
  });

  it("leaves clean numeric strings unchanged", () => {
    expect(correctOcrDigits("1234")).toBe("1234");
    expect(correctOcrDigits("6,240 points")).toBe("6,240 points");
  });

  it("handles mixed clean and corrupted runs in the same string", () => {
    // "1,24O" → "1,240" (4O run corrected); "S00" → "500" (S followed by digit)
    const input = "Balance: 1,24O tokens — spend S00 now";
    const output = correctOcrDigits(input);
    expect(output).toContain("1,240");
    expect(output).toContain("500");
    expect(output).toContain("tokens");
    expect(output).toContain("now");
  });
});
