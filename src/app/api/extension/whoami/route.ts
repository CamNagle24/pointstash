import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireExtensionAuth } from "@/lib/extension-auth";
import { errorJson } from "@/lib/api";

export const runtime = "nodejs";

// GET /api/extension/whoami
// Auth: Bearer token from the extension. Used during the pair flow so the
// extension can confirm the token is valid and learn the user's email to show
// in the popup.
export async function GET(req: Request) {
  const guard = await requireExtensionAuth(req);
  if ("response" in guard) return guard.response;

  const user = await db.user.findUnique({
    where: { id: guard.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return errorJson("User not found", 404);

  return NextResponse.json({ userId: user.id, email: user.email, name: user.name });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}
