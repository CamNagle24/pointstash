import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chainSelect, parseIntParam, errorJson } from "@/lib/api";

export const runtime = "nodejs";

const categoryEnum = z.enum(["ENTREE", "SIDE", "DRINK", "DESSERT", "COMBO", "OTHER"]);
const sortEnum = z.enum(["value", "points", "name"]);

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const chain = url.searchParams.get("chain")?.trim() || undefined;
    const categoryRaw = url.searchParams.get("category")?.trim();
    const sortRaw = url.searchParams.get("sort") ?? "value";
    // Default 20 keeps a bare `?` call cheap, but the calculator/valuation
    // path needs the full cross-chain rate table — allow up to 500 so a
    // limit=500 request returns every chain's options (currently ~75 rows).
    const limit = parseIntParam(url.searchParams.get("limit"), 20, 500);

    const sortParsed = sortEnum.safeParse(sortRaw);
    if (!sortParsed.success) return errorJson("Invalid sort value", 400);

    let category: z.infer<typeof categoryEnum> | undefined;
    if (categoryRaw) {
      const c = categoryEnum.safeParse(categoryRaw);
      if (!c.success) return errorJson("Invalid category", 400);
      category = c.data;
    }

    const where: Prisma.RedemptionOptionWhereInput = {
      isAvailable: true,
      ...(chain && { chain: { slug: chain } }),
      ...(category && { category }),
    };

    const orderBy: Prisma.RedemptionOptionOrderByWithRelationInput =
      sortParsed.data === "value"
        ? { centsPerPoint: "desc" }
        : sortParsed.data === "points"
          ? { pointsCost: "asc" }
          : { itemName: "asc" };

    const rows = await db.redemptionOption.findMany({
      where,
      orderBy,
      take: limit,
      include: { chain: chainSelect() },
    });

    // The DB stores retail as a dollar Float (`estimatedRetailPrice`) but the
    // client contract (types/redemption.ts, the redeem table, valuation) is
    // cents-based. Convert here so the frontend gets `retailPriceCents` and
    // doesn't render `$NaN` from a missing field.
    const redemptions = rows.map(({ estimatedRetailPrice, ...rest }) => ({
      ...rest,
      retailPriceCents: Math.round(estimatedRetailPrice * 100),
    }));

    return NextResponse.json({ redemptions, total: redemptions.length });
  } catch (err) {
    console.error("[GET /api/redemptions]", err);
    return errorJson("Failed to load redemptions", 500);
  }
}
