import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ScrapedDeal } from "@/types/deal";

/**
 * Sources that are machine-generated and safe to wipe + reinsert on every
 * scrape run. MANUAL (admin-curated) deals are intentionally excluded so they
 * survive the cron.
 */
const AUTO_SOURCES: Prisma.DealWhereInput["source"] = { in: ["LLM", "AGGREGATOR"] };

/** Maps a pre-DB ScrapedDeal onto the columns for a `createMany` insert. */
export function mapScrapedDeal(
  d: ScrapedDeal,
  chainId: string,
): Prisma.DealCreateManyInput {
  return {
    chainId,
    title: d.title,
    description: d.description ?? null,
    dealType: d.dealType,
    discountType: d.discountType,
    originalPrice: d.originalPrice ?? null,
    dealPrice: d.dealPrice ?? null,
    pointsCost: d.pointsCost ?? null,
    imageUrl: d.imageUrl ?? null,
    sourceUrl: d.sourceUrl,
    expiresAt: d.expiresAt ?? null,
    source: "LLM",
    isVerified: false,
    isActive: true,
  };
}

/**
 * Replace a chain's auto-sourced (LLM/AGGREGATOR) deals with a fresh set in a
 * single transaction. Manual/curated deals are never touched. Returns the
 * number of rows inserted.
 *
 * Mirrors the delete-then-insert pattern used for redemptions in prisma/seed.ts
 * — auto deal titles churn run-to-run, so last-known-good replacement is the
 * right primitive (not an upsert that would accumulate stale rows).
 *
 * Callers should only invoke this on a *successful* scrape; skipping it on
 * failure leaves the previous auto deals in place (last-known-good).
 */
export async function replaceAutoDeals(
  chainId: string,
  deals: ScrapedDeal[],
): Promise<number> {
  const rows = deals.map((d) => mapScrapedDeal(d, chainId));
  await db.$transaction([
    db.deal.deleteMany({ where: { chainId, source: AUTO_SOURCES } }),
    db.deal.createMany({ data: rows }),
  ]);
  return rows.length;
}

/** Deactivate any active deal (regardless of source) whose expiry has passed. */
export async function deactivateExpiredDeals(now: Date): Promise<number> {
  const res = await db.deal.updateMany({
    where: { isActive: true, expiresAt: { lt: now } },
    data: { isActive: false },
  });
  return res.count;
}
