import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, errorJson } from "@/lib/api";

export const runtime = "nodejs";

const userSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  notifyExpiring: true,
  notifyDeals: true,
  notifyDigest: true,
  createdAt: true,
} as const;

export async function GET() {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const user = await db.user.findUnique({
      where: { id: guard.userId },
      select: userSelect,
    });
    if (!user) return errorJson("User not found", 404);

    return NextResponse.json(user);
  } catch (err) {
    console.error("[GET /api/user/me]", err);
    return errorJson("Failed to load user", 500);
  }
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    notifyExpiring: z.boolean().optional(),
    notifyDeals: z.boolean().optional(),
    notifyDigest: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const updated = await db.user.update({
      where: { id: guard.userId },
      data: parsed.data,
      select: userSelect,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/user/me]", err);
    return errorJson("Failed to update user", 500);
  }
}

export async function DELETE() {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    // Cascade deletes Account, PointsHistory, and ExtensionToken via the
    // onDelete: Cascade relations already defined in schema.prisma.
    await db.user.delete({ where: { id: guard.userId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/user/me]", err);
    return errorJson("Failed to delete account", 500);
  }
}
