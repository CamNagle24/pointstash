"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Tags,
  Coins,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  LogOut,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/deals", label: "Deals", icon: Tags },
  { href: "/dashboard/redeem", label: "Redeem", icon: Coins },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
};

export function Sidebar({ collapsed, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "You";
  const userEmail = session?.user?.email ?? "";
  // Theme is read from localStorage on the client — unknown during SSR.
  // Defer the label so the server's "Dark mode" guess can't desync from the
  // client's actual theme and trigger a hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const themeLabel = mounted ? (theme === "light" ? "Dark mode" : "Light mode") : "Theme";

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 256 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex h-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      <div className={cn("flex items-center gap-2.5 px-5 pt-6 pb-4", collapsed && "justify-center px-3")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-amber shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]">
          <Coins className="h-4 w-4 text-[#0a0a0b]" strokeWidth={2.5} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <Link href="/" className="font-display text-lg font-bold tracking-tight">
                PointStash
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className={cn("flex-1 space-y-1 px-3 pt-4", collapsed && "px-2")}>
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onCloseMobile}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[rgba(245,158,11,0.12)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                collapsed && "justify-center px-0",
              )}
            >
              {active && !collapsed && (
                <motion.span
                  layoutId="active-pill"
                  // pointer-events-none — during the layoutId transition this
                  // element is briefly "in flight" between two links and would
                  // otherwise intercept clicks meant for the next nav item.
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-[rgba(245,158,11,0.2)]"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon className="relative h-4 w-4 shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.12 }}
                    className="relative whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className={cn(
            "flex w-full h-10 items-center gap-3 rounded-xl px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors",
            collapsed && "justify-center px-0",
          )}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 shrink-0 dark:hidden" />
          <Moon className="h-4 w-4 shrink-0 hidden dark:block" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="whitespace-nowrap"
                // The label depends on the resolved theme, which next-themes
                // reads from localStorage on the client. Server can't know
                // it, so the first paint mismatch is expected and harmless —
                // tell React not to warn.
                suppressHydrationWarning
              >
                {themeLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <div
        className={cn(
          "flex items-center gap-3 border-t border-[var(--border)] px-3 py-3",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] ring-1 ring-[var(--border)]">
          <User className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex flex-1 min-w-0 items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {userEmail || "Member"}
                </p>
              </div>
              <button
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Sign out"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:flex absolute -right-3 top-8 h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        {collapsed ? (
          <ChevronsRight className="h-3 w-3" />
        ) : (
          <ChevronsLeft className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  );
}
