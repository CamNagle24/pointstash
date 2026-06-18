import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, chainSelect, errorJson } from "@/lib/api";

export const runtime = "nodejs";

const updateSchema = z.object({
  accountId: z.string().min(1),
  newPoints: z.number().int().nonnegative(),
  reason: z
    .enum(["MANUAL_UPDATE", "PURCHASE", "REDEMPTION", "PROMOTION", "SYNC"])
    .optional(),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const account = await db.account.findFirst({
      where: { id: parsed.data.accountId, userId: guard.userId },
    });
    if (!account) return errorJson("Account not found", 404);

    const updated = await db.$transaction(async (tx) => {
      await tx.pointsHistory.create({
        data: {
          accountId: account.id,
          userId: guard.userId,
          previousPoints: account.currentPoints,
          newPoints: parsed.data.newPoints,
          changeReason: parsed.data.reason ?? "MANUAL_UPDATE",
          note: parsed.data.note,
        },
      });
      return tx.account.update({
        where: { id: account.id },
        data: {
          currentPoints: parsed.data.newPoints,
          lastSynced: new Date(),
        },
        include: { chain: chainSelect() },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/points/update]", err);
    return errorJson("Failed to update points", 500);
  }
}
