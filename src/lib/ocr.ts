const POINTS_PATTERNS: Record<string, RegExp> = {
  mcdonalds: /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:point|pt|mcd)/i,
  chickfila: /(\d{1,3}(?:,\d{3})*|\d+)\s*point/i,
  wendys: /(\d{1,3}(?:,\d{3})*|\d+)\s*point/i,
  burgerking: /(\d{1,3}(?:,\d{3})*|\d+)\s*crown/i,
  tacobell: /(\d{1,3}(?:,\d{3})*|\d+)\s*point/i,
  popeyes: /(\d{1,3}(?:,\d{3})*|\d+)\s*point/i,
  subway: /(\d{1,3}(?:,\d{3})*|\d+)\s*token/i,
  dunkin: /(\d{1,3}(?:,\d{3})*|\d+)\s*point/i,
  starbucks: /(?:★\s*)?(\d{1,3}(?:,\d{3})*|\d+)\s*(?:★|star)/i,
};

const FALLBACK = /(\d{1,3}(?:,\d{3})*|\d{2,})\s*(?:point|pt|star|crown|token|★)/i;

export interface PointsExtraction {
  extractedPoints: number | null;
  confidence: "high" | "low";
  rawText: string;
  matchedPattern: "chain" | "fallback" | "none";
}

/**
 * Tesseract regularly mistakes letters for digits inside a numeric run —
 * O/o → 0, l/I/| → 1, S → 5, B → 8 are the common ones. This pass only
 * swaps a letter when it sits between digits or before a digit at start
 * (e.g. `6,24O` or `O42`), so we don't corrupt words like "Points".
 */
export function correctOcrDigits(text: string): string {
  return text.replace(/(?:[0-9][OoIlSB]+|[OoIlSB]+(?=[0-9]))/g, (run) =>
    run
      .replace(/[Oo]/g, "0")
      .replace(/[Il|]/g, "1")
      .replace(/S/g, "5")
      .replace(/B/g, "8"),
  );
}

export function extractPointsFromText(rawText: string, chainSlug: string): PointsExtraction {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  const text = correctOcrDigits(normalized);
  const chainPattern = POINTS_PATTERNS[chainSlug];

  if (chainPattern) {
    const match = text.match(chainPattern);
    if (match) {
      const value = parseInt(match[1].replace(/,/g, ""), 10);
      if (!Number.isNaN(value)) {
        return {
          extractedPoints: value,
          confidence: "high",
          rawText: text,
          matchedPattern: "chain",
        };
      }
    }
  }

  const fallback = text.match(FALLBACK);
  if (fallback) {
    const value = parseInt(fallback[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(value)) {
      return {
        extractedPoints: value,
        confidence: "low",
        rawText: text,
        matchedPattern: "fallback",
      };
    }
  }

  return {
    extractedPoints: null,
    confidence: "low",
    rawText: text,
    matchedPattern: "none",
  };
}
