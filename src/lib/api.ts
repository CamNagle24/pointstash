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
  const header = req.headers.get("authorization");
  return header === `Bearer ${process.env.CRON_SECRET}`;
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
