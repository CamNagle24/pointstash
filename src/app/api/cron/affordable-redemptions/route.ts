import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronRequest, errorJson } from "@/lib/api";
import { affordableAlertKey, findNewlyAffordableAccounts, type AffordableAccount } from "@/lib/affordable-alerts";
import { sendAffordableRedemptionEmail, type AffordableRedemptionItem } from "@/lib/affordable-alert-email";
import type { RedemptionOption } from "@/types/redemption";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET /api/cron/affordable-redemptions
// Daily Vercel cron. Emails each opted-in user (notifyAffordable) about
// accounts that have newly crossed into affording their chain's best
// redemption. Per the no-re-arming design (docs/DECISIONS.md), each
// (account, redemptionOption) pair is alerted at most once ever — enforced
// here by excluding pairs already recorded in AffordabilityAlert and relying
// on its @@unique constraint as a backstop against races.
export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return errorJson("Unauthorized", 401);
  }

  try {
    const [accountRows, redemptionRows] = await Promise.all([
      db.account.findMany({
        where: { isActive: true, user: { notifyAffordable: true } },
        select: {
          id: true,
          userId: true,
          chainId: true,
          currentPoints: true,
          chain: { select: { slug: true, name: true } },
          user: { select: { email: true, name: true } },
        },
      }),
      db.redemptionOption.findMany({
        where: { isAvailable: true },
        select: {
          id: true,
          chainId: true,
          itemName: true,
          pointsCost: true,
          estimatedRetailPrice: true,
          centsPerPoint: true,
          category: true,
        },
      }),
    ]);

    const accounts: AffordableAccount[] = accountRows.map((a) => ({
      id: a.id,
      userId: a.userId,
      chainId: a.chainId,
      chainSlug: a.chain.slug,
      chainName: a.chain.name,
      currentPoints: a.currentPoints,
    }));

    const redemptionOptions: RedemptionOption[] = redemptionRows.map((r) => ({
      id: r.id,
      chainId: r.chainId,
      itemName: r.itemName,
      pointsCost: r.pointsCost,
      retailPriceCents: Math.round(r.estimatedRetailPrice * 100),
      centsPerPoint: r.centsPerPoint,
      category: r.category,
    }));

    const accountIds = accounts.map((a) => a.id);
    const alertedRows = accountIds.length
      ? await db.affordabilityAlert.findMany({
          where: { accountId: { in: accountIds } },
          select: { accountId: true, redemptionOptionId: true },
        })
      : [];
    const alreadyAlerted = new Set(
      alertedRows.map((r) => affordableAlertKey(r.accountId, r.redemptionOptionId)),
    );

    const candidates = findNewlyAffordableAccounts(accounts, redemptionOptions, alreadyAlerted);

    const userInfoById = new Map<string, { email: string; name: string | null }>();
    for (const a of accountRows) {
      userInfoById.set(a.userId, { email: a.user.email, name: a.user.name });
    }

    type Grouped = {
      userId: string;
      email: string;
      name: string | null;
      items: AffordableRedemptionItem[];
      pairs: { accountId: string; redemptionOptionId: string }[];
    };
    const groupedByUser = new Map<string, Grouped>();
    for (const c of candidates) {
      const info = userInfoById.get(c.account.userId);
      if (!info) continue;
      const group =
        groupedByUser.get(c.account.userId) ??
        ({ userId: c.account.userId, email: info.email, name: info.name, items: [], pairs: [] } as Grouped);
      group.items.push({
        chainSlug: c.account.chainSlug,
        chainName: c.account.chainName,
        itemName: c.redemptionOption.itemName,
        pointsCost: c.redemptionOption.pointsCost,
      });
      group.pairs.push({ accountId: c.account.id, redemptionOptionId: c.redemptionOption.id });
      groupedByUser.set(c.account.userId, group);
    }

    let sent = 0;
    let logged = 0;
    const errors: string[] = [];
    for (const group of groupedByUser.values()) {
      try {
        const result = await sendAffordableRedemptionEmail({
          to: group.email,
          name: group.name,
          userId: group.userId,
          items: group.items,
        });
        if (result === "sent") sent += 1;
        else logged += 1;

        // Records fire-once-ever rows; @@unique([accountId, redemptionOptionId])
        // backstops against a pair slipping through `alreadyAlerted` on a race.
        await db.affordabilityAlert.createMany({
          data: group.pairs.map((p) => ({
            accountId: p.accountId,
            userId: group.userId,
            redemptionOptionId: p.redemptionOptionId,
          })),
          skipDuplicates: true,
        });
      } catch (e) {
        errors.push(`${group.email}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      sent,
      logged,
      errors,
    });
  } catch (err) {
    console.error("[GET /api/cron/affordable-redemptions]", err);
    return errorJson("Cron job failed", 500);
  }
}
