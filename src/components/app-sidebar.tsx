"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { AppNavItem } from "@/lib/nav-config";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    initials: string;
  };
  nav: AppNavItem[];
  homeHref?: string;
};

export function AppSidebar({
  user,
  nav,
  homeHref = "/account",
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Dashboard"
              render={<Link href={homeHref} />}
            >
              <Image
                src="/logo-mark-teal.svg"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0"
                unoptimized
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Dzaleka Spaces</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={nav} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
