import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(value: number): string {
  return value.toLocaleString();
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatCurrencyDollars(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

export function pointsToCents(points: number, valuePerPoint: number): number {
  return points * valuePerPoint * 100;
}

export function pointsToDollars(points: number, valuePerPoint: number): number {
  return points * valuePerPoint;
}

/**
 * Verbose, user-facing expiration label.
 *   3 days remaining  → "Expires in 3 days"
 *   1 day             → "Expires in 1 day"
 *   <24h, same calendar day or later → "Expires today!"
 *   past              → "Expired"
 */
export function getExpirationLabel(date: Date | string, now: Date = new Date()): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = target.getTime() - now.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (ms < 0) return "Expired";
  if (days <= 0) return "Expires today!";
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

/**
 * Best available link for a deal, most specific first. Where there's a page the
 * offer actually lives on, we append `#ps-deal=<anchor>` — a fragment the
 * extension's scroll-to-deal content script uses to find + highlight the exact
 * offer element on the (logged-in) page.
 *   1. redeemUrl — the explicit redeemable page (extension-scraped or
 *      hand-curated). Gets the scroll anchor.
 *   2. sourceUrl — the deal's announcement/source page (LLM-extracted deals).
 *      Opened as-is; there's no specific element to scroll to on an article.
 *   3. chain.appDeepLink — the chain's rewards/offers page. App-exclusive
 *      loyalty offers have no per-offer URL, but the offer title appears on the
 *      logged-in rewards page, so we still attach the scroll anchor and let the
 *      content script find it (no-op + plain page if it can't).
 *   4. bare domain — no known rewards page, nothing meaningful to scroll to.
 */
export function dealHref(
  deal: {
    sourceUrl?: string | null;
    redeemUrl?: string | null;
    anchorText?: string | null;
    title?: string | null;
  },
  chain: { appDeepLink?: string; domain: string },
): string {
  const anchor = deal.anchorText ?? deal.title ?? "";
  const withAnchor = (base: string) =>
    anchor ? `${base}#ps-deal=${encodeURIComponent(anchor)}` : base;

  if (deal.redeemUrl) return withAnchor(deal.redeemUrl);
  if (deal.sourceUrl) return deal.sourceUrl;
  if (chain.appDeepLink) return withAnchor(chain.appDeepLink);
  return `https://${chain.domain}`;
}

export function timeUntil(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${Math.max(mins, 1)}m`;
}

export function timeAgo(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = Date.now() - target.getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return target.toLocaleDateString();
}
