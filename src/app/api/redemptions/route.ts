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
    const limit = parseIntParam(url.searchParams.get("limit"), 20, 100);

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

    const redemptions = await db.redemptionOption.findMany({
      where,
      orderBy,
      take: limit,
      include: { chain: chainSelect() },
    });

    return NextResponse.json({ redemptions, total: redemptions.length });
  } catch (err) {
    console.error("[GET /api/redemptions]", err);
    return errorJson("Failed to load redemptions", 500);
  }
}
