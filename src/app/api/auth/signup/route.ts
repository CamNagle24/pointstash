import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errorJson, getClientIp, hashClientIp } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(80).optional(),
});

// Unlike forgot-password, there's no account-enumeration concern here, so the
// cap can be disclosed in the 429 response.
const MAX_SIGNUPS_PER_IP_PER_HOUR = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const ipHash = hashClientIp(getClientIp(req));
    const recentAttempts = await db.signupAttempt.count({
      where: { ipHash, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recentAttempts >= MAX_SIGNUPS_PER_IP_PER_HOUR) {
      return errorJson("Too many signup attempts. Please try again later.", 429);
    }
    await db.signupAttempt.create({ data: { ipHash } });

    const { email, password, name } = parsed.data;
    const hashed = await bcrypt.hash(password, 10);

    try {
      const user = await db.user.create({
        data: { email, password: hashed, name },
        select: { id: true, email: true, name: true },
      });
      return NextResponse.json(user, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return errorJson("An account with that email already exists", 409);
      }
      throw err;
    }
  } catch (err) {
    console.error("[POST /api/auth/signup]", err);
    return errorJson("Failed to create account", 500);
  }
}
