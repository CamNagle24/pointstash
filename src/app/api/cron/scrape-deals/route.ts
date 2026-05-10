import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronRequest, errorJson } from "@/lib/api";
import { scrapeChain } from "@/lib/scrapers";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return errorJson("Unauthorized", 401);
  }

  const startedAt = new Date();
  const errors: string[] = [];
  let inserted = 0;
  let chainsScanned = 0;

  try {
    const deactivated = await db.deal.updateMany({
      where: { isActive: true, expiresAt: { lt: startedAt } },
      data: { isActive: false },
    });

    const chainRecords = await db.chain.findMany({
      where: { scrapingEnabled: true },
    });

    for (const c of chainRecords) {
      const outcome = await scrapeChain(c.slug);
      if (!outcome.ok) {
        errors.push(`${c.slug}: ${outcome.error}`);
        continue;
      }
      chainsScanned += 1;
      for (const d of outcome.deals) {
        await db.deal.create({
          data: {
            chainId: c.id,
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
            isActive: true,
          },
        });
        inserted += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      chainsScanned,
      dealsInserted: inserted,
      dealsDeactivated: deactivated.count,
      errors,
    });
  } catch (err) {
    console.error("[GET /api/cron/scrape-deals]", err);
    return errorJson("Cron job failed", 500, {
      message: err instanceof Error ? err.message : "unknown",
      partial: { chainsScanned, dealsInserted: inserted, errors },
    });
  }
}
