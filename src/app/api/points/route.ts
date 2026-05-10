import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, errorJson } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const accounts = await db.account.findMany({
      where: { userId: guard.userId, isActive: true },
      include: {
        chain: {
          include: {
            redemptionOptions: {
              where: { isAvailable: true },
              orderBy: { centsPerPoint: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { currentPoints: "desc" },
    });

    const enriched = accounts.map((a) => {
      const best = a.chain.redemptionOptions[0];
      const cpp = best?.centsPerPoint ?? 0;
      const estimatedValue = +(((a.currentPoints * cpp) / 100).toFixed(2));
      return {
        accountId: a.id,
        chain: {
          name: a.chain.name,
          slug: a.chain.slug,
          logo: a.chain.logo,
          color: a.chain.color,
          pointsName: a.chain.pointsName,
        },
        currentPoints: a.currentPoints,
        estimatedValue,
        bestRedemption: best
          ? { itemName: best.itemName, centsPerPoint: best.centsPerPoint }
          : null,
        lastSynced: a.lastSynced,
      };
    });

    const totalPointsValue = +enriched.reduce((sum, a) => sum + a.estimatedValue, 0).toFixed(2);

    return NextResponse.json({
      totalAccounts: accounts.length,
      totalPointsValue,
      accounts: enriched,
    });
  } catch (err) {
    console.error("[GET /api/points]", err);
    return errorJson("Failed to load points summary", 500);
  }
}
