/**
 * Mirrors the Prisma `Account` model with the joined `chain` relation
 * (selected via `chainSelect()` in `src/lib/api.ts`).
 */
export interface ChainAccount {
  id: string;
  userId: string;
  chainId: string;
  loyaltyId: string | null;
  currentPoints: number;
  lastSynced: string | null;
  syncMethod: "MANUAL" | "SCREENSHOT" | "API" | "SCRAPE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  chain: {
    id: string;
    slug: string;
    name: string;
    logo: string;
    color: string;
    pointsName: string;
  };
}
