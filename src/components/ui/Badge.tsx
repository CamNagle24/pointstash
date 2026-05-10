import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  | "muted";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border)]",
  accent: "bg-[rgba(245,158,11,0.12)] text-[#fbbf24] border border-[rgba(245,158,11,0.25)]",
  success: "bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(34,197,94,0.25)]",
  warning: "bg-[rgba(234,179,8,0.12)] text-[#facc15] border border-[rgba(234,179,8,0.25)]",
  danger: "bg-[rgba(239,68,68,0.12)] text-[#f87171] border border-[rgba(239,68,68,0.25)]",
  info: "bg-[rgba(59,130,246,0.12)] text-[#60a5fa] border border-[rgba(59,130,246,0.25)]",
  outline: "bg-transparent border border-[var(--border)] text-[var(--text-secondary)]",
  muted: "bg-[var(--bg-tertiary)] text-[var(--text-muted)]",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
