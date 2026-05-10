import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chainSelect, parseIntParam, errorJson } from "@/lib/api";

export const runtime = "nodejs";

const dealTypeEnum = z.enum(["APP_EXCLUSIVE", "IN_STORE", "ONLINE", "REWARD_MEMBER"]);
const sortEnum = z.enum(["expiring", "newest", "value"]);

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const chainsParam = url.searchParams.get("chain");
    const typeParam = url.searchParams.get("type");
    const activeOnly = url.searchParams.get("active") !== "false";
    const sortRaw = url.searchParams.get("sort") ?? "newest";
    const limit = parseIntParam(url.searchParams.get("limit"), 20, 100);
    const offset = parseIntParam(url.searchParams.get("offset"), 0);

    const sortParsed = sortEnum.safeParse(sortRaw);
    if (!sortParsed.success) {
      return errorJson("Invalid sort value", 400);
    }

    const chains = chainsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    const types = (typeParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [])
      .map((t) => dealTypeEnum.safeParse(t))
      .filter((p) => p.success)
      .map((p) => p.data!);

    const now = new Date();
    const where: Prisma.DealWhereInput = {
      ...(activeOnly && {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      }),
      ...(chains.length > 0 && { chain: { slug: { in: chains } } }),
      ...(types.length > 0 && { dealType: { in: types } }),
    };

    const orderBy: Prisma.DealOrderByWithRelationInput =
      sortParsed.data === "expiring"
        ? { expiresAt: { sort: "asc", nulls: "last" } }
        : sortParsed.data === "value"
          ? { pointsCost: "asc" }
          : { createdAt: "desc" };

    const [deals, total] = await Promise.all([
      db.deal.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: { chain: chainSelect() },
      }),
      db.deal.count({ where }),
    ]);

    return NextResponse.json({ deals, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/deals]", err);
    return errorJson("Failed to load deals", 500);
  }
}
