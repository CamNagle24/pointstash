import { CHAINS } from "@/lib/constants";
import { dealHref } from "@/lib/utils";
import type { ChainId } from "@/types/chain";

// How close to expiry a deal must be to trigger a reminder. With a daily cron a
// 24h window means each deal is reminded ~once — on the run within a day of its
// expiry — without needing to persist a "last reminded" timestamp.
export const REMINDER_WINDOW_HOURS = 24;

export interface ReminderUser {
  id: string;
  email: string;
  name: string | null;
  /** Slugs of the chains this user has linked accounts for. */
  chainSlugs: string[];
}

export interface ReminderDeal {
  id: string;
  /** null = global deal; set = this user's personal (EXTENSION) deal. */
  userId: string | null;
  title: string;
  expiresAt: Date;
  chainSlug: string;
  chainName: string;
  redeemUrl: string | null;
  anchorText: string | null;
  sourceUrl: string | null;
}

export interface UserReminder {
  user: ReminderUser;
  deals: ReminderDeal[];
}

/** True if `deal` expires within `windowHours` from `now` (and isn't already expired). */
export function isExpiringSoon(
  deal: ReminderDeal,
  now: Date,
  windowHours = REMINDER_WINDOW_HOURS,
): boolean {
  const ms = deal.expiresAt.getTime() - now.getTime();
  return ms > 0 && ms <= windowHours * 60 * 60 * 1000;
}

/**
 * For each user, the soon-expiring deals relevant to them: their own personal
 * (EXTENSION) deals plus global deals for chains they've linked. Users with no
 * relevant expiring deal are omitted, so the caller only emails people who have
 * something to act on. Each user's deals are sorted soonest-expiry first.
 */
export function groupExpiringDealsByUser(
  users: ReminderUser[],
  deals: ReminderDeal[],
  now: Date,
  windowHours = REMINDER_WINDOW_HOURS,
): UserReminder[] {
  const soon = deals.filter((d) => isExpiringSoon(d, now, windowHours));
  const out: UserReminder[] = [];
  for (const user of users) {
    const linked = new Set(user.chainSlugs);
    const relevant = soon
      .filter(
        (d) => d.userId === user.id || (d.userId === null && linked.has(d.chainSlug)),
      )
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
    if (relevant.length > 0) out.push({ user, deals: relevant });
  }
  return out;
}

/** Absolute link to where the deal is redeemable, with the scroll anchor. */
export function reminderDealLink(deal: ReminderDeal): string {
  const chain = CHAINS[deal.chainSlug as ChainId];
  if (!chain) return deal.redeemUrl ?? deal.sourceUrl ?? "";
  return dealHref(
    {
      sourceUrl: deal.sourceUrl,
      redeemUrl: deal.redeemUrl,
      anchorText: deal.anchorText,
      title: deal.title,
    },
    chain,
  );
}

/** Short "in 5h" / "in 1h" / "in 30m" label for a deal's time-to-expiry. */
export function expiresInLabel(deal: ReminderDeal, now: Date): string {
  const ms = deal.expiresAt.getTime() - now.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `in ${hours}h`;
  const mins = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `in ${mins}m`;
}
