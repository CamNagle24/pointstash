import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, errorJson } from "@/lib/api";
import { hashExtensionToken, mintExtensionToken } from "@/lib/extension-auth";

export const runtime = "nodejs";

// POST /api/extension/pair
// Auth: NextAuth session (the dashboard page calls this on behalf of the
// logged-in user). Returns the bearer token exactly once — only the hash is
// stored. If the user has an existing un-revoked token, this revokes it so
// only one extension install is active at a time.
export async function POST() {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const token = mintExtensionToken();
    const tokenHash = hashExtensionToken(token);

    await db.$transaction([
      db.extensionToken.updateMany({
        where: { userId: guard.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      db.extensionToken.create({
        data: { userId: guard.userId, tokenHash },
      }),
    ]);

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[POST /api/extension/pair]", err);
    return errorJson("Failed to mint extension token", 500);
  }
}
