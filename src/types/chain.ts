export type ChainId =
  | "mcdonalds"
  | "chickfila"
  | "wendys"
  | "tacobell"
  | "burgerking"
  | "popeyes"
  | "subway"
  | "dunkin"
  | "starbucks";

export interface ChainConfig {
  id: ChainId;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  pointsName: string;
  pointsSymbol: string;
  pointsPerDollar: number;
  valuePerPoint: number;
  appDeepLink?: string;
}
