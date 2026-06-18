import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, chainSelect, errorJson } from "@/lib/api";

export const runtime = "nodejs";

const redeemSchema = z.object({
  redemptionOptionId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const account = await db.account.findFirst({ where: { id, userId: guard.userId } });
    if (!account) return errorJson("Account not found", 404);

    const option = await db.redemptionOption.findUnique({
      where: { id: parsed.data.redemptionOptionId },
    });
    if (!option || option.chainId !== account.chainId) {
      return errorJson("Redemption option not found for this account's chain", 400);
    }
    if (account.currentPoints < option.pointsCost) {
      return errorJson("Not enough points to redeem this option", 400);
    }

    const newPoints = account.currentPoints - option.pointsCost;

    const result = await db.$transaction(async (tx) => {
      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { currentPoints: newPoints, lastSynced: new Date() },
        include: { chain: chainSelect() },
      });
      const pointsHistory = await tx.pointsHistory.create({
        data: {
          accountId: account.id,
          userId: account.userId,
          previousPoints: account.currentPoints,
          newPoints,
          changeReason: "REDEMPTION",
          note: option.itemName,
        },
      });
      return { account: updatedAccount, pointsHistory };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/accounts/:id/redeem]", err);
    return errorJson("Failed to redeem", 500);
  }
}
