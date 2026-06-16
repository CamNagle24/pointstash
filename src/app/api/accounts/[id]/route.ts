import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, chainSelect, errorJson } from "@/lib/api";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    currentPoints: z.number().int().nonnegative().optional(),
    loyaltyId: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update",
  });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const account = await db.account.findFirst({ where: { id, userId: guard.userId } });
    if (!account) return errorJson("Account not found", 404);

    const pointsChanged =
      parsed.data.currentPoints !== undefined &&
      parsed.data.currentPoints !== account.currentPoints;

    const updated = await db.$transaction(async (tx) => {
      if (pointsChanged) {
        await tx.pointsHistory.create({
          data: {
            accountId: account.id,
            userId: account.userId,
            previousPoints: account.currentPoints,
            newPoints: parsed.data.currentPoints!,
            changeReason: "MANUAL_UPDATE",
          },
        });
      }
      return tx.account.update({
        where: { id: account.id },
        data: {
          ...(parsed.data.currentPoints !== undefined && {
            currentPoints: parsed.data.currentPoints,
          }),
          ...(parsed.data.loyaltyId !== undefined && { loyaltyId: parsed.data.loyaltyId }),
          ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
          ...(pointsChanged && { lastSynced: new Date() }),
        },
        include: { chain: chainSelect() },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/accounts/:id]", err);
    return errorJson("Failed to update account", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const account = await db.account.findFirst({ where: { id, userId: guard.userId } });
    if (!account) return errorJson("Account not found", 404);

    await db.account.update({
      where: { id: account.id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/accounts/:id]", err);
    return errorJson("Failed to delete account", 500);
  }
}
