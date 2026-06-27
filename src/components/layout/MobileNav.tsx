"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/deals", label: "Deals" },
  { href: "/dashboard/redeem", label: "Redeem" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Button variant="ghost" onClick={() => setOpen((o) => !o)} aria-label="Menu">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open && (
        <nav className="absolute right-0 top-14 w-56 rounded-md border bg-background p-2 shadow-lg">
          {links.map((l) => {
            const active = l.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm hover:bg-accent",
                  active && "bg-accent font-medium",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
