export type ChainId =
  | "mcdonalds"
  | "chickfila"
  | "wendys"
  | "tacobell"
  | "burgerking"
  | "popeyes"
  | "subway"
  | "dunkin"
  | "starbucks"
  | "chipotle"
  | "pancheros"
  | "dairyqueen"
  | "culvers"
  | "jimmyjohns"
  | "buffalowildwings"
  | "kfc"
  | "pandaexpress";

export interface ChainConfig {
  id: ChainId;
  name: string;
  shortName: string;
  logo: string;
  /** Public domain used as the logo.dev lookup key. */
  domain: string;
  color: string;
  pointsName: string;
  pointsSymbol: string;
  pointsPerDollar: number;
  valuePerPoint: number;
  appDeepLink?: string;
  /**
   * Chains where the points balance only exists in the mobile app (no
   * scrapable web UI). Auto-sync via the browser extension is impossible —
   * manual entry or screenshot OCR is the only path. Surfaced in the UI as
   * an "App only" badge.
   */
  appOnly?: boolean;
}
