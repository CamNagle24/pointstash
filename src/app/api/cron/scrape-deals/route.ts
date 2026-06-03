import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronRequest, errorJson } from "@/lib/api";
import { scrapeChain } from "@/lib/scrapers";
import { replaceAutoDeals, deactivateExpiredDeals } from "@/lib/deals";

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
    const deactivatedCount = await deactivateExpiredDeals(startedAt);

    const chainRecords = await db.chain.findMany({
      where: { scrapingEnabled: true },
    });

    for (const c of chainRecords) {
      const outcome = await scrapeChain(c.slug);
      if (!outcome.ok) {
        // Leave this chain's existing auto deals untouched (last-known-good).
        errors.push(`${c.slug}: ${outcome.error}`);
        continue;
      }
      chainsScanned += 1;
      // Replace only this chain's auto-sourced deals; curated MANUAL deals stay.
      inserted += await replaceAutoDeals(c.id, outcome.deals);
    }

    return NextResponse.json({
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      chainsScanned,
      dealsInserted: inserted,
      dealsDeactivated: deactivatedCount,
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
