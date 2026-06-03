"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { Deal } from "@/types/deal";
import type { ChainId } from "@/types/chain";
import { CHAINS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { dealHref, cn } from "@/lib/utils";

// ─── date helpers (local, day-granularity) ──────────────────────────────────
const DAY = 86_400_000;
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number) => new Date(startOfDay(d).getTime() + n * DAY);
const startOfWeek = (d: Date) => addDays(d, -startOfDay(d).getDay()); // Sunday
const startOfMonth = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FMT = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const DAY_CAP = 4; // max deals shown per day in week view before "+N more"
const MONTH_DAY_CAP = 3; // max deals shown per day cell in month view before "+N more"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Effective savings as a fraction of price (0–1), so deals rank on real value
 * rather than just their kind: a 60%-off beats a BOGO (≈50%), which beats a
 * 30%-off. Concrete prices win when present; otherwise we estimate from the
 * discount kind, reading the actual percentage out of % deals when stated.
 */
function savingsFraction(deal: Deal): number {
  if (deal.originalPrice && deal.dealPrice != null && deal.originalPrice > 0) {
    return clamp01((deal.originalPrice - deal.dealPrice) / deal.originalPrice);
  }
  switch (deal.discountType) {
    case "FREE_ITEM":
      return 1;
    case "PERCENTAGE_OFF": {
      const m = `${deal.title} ${deal.description ?? ""}`.match(/(\d{1,3})\s*%/);
      return clamp01(m ? Number(m[1]) / 100 : 0.3);
    }
    case "BOGO":
      return 0.5;
    case "DOLLAR_OFF":
      return 0.2;
    case "POINTS_MULTIPLIER":
      return 0.1;
    default:
      return 0;
  }
}

/** Higher = better deal. Integer score derived from effective savings. */
function dealScore(deal: Deal): number {
  return Math.round(savingsFraction(deal) * 1000);
}

type Span = { deal: Deal; slug: ChainId; start: Date; end: Date };

/** A deal with a usable [start, expiry] window becomes a calendar span. */
function toSpan(deal: Deal): Span | null {
  if (!deal.expiresAt) return null;
  const end = startOfDay(new Date(deal.expiresAt));
  const rawStart = deal.startsAt ?? deal.createdAt;
  let start = rawStart ? startOfDay(new Date(rawStart)) : end;
  if (start.getTime() > end.getTime()) start = end;
  return { deal, slug: (deal.chain?.slug ?? "mcdonalds") as ChainId, start, end };
}

function openDeal(deal: Deal, slug: ChainId) {
  const href = dealHref(deal, CHAINS[slug]);
  window.open(href, "_blank", "noopener,noreferrer");
}

/** Deals active on `day`, best-deal first (soonest-expiring breaks ties). */
function dealsOnDay(spans: Span[], day: Date): Span[] {
  return spans
    .filter((s) => s.start.getTime() <= day.getTime() && s.end.getTime() >= day.getTime())
    .sort((a, b) => dealScore(b.deal) - dealScore(a.deal) || a.end.getTime() - b.end.getTime());
}

