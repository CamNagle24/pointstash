"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/deals", label: "Deals" },
  { href: "/dashboard/redeem", label: "Redeem" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button variant="ghost" onClick={() => setOpen((o) => !o)} aria-label="Menu">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open && (
        <nav className="absolute right-0 top-14 w-56 rounded-md border bg-background p-2 shadow-lg">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
