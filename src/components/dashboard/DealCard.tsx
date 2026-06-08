"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Clock, ShieldAlert } from "lucide-react";
import type { ChainId } from "@/types/chain";
import { CHAINS } from "@/lib/constants";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  dealTypeLabel,
  discountTypeLabel,
  discountTypeBadgeVariant,
} from "@/lib/formatters";
import { timeUntil, dealHref } from "@/lib/utils";

type DealCardProps = {
  chainSlug: ChainId;
  title: string;
  description: string;
  dealType: string;
  discountType: string;
  expiresAt: Date;
  sourceUrl?: string | null;
  redeemUrl?: string | null;
  anchorText?: string | null;
  /** Set when this is the user's own extension-scraped offer. */
  userId?: string | null;
  /** False for auto-scraped deals an admin hasn't reviewed yet. */
  isVerified?: boolean;
  index?: number;
};

export function DealCard({
  chainSlug,
  title,
  description,
  dealType,
  discountType,
  expiresAt,
  sourceUrl,
  redeemUrl,
  anchorText,
  userId,
  isVerified,
  index = 0,
}: DealCardProps) {
  const chain = CHAINS[chainSlug];
  const href = dealHref({ sourceUrl, redeemUrl, anchorText, title }, chain);
  const ttl = timeUntil(expiresAt);
  const expiringSoon = expiresAt.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 2;
  const ctaLabel = redeemUrl ? "Redeem" : sourceUrl ? "View deal" : "Open in app";
  // Flag only global (not the user's own) deals that an admin hasn't reviewed.
  // "Yours" already conveys provenance for a user's own synced offers.
  const showUnverified = isVerified === false && !userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.015 }}
    >
      <Card className="group flex h-full flex-col overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ChainLogo slug={chainSlug} size="sm" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{chain.name}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{dealTypeLabel[dealType]}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {userId && (
              <Badge variant="success" title="Synced from your account — redeemable now">
                Yours
              </Badge>
            )}
            {showUnverified && (
              <Badge
                variant="muted"
                className="gap-1"
                title="Auto-detected from a public source — not yet verified by PointStash"
              >
                <ShieldAlert className="h-3 w-3" />
                Unverified
              </Badge>
            )}
            <Badge variant={discountTypeBadgeVariant[discountType] ?? "default"}>
              {discountTypeLabel[discountType]}
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex-1">
          <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div
            className={`flex items-center gap-1.5 text-xs ${
              expiringSoon ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Expires in {ttl}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-[var(--accent)] hover:text-[var(--accent-hover)] hover:bg-[rgba(245,158,11,0.08)]"
            onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
          >
            {ctaLabel}
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