export function DealsCalendar({ deals }: { deals: Deal[] }) {
  const [mode, setMode] = React.useState<"month" | "week">("month");
  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const spans = React.useMemo(
    () => deals.map(toSpan).filter((s): s is Span => s !== null),
    [deals],
  );
  const undated = React.useMemo(() => deals.filter((d) => !d.expiresAt), [deals]);

  const shift = (dir: 1 | -1) => {
    setAnchor((a) => {
      if (mode === "week") return addDays(a, 7 * dir);
      const x = startOfMonth(a);
      x.setMonth(x.getMonth() + dir);
      return x;
    });
  };

  const heading =
    mode === "month"
      ? MONTH_FMT.format(anchor)
      : (() => {
          const ws = startOfWeek(anchor);
          const we = addDays(ws, 6);
          return `${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${we.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
        })();

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(today)}>
            Today
          </Button>
          <h2 className="ml-1 font-display text-lg font-semibold">{heading}</h2>
        </div>
        <div className="flex rounded-xl border border-[var(--border)] p-0.5">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors",
                mode === m
                  ? "bg-[var(--accent)] text-[#0a0a0b]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "month" ? (
        <MonthView
          anchor={anchor}
          today={today}
          spans={spans}
          onZoomToWeek={(day) => {
            setAnchor(day);
            setMode("week");
          }}
        />
      ) : (
        <WeekView anchor={anchor} today={today} spans={spans} />
      )}

      {undated.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          + {undated.length} ongoing deal{undated.length === 1 ? "" : "s"} with no end date — switch
          to list view to see {undated.length === 1 ? "it" : "them"}.
        </p>
      )}
    </div>
  );
}

function MonthView({
  anchor,
  today,
  spans,
  onZoomToWeek,
}: {
  anchor: Date;
  today: Date;
  spans: Span[];
  onZoomToWeek: (day: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  // 6 weeks × 7 days covers any month layout.
  const days = React.useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          // Each day cell independently lists its own best deals, so ranking
          // can differ day-to-day and a day with active deals is never blank.
          const dayDeals = dealsOnDay(spans, day);
          const visible = dayDeals.slice(0, MONTH_DAY_CAP);
          const hidden = dayDeals.length - visible.length;
          const isToday = isSameDay(day, today);
          const inMonth = day.getMonth() === monthStart.getMonth();
          const lastCol = i % 7 === 6;
          const lastRow = i >= 35;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[112px] flex-col gap-1 p-1",
                !lastCol && "border-r border-[var(--border)]",
                !lastRow && "border-b border-[var(--border)]",
                !inMonth && "bg-[var(--bg-secondary)]/40",
              )}
            >
              <button
                type="button"
                onClick={() => onZoomToWeek(day)}
                className="self-start rounded-full transition-colors"
                aria-label={`Open week of ${day.toDateString()}`}
              >
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs",
                    isToday && "bg-[var(--accent)] font-semibold text-[#0a0a0b]",
                    !isToday && inMonth && "text-[var(--text-primary)]",
                    !inMonth && "text-[var(--text-muted)]",
                  )}
                >
                  {day.getDate()}
                </span>
              </button>

              <div className="flex flex-col gap-0.5">
                {visible.map((s) => {
                  const chain = CHAINS[s.slug];
                  return (
                    <button
                      key={s.deal.id}
                      type="button"
                      title={`${chain.name}: ${s.deal.title}`}
                      onClick={() => openDeal(s.deal, s.slug)}
                      className="flex items-center gap-1 overflow-hidden rounded py-0.5 pr-1 text-left text-[11px] font-medium leading-tight text-[#0a0a0b]"
                      style={{ background: chain.color }}
                    >
                      <ChainLogo slug={s.slug} size="xs" className="shrink-0" />
                      <span className="truncate">{s.deal.title}</span>
                    </button>
                  );
                })}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => onZoomToWeek(day)}
                    className="px-1 text-left text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  >
                    + {hidden} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ anchor, today, spans }: { anchor: Date; today: Date; spans: Span[] }) {
  const weekStart = startOfWeek(anchor);
  const weekStartMs = weekStart.getTime();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  // Which days have had their "+N more" expanded. Keyed by column index.
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());

  // Re-collapse everything when the week changes so stale state doesn't linger.
  React.useEffect(() => setExpanded(new Set()), [weekStartMs]);

  return (
    <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
      {days.map((day, di) => {
        // Active that day, best deal first, then soonest-expiring as tiebreak.
        const dayDeals = dealsOnDay(spans, day);
        const isToday = isSameDay(day, today);
        const isOpen = expanded.has(di);
        const shown = isOpen ? dayDeals : dayDeals.slice(0, DAY_CAP);
        const hidden = dayDeals.length - shown.length;

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex gap-3 p-3 sm:gap-4",
              isToday && "bg-[rgba(245,158,11,0.06)]",
            )}
          >
            {/* date gutter */}
            <div className="w-14 shrink-0 text-center">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {WEEKDAYS[day.getDay()]}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-base font-semibold",
                  isToday ? "bg-[var(--accent)] text-[#0a0a0b]" : "text-[var(--text-primary)]",
                )}
              >
                {day.getDate()}
              </div>
            </div>

            {/* deals for the day */}
            <div className="min-w-0 flex-1 space-y-1.5 self-center">
              {dayDeals.length === 0 ? (
                <p className="py-1 text-xs text-[var(--text-muted)]">No deals active</p>
              ) : (
                <>
                  {shown.map((s) => {
                    const chain = CHAINS[s.slug];
                    const lastDay = isSameDay(day, s.end);
                    const isNew = isSameDay(day, s.start);
                    return (
                      <button
                        key={s.deal.id}
                        type="button"
                        onClick={() => openDeal(s.deal, s.slug)}
                        className="group flex w-full items-center gap-2.5 rounded-lg border-l-[3px] bg-[var(--bg-secondary)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
                        style={{ borderLeftColor: chain.color }}
                      >
                        <ChainLogo slug={s.slug} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium leading-snug">
                            {s.deal.title}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">{chain.name}</span>
                        </span>
                        {isNew && (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]">
                            New
                          </span>
                        )}
                        {lastDay && (
                          <span className="shrink-0 rounded bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Last day
                          </span>
                        )}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  })}
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => new Set(prev).add(di))}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      + {hidden} more
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
