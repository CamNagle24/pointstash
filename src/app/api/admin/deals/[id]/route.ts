import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

// Nullable fields accept `null` to clear them; `source` is intentionally
// absent — curated deals must stay MANUAL so the cron never purges them.
const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  dealType: dealTypeEnum.optional(),
  discountType: discountTypeEnum.optional(),
  originalPrice: z.number().nonnegative().nullable().optional(),
  dealPrice: z.number().nonnegative().nullable().optional(),
  pointsCost: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  redeemUrl: z.string().url().nullable().optional(),
  anchorText: z.string().max(200).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }
    const p = parsed.data;

    const existing = await db.deal.findUnique({ where: { id } });
    if (!existing) return errorJson("Deal not found", 404);

    const deal = await db.deal.update({
      where: { id },
      data: {
        ...(p.title !== undefined && { title: p.title }),
        ...(p.description !== undefined && { description: p.description }),
        ...(p.dealType !== undefined && { dealType: p.dealType }),
        ...(p.discountType !== undefined && { discountType: p.discountType }),
        ...(p.originalPrice !== undefined && { originalPrice: p.originalPrice }),
        ...(p.dealPrice !== undefined && { dealPrice: p.dealPrice }),
        ...(p.pointsCost !== undefined && { pointsCost: p.pointsCost }),
        ...(p.imageUrl !== undefined && { imageUrl: p.imageUrl }),
        ...(p.sourceUrl !== undefined && { sourceUrl: p.sourceUrl }),
        ...(p.redeemUrl !== undefined && { redeemUrl: p.redeemUrl }),
        ...(p.anchorText !== undefined && { anchorText: p.anchorText }),
        ...(p.startsAt !== undefined && {
          startsAt: p.startsAt ? new Date(p.startsAt) : null,
        }),
        ...(p.expiresAt !== undefined && {
          expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
        }),
        ...(p.isActive !== undefined && { isActive: p.isActive }),
      },
      include: { chain: chainSelect() },
    });

    return NextResponse.json({ deal });
  } catch (err) {
    console.error("[PATCH /api/admin/deals/[id]]", err);
    return errorJson("Failed to update deal", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  try {
    const { id } = await params;
    const existing = await db.deal.findUnique({ where: { id } });
    if (!existing) return errorJson("Deal not found", 404);

    // ?expire=1 soft-expires (keeps the row, hides it from the live feed);
    // otherwise hard-delete.
    if (req.nextUrl.searchParams.get("expire") === "1") {
      const deal = await db.deal.update({
        where: { id },
        data: { isActive: false, expiresAt: new Date() },
        include: { chain: chainSelect() },
      });
      return NextResponse.json({ deal });
    }

    await db.deal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/deals/[id]]", err);
    return errorJson("Failed to delete deal", 500);
  }
}
