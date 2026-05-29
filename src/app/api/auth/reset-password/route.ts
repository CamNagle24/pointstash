import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { errorJson } from "@/lib/api";
import { hashResetToken } from "@/lib/reset-tokens";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/auth/reset-password
//
// Consumes a one-time reset token and sets a new password. Unlike the
// /forgot-password endpoint, we *do* return specific errors here — the user
// is acting on a token from their inbox and needs to know why it didn't work.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(parsed.data.token) },
    });

    if (!record) return errorJson("Reset link is invalid", 400);
    if (record.usedAt) return errorJson("Reset link has already been used", 400);
    if (record.expiresAt < new Date()) return errorJson("Reset link has expired", 400);

    const hashed = await bcrypt.hash(parsed.data.password, 10);

    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Burn every other outstanding token for this user too. If they
      // initiated multiple resets, only the one they just completed should
      // remain consumable.
      db.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    return errorJson("Failed to reset password", 500);
  }
}
