import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronRequest, errorJson } from "@/lib/api";
import { scanAndReplaceDeals, deactivateExpiredDeals } from "@/lib/deals";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return errorJson("Unauthorized", 401);
  }

  const startedAt = new Date();

  try {
    const deactivatedCount = await deactivateExpiredDeals(startedAt);

    const chainRecords = await db.chain.findMany({
      where: { scrapingEnabled: true },
    });

    const { chainsScanned, dealsInserted, errors } = await scanAndReplaceDeals(chainRecords);

    return NextResponse.json({
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      chainsScanned,
      dealsInserted,
      dealsDeactivated: deactivatedCount,
      errors,
    });
  } catch (err) {
    console.error("[GET /api/cron/scrape-deals]", err);
    return errorJson("Cron job failed", 500, {
      message: err instanceof Error ? err.message : "unknown",
    });
  }
}
