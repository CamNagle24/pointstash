import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export type ExtensionGuardResult =
  | { userId: string; tokenId: string }
  | { response: NextResponse };

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashExtensionToken(token: string): string {
  return sha256(token);
}

export function mintExtensionToken(): string {
  // 32 random bytes → 43-char url-safe string. Prefix encodes environment so
  // the extension popup can route it to the right base URL without asking.
  const random = crypto.randomBytes(32).toString("base64url");
  const env = process.env.NODE_ENV === "production" ? "live" : "dev";
  return `ps_${env}_${random}`;
}

export async function requireExtensionAuth(req: Request): Promise<ExtensionGuardResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { response: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }

  const token = match[1].trim();
  const record = await db.extensionToken.findUnique({
    where: { tokenHash: hashExtensionToken(token) },
  });

  if (!record || record.revokedAt) {
    return { response: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }

  // Best-effort touch — we don't await it because lastUsedAt is informational.
  db.extensionToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { userId: record.userId, tokenId: record.id };
}
