import "server-only";

import type { AnalyticsEventKey } from "@/lib/analytics-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type TrackOptions = {
  route?: string;
  properties?: Record<string, string | number | boolean | null>;
};

/**
 * Privacy-safe analytics insert. Never pass exact coordinates, identity
 * documents, or authority evidence in properties.
 */
export async function trackAnalyticsEvent(
  eventName: AnalyticsEventKey,
  options: TrackOptions = {}
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("analytics_events").insert({
      event_name: eventName,
      route: options.route ?? null,
      actor_id: user?.id ?? null,
      properties: options.properties ?? {},
    });
  } catch (error) {
    console.error("trackAnalyticsEvent failed:", error);
  }
}
