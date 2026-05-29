import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { chainSelect, errorJson } from "@/lib/api";
import { requireExtensionAuth } from "@/lib/extension-auth";

export const runtime = "nodejs";

const syncSchema = z.object({
  chainSlug: z.string().min(1),
  balance: z.number().int().nonnegative(),
  // Free-form per-chain payload (the raw API response). Stored on the history
  // note for debuggability if something looks wrong later.
  raw: z.unknown().optional(),
});

// POST /api/extension/sync
// Auth: Bearer token from the extension. Writes a balance update for the user
// behind the same Account/PointsHistory flow as manual entry, but marks the
// account syncMethod=API so the dashboard can show the "auto-synced" pill.
export async function POST(req: Request) {
  try {
    const guard = await requireExtensionAuth(req);
    if ("response" in guard) return guard.response;

    const body = await req.json().catch(() => null);
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const chain = await db.chain.findUnique({
      where: { slug: parsed.data.chainSlug },
      select: { id: true, slug: true },
    });
    if (!chain) return errorJson("Unknown chain", 404);

    // Look up the linked Account first so we can tell a brand-new connect
    // apart from an unchanged ping. (An upsert alone can't: its create branch
    // sets currentPoints to the balance, which then looks identical to a
    // no-op.)
    const existing = await db.account.findUnique({
      where: { userId_chainId: { userId: guard.userId, chainId: chain.id } },
    });

    if (!existing) {
      // First-ever sync for this chain. Create the account and seed an initial
      // 0 -> balance history row so the dashboard trend has a baseline point.
      const created = await db.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            userId: guard.userId,
            chainId: chain.id,
            currentPoints: parsed.data.balance,
            syncMethod: "API",
            lastSynced: new Date(),
          },
          include: { chain: chainSelect() },
        });
        await tx.pointsHistory.create({
          data: {
            accountId: account.id,
            userId: guard.userId,
            previousPoints: 0,
            newPoints: parsed.data.balance,
            changeReason: "SYNC",
            note: parsed.data.raw
              ? `extension:${JSON.stringify(parsed.data.raw).slice(0, 400)}`
              : "extension",
          },
        });
        return account;
      });
      return NextResponse.json({ updated: true, account: created });
    }

    // Existing account: reactivate if it was disconnected (soft-delete:
    // isActive=false), otherwise the new balance writes to a hidden record and
    // the dashboard never sees it.
    const account = existing;

    if (account.currentPoints === parsed.data.balance) {
      // No-op: don't pollute pointsHistory with identical-balance pings every
      // 6 hours. Still touch lastSynced so the dashboard shows fresh data.
      await db.account.update({
        where: { id: account.id },
        data: { lastSynced: new Date(), isActive: true },
      });
      return NextResponse.json({ updated: false, account });
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.pointsHistory.create({
        data: {
          accountId: account.id,
          userId: guard.userId,
          previousPoints: account.currentPoints,
          newPoints: parsed.data.balance,
          changeReason: "SYNC",
          note: parsed.data.raw ? `extension:${JSON.stringify(parsed.data.raw).slice(0, 400)}` : "extension",
        },
      });
      return tx.account.update({
        where: { id: account.id },
        data: {
          currentPoints: parsed.data.balance,
          lastSynced: new Date(),
          syncMethod: "API",
          // Reactivate if the user had previously disconnected this chain.
          isActive: true,
        },
        include: { chain: chainSelect() },
      });
    });

    return NextResponse.json({ updated: true, account: updated });
  } catch (err) {
    console.error("[POST /api/extension/sync]", err);
    return errorJson("Failed to sync balance", 500);
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
    },
  });
}
