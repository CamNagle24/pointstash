import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isCronRequest, errorJson } from "@/lib/api";
import { scanAndReplaceDeals, deactivateExpiredDeals } from "@/lib/deals";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  chains: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const cron = isCronRequest(req);
    if (!cron) {
      const guard = await requireAuth();
      if ("response" in guard) return guard.response;
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const slugFilter = parsed.data.chains?.length ? parsed.data.chains : undefined;
    const chainRecords = await db.chain.findMany({
      where: {
        scrapingEnabled: true,
        ...(slugFilter && { slug: { in: slugFilter } }),
      },
    });

    const deactivatedCount = await deactivateExpiredDeals(new Date());

    const { chainsScanned: scraped, dealsInserted: inserted, errors } =
      await scanAndReplaceDeals(chainRecords);

    return NextResponse.json({ scraped, inserted, deactivated: deactivatedCount, errors });
  } catch (err) {
    console.error("[POST /api/deals/scrape]", err);
    return errorJson("Failed to run scrapers", 500);
  }
}
