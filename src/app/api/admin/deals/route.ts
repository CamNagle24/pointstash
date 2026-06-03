import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, chainSelect, errorJson } from "@/lib/api";

export const runtime = "nodejs";

const dealTypeEnum = z.enum(["APP_EXCLUSIVE", "IN_STORE", "ONLINE", "REWARD_MEMBER"]);
const discountTypeEnum = z.enum([
  "FREE_ITEM",
  "BOGO",
  "PERCENTAGE_OFF",
  "DOLLAR_OFF",
  "POINTS_MULTIPLIER",
]);
const sourceEnum = z.enum(["MANUAL", "LLM", "AGGREGATOR"]);

const createSchema = z.object({
  chainSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dealType: dealTypeEnum,
  discountType: discountTypeEnum,
  originalPrice: z.number().nonnegative().optional(),
  dealPrice: z.number().nonnegative().optional(),
  pointsCost: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  redeemUrl: z.string().url().optional(),
  anchorText: z.string().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

// GET — list every deal (incl. inactive/expired) for the admin table.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  try {
    const sourceRaw = req.nextUrl.searchParams.get("source");
    const sourceParsed = sourceRaw ? sourceEnum.safeParse(sourceRaw) : null;
    if (sourceParsed && !sourceParsed.success) {
      return errorJson("Invalid source value", 400);
    }

    const where: Prisma.DealWhereInput = {
      ...(sourceParsed?.success && { source: sourceParsed.data }),
    };

    const deals = await db.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { chain: chainSelect() },
    });

    return NextResponse.json({ deals, total: deals.length });
  } catch (err) {
    console.error("[GET /api/admin/deals]", err);
    return errorJson("Failed to load deals", 500);
  }
}

// POST — create one curated deal (always MANUAL + verified + active).
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }
    const d = parsed.data;

    const chain = await db.chain.findUnique({ where: { slug: d.chainSlug } });
    if (!chain) {
      return errorJson("Unknown chain", 400);
    }

    const deal = await db.deal.create({
      data: {
        chainId: chain.id,
        title: d.title,
        description: d.description ?? null,
        dealType: d.dealType,
        discountType: d.discountType,
        originalPrice: d.originalPrice ?? null,
        dealPrice: d.dealPrice ?? null,
        pointsCost: d.pointsCost ?? null,
        imageUrl: d.imageUrl ?? null,
        sourceUrl: d.sourceUrl ?? null,
        redeemUrl: d.redeemUrl ?? null,
        anchorText: d.anchorText ?? null,
        startsAt: d.startsAt ? new Date(d.startsAt) : null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        source: "MANUAL",
        isVerified: true,
        isActive: true,
      },
      include: { chain: chainSelect() },
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/deals]", err);
    return errorJson("Failed to create deal", 500);
  }
}
