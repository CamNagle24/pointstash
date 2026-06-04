import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronRequest, errorJson } from "@/lib/api";
import {
  groupExpiringDealsByUser,
  REMINDER_WINDOW_HOURS,
  type ReminderDeal,
  type ReminderUser,
} from "@/lib/deal-reminders";
import { sendExpiringDealsEmail } from "@/lib/deal-reminder-email";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET /api/cron/deal-reminders
// Daily Vercel cron. Emails each opted-in user (notifyExpiring) the deals that
// are within REMINDER_WINDOW_HOURS of expiring and relevant to them — their own
// extension-scraped offers plus global deals for chains they've linked.
export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return errorJson("Unauthorized", 401);
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  try {
    const [userRows, dealRows] = await Promise.all([
      db.user.findMany({
        where: { notifyExpiring: true },
        select: {
          id: true,
          email: true,
          name: true,
          accounts: {
            where: { isActive: true },
            select: { chain: { select: { slug: true } } },
          },
        },
      }),
      db.deal.findMany({
        where: { isActive: true, expiresAt: { gt: now, lte: cutoff } },
        select: {
          id: true,
          userId: true,
          title: true,
          expiresAt: true,
          redeemUrl: true,
          anchorText: true,
          sourceUrl: true,
          chain: { select: { slug: true, name: true } },
        },
      }),
    ]);

    const users: ReminderUser[] = userRows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      chainSlugs: u.accounts.map((a) => a.chain.slug),
    }));

    const deals: ReminderDeal[] = dealRows.map((d) => ({
      id: d.id,
      userId: d.userId,
      title: d.title,
      // Windowed by the query above, so expiresAt is always present here.
      expiresAt: d.expiresAt as Date,
      chainSlug: d.chain.slug,
      chainName: d.chain.name,
      redeemUrl: d.redeemUrl,
      anchorText: d.anchorText,
      sourceUrl: d.sourceUrl,
    }));

    const reminders = groupExpiringDealsByUser(users, deals, now);

    let sent = 0;
    let logged = 0;
    const errors: string[] = [];
    for (const r of reminders) {
      try {
        const result = await sendExpiringDealsEmail({
          to: r.user.email,
          name: r.user.name,
          deals: r.deals,
          now,
        });
        if (result === "sent") sent += 1;
        else logged += 1;
      } catch (e) {
        errors.push(`${r.user.email}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      windowHours: REMINDER_WINDOW_HOURS,
      candidates: reminders.length,
      sent,
      logged,
      errors,
    });
  } catch (err) {
    console.error("[GET /api/cron/deal-reminders]", err);
    return errorJson("Cron job failed", 500);
  }
}
