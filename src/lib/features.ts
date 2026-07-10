import "server-only";

import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

/**
 * Known feature flags. Every name here should either gate a real code path
 * or be marked planned. Locked pilot flags stay off in app + DB policy.
 */
export const FEATURE_FLAGS = {
  residential_listings: {
    description: "Rooms/shared rooms. Requires written operational guidance before enabling.",
    demoDefault: false,
    locked: true,
  },
  family_accommodation: {
    description: "Entire family shelters. Stricter gate than residential_listings.",
    demoDefault: false,
    locked: true,
  },
  mobile_money_processing: {
    description: "Actual payment processing (pilot is ledger-only).",
    demoDefault: false,
    locked: true,
  },
  deposit_processing: {
    description: "Deposit custody. Prohibited during pilot.",
    demoDefault: false,
    locked: true,
  },
  public_map: {
    description: "Approximate map points on public listings.",
    demoDefault: false,
    locked: false,
  },
  maintenance_marketplace: {
    description: "Service-provider marketplace (trades jobs, quotes, work orders).",
    demoDefault: true,
    locked: false,
  },
  featured_listings: {
    description: "Paid/featured placement on the homepage.",
    demoDefault: true,
    locked: false,
  },
  organisation_accounts: {
    description: "Organisation membership and shared dashboards.",
    demoDefault: false,
    locked: false,
  },
  whatsapp_notifications: {
    description: "Outbound WhatsApp notifications are not enabled for the pilot.",
    demoDefault: false,
    locked: true,
  },
  saved_search_alerts: {
    description: "Saved-search alert delivery.",
    demoDefault: false,
    locked: false,
  },
  occupancy_records: {
    description: "Documented occupancy arrangements with both-party confirmation.",
    demoDefault: true,
    locked: false,
  },
  email_notifications: {
    description: "Transactional email notifications through Resend.",
    demoDefault: true,
    locked: false,
  },
  enquiry_attachments: {
    description: "Private file attachments on enquiry messages.",
    demoDefault: true,
    locked: false,
  },
  verifier_offline_pwa: {
    description: "Offline verifier queue and sync support.",
    demoDefault: true,
    locked: false,
  },
  admin_case_management: {
    description: "Moderation and protection-sensitive case management.",
    demoDefault: true,
    locked: false,
  },
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export function isFeatureFlagName(name: string): name is FeatureFlagName {
  return name in FEATURE_FLAGS;
}

export async function featureEnabled(name: FeatureFlagName | (string & {})): Promise<boolean> {
  const known = isFeatureFlagName(name) ? FEATURE_FLAGS[name] : null;

  if (!isSupabaseConfigured()) {
    return known?.demoDefault ?? false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    console.error(`featureEnabled(${name}) failed:`, error.message);
    return known?.demoDefault ?? false;
  }

  if (!data) return known?.demoDefault ?? false;
  return Boolean(data.enabled);
}
