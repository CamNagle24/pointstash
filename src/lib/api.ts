import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type GuardResult = { userId: string } | { response: NextResponse };

export async function requireAuth(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: session.user.id };
}

export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Parse ADMIN_EMAIL (comma-separated, trimmed, lowercased) into a set. */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAIL ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Gate a route to admin users. Fails closed: if ADMIN_EMAIL is unset (no
 * admins configured) every caller is rejected. Email gate is interim until a
 * real role column exists; the server is the source of truth (the client-side
 * NEXT_PUBLIC_ADMIN_EMAIL mirror is cosmetic only).
 */
export async function requireAdmin(): Promise<GuardResult> {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email?.trim().toLowerCase();
  if (!id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!email || !adminEmails().has(email)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: id };
}

export function errorJson(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

export function chainSelect() {
  return {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      color: true,
      pointsName: true,
    },
  } as const;
}

export function parseIntParam(value: string | null, fallback: number, max?: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return max !== undefined ? Math.min(n, max) : n;
}
