"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { AppNavItem } from "@/lib/nav-config";
import { NAV_ICONS } from "@/lib/nav-icons";

function pathMatches(pathname: string, url: string) {
  if (pathname === url) return true;
  if (url === "/spaces" && pathname.startsWith("/spaces/")) return true;
  if (url === "/account" || url === "/provider" || url === "/admin") {
    return pathname === url || pathname.startsWith(`${url}/`);
  }
  return pathname.startsWith(`${url}/`);
}

export function NavMain({ items }: { items: AppNavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavCollapsible key={item.title} item={item} pathname={pathname} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

// Controlled Collapsible: an uncontrolled one warns when `defaultOpen` changes
// on navigation. We open the section that matches the current path and let the
// user toggle any section open/closed themselves.
function NavCollapsible({
  item,
  pathname,
}: {
  item: AppNavItem;
  pathname: string;
}) {
  const Icon = NAV_ICONS[item.icon];
  const isActive = item.items.some((sub) => pathMatches(pathname, sub.url));
  const [open, setOpen] = React.useState(isActive);

  // Expand the section the user navigates into, adjusting state during render
  // (the "previous value" pattern) rather than in an effect. Users can still
  // collapse/expand any section themselves.
  const [wasActive, setWasActive] = React.useState(isActive);
  if (isActive !== wasActive) {
    setWasActive(isActive);
    if (isActive) setOpen(true);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={<SidebarMenuButton tooltip={item.title} />}
        >
          <Icon />
          <span>{item.title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.url}>
                <SidebarMenuSubButton
                  isActive={pathMatches(pathname, subItem.url)}
                  render={<Link href={subItem.url} />}
                >
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
