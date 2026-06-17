import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, parseIntParam, errorJson } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const url = req.nextUrl;
    const accountId = url.searchParams.get("accountId") ?? undefined;
    const limit = parseIntParam(url.searchParams.get("limit"), 50, 200);
    const offset = parseIntParam(url.searchParams.get("offset"), 0);

    if (accountId) {
      const owned = await db.account.findFirst({
        where: { id: accountId, userId: guard.userId },
        select: { userId: true },
      });
      if (!owned) return errorJson("Account not found", 404);
    }

    const where = {
      userId: guard.userId,
      ...(accountId ? { accountId } : {}),
    };

    const [history, total] = await Promise.all([
      db.pointsHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          account: {
            select: {
              id: true,
              chain: { select: { name: true, slug: true, logo: true, pointsName: true } },
            },
          },
        },
      }),
      db.pointsHistory.count({ where }),
    ]);

    return NextResponse.json({ history, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/points/history]", err);
    return errorJson("Failed to load history", 500);
  }
}
