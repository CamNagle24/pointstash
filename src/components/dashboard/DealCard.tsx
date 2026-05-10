"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Clock } from "lucide-react";
import type { ChainId } from "@/types/chain";
import { CHAINS } from "@/lib/constants";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  dealTypeLabel,
  dealTypeBadgeVariant,
  discountTypeLabel,
  discountTypeBadgeVariant,
} from "@/lib/formatters";
import { timeUntil } from "@/lib/utils";

type DealCardProps = {
  chainSlug: ChainId;
  title: string;
  description: string;
  dealType: string;
  discountType: string;
  expiresAt: Date;
  index?: number;
};

export function DealCard({
  chainSlug,
  title,
  description,
  dealType,
  discountType,
  expiresAt,
  index = 0,
}: DealCardProps) {
  const chain = CHAINS[chainSlug];
  const ttl = timeUntil(expiresAt);
  const expiringSoon = expiresAt.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 2;

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
          <Badge variant={discountTypeBadgeVariant[discountType] ?? "default"}>
            {discountTypeLabel[discountType]}
          </Badge>
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
            onClick={() => chain.appDeepLink && window.open(chain.appDeepLink, "_blank")}
          >
            Open in app
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
