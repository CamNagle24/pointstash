import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errorJson } from "@/lib/api";
import { requireExtensionAuth } from "@/lib/extension-auth";
import { extractDealsFromText } from "@/lib/scrapers/llm-extract";
import { hostBelongsToChain } from "@/lib/chain-host";

export const runtime = "nodejs";
export const maxDuration = 60;

const syncSchema = z.object({
  chainSlug: z.string().min(1),
  pageText: z.string().min(40).max(40_000),
  pageUrl: z.string().url(),
});

// POST /api/extension/sync-offers
// Auth: Bearer token from the extension. Takes the rendered text of the user's
// logged-in rewards/offers page, runs the shared LLM extractor on it, and
// stores the result as the user's personal (source=EXTENSION) redeemable deals.
// Mirrors replaceAutoDeals' delete-then-insert, scoped to this user + chain.
export async function POST(req: Request) {
  try {
    const guard = await requireExtensionAuth(req);
    if ("response" in guard) return guard.response;

    const body = await req.json().catch(() => null);
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }
    const { chainSlug, pageText, pageUrl } = parsed.data;

    // Reject a pageUrl whose host doesn't match the claimed chain — stops a
    // compromised/spoofed tab from planting an arbitrary redeemUrl.
    if (!hostBelongsToChain(pageUrl, chainSlug)) {
      return errorJson("pageUrl host does not match chain", 400);
    }

    const chain = await db.chain.findUnique({
      where: { slug: chainSlug },
      select: { id: true, name: true },
    });
    if (!chain) return errorJson("Unknown chain", 404);

    const scraped = await extractDealsFromText({
      chainSlug,
      chainName: chain.name,
      sourceUrl: pageUrl,
      rawText: pageText,
    });

    const rows: Prisma.DealCreateManyInput[] = scraped.map((d) => ({
      chainId: chain.id,
      userId: guard.userId,
      title: d.title,
      description: d.description ?? null,
      dealType: d.dealType,
      discountType: d.discountType,
      originalPrice: d.originalPrice ?? null,
      dealPrice: d.dealPrice ?? null,
      pointsCost: d.pointsCost ?? null,
      expiresAt: d.expiresAt ?? null,
      imageUrl: d.imageUrl ?? null,
      sourceUrl: d.sourceUrl,
      redeemUrl: pageUrl,
      anchorText: d.title,
      source: "EXTENSION",
      isVerified: false,
      isActive: true,
    }));

    // Replace this user's existing extension deals for the chain (last-known-good
    // per user+chain). Curated/global deals (userId=null) are never touched.
    await db.$transaction([
      db.deal.deleteMany({
        where: { userId: guard.userId, chainId: chain.id, source: "EXTENSION" },
      }),
      db.deal.createMany({ data: rows }),
    ]);

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error("[POST /api/extension/sync-offers]", err);
    return errorJson("Failed to sync offers", 500);
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
    },
  });
}
