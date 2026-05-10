import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isCronRequest, errorJson } from "@/lib/api";
import { scrapeChain } from "@/lib/scrapers";

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

    let scraped = 0;
    let inserted = 0;
    const errors: string[] = [];

    for (const c of chainRecords) {
      const outcome = await scrapeChain(c.slug);
      if (!outcome.ok) {
        errors.push(`${c.slug}: ${outcome.error}`);
        continue;
      }
      scraped += 1;
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

    return NextResponse.json({ scraped, inserted, errors });
  } catch (err) {
    console.error("[POST /api/deals/scrape]", err);
    return errorJson("Failed to run scrapers", 500);
  }
}
