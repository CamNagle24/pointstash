/**
 * Mirrors the Prisma `RedemptionOption` model. `centsPerPoint` is a cached
 * column maintained by the seed/upsert path so we don't re-derive it on every
 * read.
 */
export interface RedemptionOption {
  id: string;
  chainId: string;
  itemName: string;
  pointsCost: number;
  retailPriceCents: number;
  centsPerPoint: number;
  category: "ENTREE" | "SIDE" | "DRINK" | "DESSERT" | "COMBO" | "OTHER";
  chain?: {
    id: string;
    slug: string;
    name: string;
    color: string;
    pointsName: string;
  };
}
