import type { DealType, DiscountType, DealSource } from "@prisma/client";

/** Mirrors the Prisma `Deal` row returned from `/api/deals`. */
export interface Deal {
  id: string;
  chainId: string;
  userId: string | null;
  title: string;
  description: string | null;
  dealType: DealType;
  discountType: DiscountType;
  originalPrice: number | null;
  dealPrice: number | null;
  pointsCost: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  redeemUrl: string | null;
  anchorText: string | null;
  source: DealSource;
  startsAt: string | null;
  expiresAt: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  chain?: {
    id: string;
    slug: string;
    name: string;
    color: string;
    pointsName: string;
  };
}

/** What chain scrapers return from the registry — pre-DB shape. */
export interface ScrapedDeal {
  title: string;
  description?: string;
  dealType: DealType;
  discountType: DiscountType;
  originalPrice?: number;
  dealPrice?: number;
  pointsCost?: number;
  expiresAt?: Date;
  imageUrl?: string;
  sourceUrl: string;
}

export interface ChainScraper {
  chainSlug: string;
  scrapeDeals(): Promise<ScrapedDeal[]>;
}
