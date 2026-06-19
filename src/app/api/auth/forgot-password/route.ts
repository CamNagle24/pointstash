import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorJson } from "@/lib/api";
import {
  hashResetToken,
  mintResetToken,
  resetTokenExpiry,
  sendResetEmail,
} from "@/lib/reset-tokens";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

// Cap on tokens minted per user per rolling hour. Keeps a known email from
// being spammed with reset mail while staying invisible to the caller — we
// still return { ok: true } once the cap is hit, same as any other branch
// here, so the response never reveals whether the limit was the reason.
const MAX_RESET_TOKENS_PER_HOUR = 3;

// POST /api/auth/forgot-password
//
// Always responds 200 — even when the email isn't registered or the user
// signed up via Google (no password to reset). Leaking which emails exist is
// a real account-enumeration vector, and the cost of opaqueness here is tiny.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid email", 400);
    }

    const user = await db.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, email: true, name: true, password: true },
    });

    // Only mint + send if there's a credentials user. Google-only accounts
    // don't have a password to reset, but we still don't expose that fact.
    if (user && user.password) {
      const recentTokenCount = await db.passwordResetToken.count({
        where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
      });
      if (recentTokenCount >= MAX_RESET_TOKENS_PER_HOUR) {
        return NextResponse.json({ ok: true });
      }

      const token = mintResetToken();
      try {
        // Invalidate any outstanding reset tokens so an attacker who got a
        // previous email can't race a legitimate reset request.
        await db.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
          data: { usedAt: new Date() },
        });
        await db.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashResetToken(token),
            expiresAt: resetTokenExpiry(),
          },
        });
        await sendResetEmail({ to: user.email, token, name: user.name });
      } catch (err) {
        // Log but still return 200 — the user shouldn't be able to tell
        // whether the email infra is up.
        console.error("[POST /api/auth/forgot-password] send failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    // Even on a thrown error we return 200 to preserve enumeration safety.
    return NextResponse.json({ ok: true });
  }
}
