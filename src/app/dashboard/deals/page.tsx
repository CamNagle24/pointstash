"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Filter, Loader2, AlertCircle, Search, Clock, LayoutGrid, CalendarDays } from "lucide-react";
import { CHAINS, CHAIN_IDS } from "@/lib/constants";
import { useDeals } from "@/hooks/useDeals";
import { useAccounts } from "@/hooks/useAccounts";
import { syncOffers } from "@/lib/extension-bridge";
import { DealCard } from "@/components/dashboard/DealCard";
import { DealsCalendar } from "@/components/dashboard/DealsCalendar";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/DropdownMenu";
import { dealTypeLabel } from "@/lib/formatters";
import type { ChainId } from "@/types/chain";
import { cn } from "@/lib/utils";

const dealTypes = ["APP_EXCLUSIVE", "IN_STORE", "ONLINE", "REWARD_MEMBER"];

export default function DealsPage() {
  const { deals, error, isLoading, mutate } = useDeals();
  const { accounts } = useAccounts();

  // On mount, ask the extension to harvest the user's redeemable offers from
  // any open chain tabs; refresh the feed if it synced anything. Quietly no-ops
  // when the extension isn't installed or no chain tab is open.
  React.useEffect(() => {
    let cancelled = false;
    syncOffers().then((res) => {
      if (!cancelled && res.synced.length > 0) mutate();
    });
    return () => {
      cancelled = true;
    };
  }, [mutate]);
  const [chainFilter, setChainFilter] = React.useState<Set<ChainId>>(new Set());

  // Personalize the feed: once the user's linked accounts load, default the
  // chain filter to the chains they actually track. Seeded once so it never
  // fights the user's own filter clicks; "All chains" clears it to show every
  // chain. Users with no linked accounts keep the unfiltered (all chains) view.
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (seededRef.current || accounts.length === 0) return;
    const linked = accounts
      .map((a) => a.chain.slug as ChainId)
      .filter((slug) => CHAINS[slug]);
    if (linked.length > 0) {
      seededRef.current = true;
      setChainFilter(new Set(linked));
    }
  }, [accounts]);
  const [typeFilter, setTypeFilter] = React.useState<Set<string>>(new Set());
  const [endingSoon, setEndingSoon] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list");

  const filtered = React.useMemo(() => {
    const soonCutoff = Date.now() + 1000 * 60 * 60 * 24 * 7;
    return deals.filter((d) => {
      const slug = (d.chain?.slug ?? "") as ChainId;
      if (chainFilter.size > 0 && !chainFilter.has(slug)) return false;
      if (typeFilter.size > 0 && !typeFilter.has(d.dealType)) return false;
      if (endingSoon && !(d.expiresAt && new Date(d.expiresAt).getTime() <= soonCutoff)) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${d.title} ${d.description ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [deals, chainFilter, typeFilter, endingSoon, search]);

  const toggleChain = (id: ChainId) => {
    setChainFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleType = (t: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 pb-24 md:p-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Live offers
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          This week&apos;s deals
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {isLoading
            ? "Loading deals…"
            : `${filtered.length} active deal${filtered.length === 1 ? "" : "s"} ${
                chainFilter.size > 0 ? "for your chains" : "across all chains"
              }`}
        </p>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant={endingSoon ? "primary" : "outline"}
            size="md"
            className="gap-2 whitespace-nowrap"
            onClick={() => setEndingSoon((v) => !v)}
          >
            <Clock className="h-4 w-4" />
            Ending soon
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="md" className="gap-2">
                <Filter className="h-4 w-4" />
                Type
                {typeFilter.size > 0 && (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] text-[#0a0a0b]">
                    {typeFilter.size}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by deal type</DropdownMenuLabel>
              {dealTypes.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={typeFilter.has(t)}
                  onCheckedChange={() => toggleType(t)}
                >
                  {dealTypeLabel[t]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex rounded-xl border border-[var(--border)] p-0.5">
            {([
              ["list", LayoutGrid, "List"],
              ["calendar", CalendarDays, "Calendar"],
            ] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                aria-label={`${label} view`}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === m
                    ? "bg-[var(--accent)] text-[#0a0a0b]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setChainFilter(new Set())}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              chainFilter.size === 0
                ? "border-[var(--accent)] bg-[rgba(245,158,11,0.12)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
            )}
          >
            All chains
          </button>
          {CHAIN_IDS.map((id) => {
            const active = chainFilter.has(id);
            const chain = CHAINS[id];
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => toggleChain(id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                  active
                    ? "border-transparent text-[#0a0a0b]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                )}
                style={
                  active ? { background: chain.color, boxShadow: `0 0 0 2px ${chain.color}33` } : undefined
                }
              >
                <ChainLogo slug={id} size="xs" />
                {chain.shortName}
              </motion.button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] py-20 text-center">
          <AlertCircle className="h-6 w-6 text-[var(--danger)]" />
          <p className="text-sm text-[var(--danger)]">{error.message}</p>
        </div>
      ) : viewMode === "calendar" ? (
        <DealsCalendar deals={filtered} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
          <p className="font-display text-lg font-semibold">No deals match those filters</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {deals.length === 0
              ? "The scraper hasn't run yet — check back after 6 AM CT."
              : "Try clearing chain filters or searching a different keyword."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((deal, i) => (
            <DealCard
              key={deal.id}
              chainSlug={(deal.chain?.slug ?? "mcdonalds") as ChainId}
              title={deal.title}
              description={deal.description ?? ""}
              dealType={deal.dealType}
              discountType={deal.discountType}
              expiresAt={deal.expiresAt ? new Date(deal.expiresAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)}
              sourceUrl={deal.sourceUrl}
              redeemUrl={deal.redeemUrl}
              anchorText={deal.anchorText}
              userId={deal.userId}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
