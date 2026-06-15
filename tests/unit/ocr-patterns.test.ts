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
});
