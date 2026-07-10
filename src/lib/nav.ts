import "server-only";

import { canModerate, hasRole, isStaff } from "@/lib/auth-roles";
import { featureEnabled } from "@/lib/features";
import { PUBLIC_HEADER_LINKS, type AppNavItem, type NavLink } from "@/lib/nav-config";
import type { SessionUser } from "@/lib/session-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type { AppNavItem, AppNavSubItem } from "@/lib/nav-config";

async function ownsSpaces(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const supabase = await createClient();
  const { count } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", userId);
  return (count ?? 0) > 0;
}

async function hasTradeProfile(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_provider_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/** Public header links filtered by feature flags. */
export async function getPublicHeaderLinks(): Promise<NavLink[]> {
  const [mapEnabled, tradesEnabled] = await Promise.all([
    featureEnabled("public_map"),
    featureEnabled("maintenance_marketplace"),
  ]);

  return PUBLIC_HEADER_LINKS.filter((link) => {
    if (link.href === "/spaces/map") return mapEnabled;
    if (link.href === "/services") return tradesEnabled;
    return true;
  });
}

/**
 * Signed-in sidebar groups. Provider/Trades sections appear when relevant;
 * staff always see verifier/admin portals.
 */
export async function getAppNav(user: SessionUser): Promise<AppNavItem[]> {
  const [showProvider, showTrades, mapEnabled, tradesEnabled] = await Promise.all([
    ownsSpaces(user.id),
    hasTradeProfile(user.id),
    featureEnabled("public_map"),
    featureEnabled("maintenance_marketplace"),
  ]);

  const discoverItems = [
    { title: "Browse spaces", url: "/spaces" },
    ...(mapEnabled ? [{ title: "Map", url: "/spaces/map" }] : []),
    { title: "Zones", url: "/zones" },
    ...(tradesEnabled ? [{ title: "Service providers", url: "/services" }] : []),
    { title: "Help centre", url: "/help" },
    { title: "Safety centre", url: "/safety" },
  ];

  const items: AppNavItem[] = [
    {
      title: "Discover",
      url: "/spaces",
      icon: "building",
      items: discoverItems,
    },
    {
      title: "Account",
      url: "/account",
      icon: "user",
      items: [
        { title: "Overview", url: "/account" },
        { title: "Profile", url: "/account/profile" },
        { title: "Messages", url: "/account/messages" },
        { title: "Notifications", url: "/account/notifications" },
        { title: "Enquiries", url: "/account/enquiries" },
        { title: "Viewings", url: "/account/viewings" },
        { title: "Saved spaces", url: "/account/saved-spaces" },
        { title: "Saved searches", url: "/account/saved-searches" },
        { title: "Occupancies", url: "/account/occupancies" },
        { title: "Charges", url: "/account/charges" },
        { title: "Payments", url: "/account/payments" },
        { title: "Maintenance", url: "/account/maintenance" },
        { title: "Documents", url: "/account/documents" },
        { title: "Privacy", url: "/account/privacy" },
        { title: "Security", url: "/account/security" },
      ],
    },
  ];

  if (showProvider || canModerate(user)) {
    items.push({
      title: "Provider",
      url: "/provider",
      icon: "home",
      items: [
        { title: "Dashboard", url: "/provider" },
        { title: "Profile", url: "/provider/profile" },
        { title: "Spaces", url: "/provider/spaces" },
        { title: "Listings", url: "/provider/listings" },
        { title: "Verifications", url: "/provider/verifications" },
        { title: "Enquiries", url: "/provider/enquiries" },
        { title: "Viewings", url: "/provider/viewings" },
        { title: "Occupancies", url: "/provider/occupancies" },
        { title: "Charges", url: "/provider/charges" },
        { title: "Payments", url: "/provider/payments" },
        { title: "Deposits", url: "/provider/deposits" },
        { title: "Maintenance", url: "/provider/maintenance" },
        { title: "Work orders", url: "/provider/work-orders" },
        { title: "Expenses", url: "/provider/expenses" },
        { title: "Documents", url: "/provider/documents" },
        { title: "Reports", url: "/provider/reports" },
        { title: "Team", url: "/provider/team" },
        { title: "Settings", url: "/provider/settings" },
      ],
    });
  }

  if (tradesEnabled) {
    if (showTrades || canModerate(user)) {
      items.push({
        title: "Trades",
        url: "/trades/jobs",
        icon: "wrench",
        items: [
          { title: "Jobs", url: "/trades/jobs" },
          { title: "Quotes", url: "/trades/quotes" },
          { title: "Work orders", url: "/trades/work-orders" },
          { title: "Messages", url: "/trades/messages" },
          { title: "Reviews", url: "/trades/reviews" },
          { title: "Documents", url: "/trades/documents" },
          { title: "Schedule", url: "/trades/schedule" },
          { title: "Trade profile", url: "/trades/profile" },
        ],
      });
    } else {
      items.push({
        title: "Trades",
        url: "/trades",
        icon: "wrench",
        items: [
          { title: "Directory", url: "/trades" },
          { title: "Create trade profile", url: "/trades/profile" },
        ],
      });
    }
  }

  if (hasRole(user, "field_verifier") || isStaff(user)) {
    items.push({
      title: "Verifier",
      url: "/verifier/assignments",
      icon: "clipboard",
      items: [
        {
          title: "Assignments",
          url: "/verifier/assignments",
        },
        {
          title: "Completed",
          url: "/verifier/completed",
        },
        {
          title: "Offline queue",
          url: "/verifier/offline",
        },
        { title: "Assignment map", url: "/verifier/map" },
        { title: "Notifications", url: "/verifier/notifications" },
      ],
    });
  }

  if (canModerate(user)) {
    items.push({
      title: "Admin",
      url: "/admin",
      icon: "shield",
      items: [
        { title: "Overview", url: "/admin" },
        { title: "Review queue", url: "/admin/review" },
        { title: "Verifications", url: "/admin/verifications" },
        { title: "Listings", url: "/admin/listings" },
        { title: "Occupancies", url: "/admin/occupancies" },
        { title: "Payments", url: "/admin/payments" },
        { title: "Maintenance", url: "/admin/maintenance" },
        { title: "Cases", url: "/admin/cases" },
        { title: "Reports", url: "/admin/reports" },
        { title: "Users", url: "/admin/users" },
        { title: "Content", url: "/admin/content/pages" },
        { title: "Analytics", url: "/admin/analytics" },
        { title: "Notifications", url: "/admin/notifications" },
        { title: "Settings", url: "/admin/settings" },
        { title: "System health", url: "/admin/system" },
        ...(hasRole(user, "admin") ? [{ title: "Audit log", url: "/admin/audit" }] : []),
      ],
    });
  }

  return items;
}
