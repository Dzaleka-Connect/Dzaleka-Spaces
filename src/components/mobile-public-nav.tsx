"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavLink } from "@/lib/nav-config";
import { NAV_ICONS } from "@/lib/nav-icons";

type MobilePublicNavProps = {
  links: NavLink[];
};

export function MobilePublicNav({ links }: MobilePublicNavProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu" />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] gap-0 p-0">
        <SheetHeader className="border-b text-left">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Public navigation for Dzaleka Spaces
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-3">
          {links.map((link) => {
            const Icon = NAV_ICONS[link.icon];
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/list-a-space"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted"
          >
            List a space
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Sign in
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
