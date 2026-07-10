import type { ListingFilters } from "./types";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export { criteriaToSearchParams, filtersToCriteria } from "./search-criteria";

export interface SavedSearch {
  id: string;
  name: string;
  criteria: ListingFilters;
  channel: "email" | "in_app";
  frequency: "daily" | "weekly" | "instant";
  paused: boolean;
  createdAt: string;
}

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, name, criteria, channel, frequency, paused, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listSavedSearches failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    criteria: (row.criteria ?? {}) as ListingFilters,
    channel: row.channel as SavedSearch["channel"],
    frequency: row.frequency as SavedSearch["frequency"],
    paused: row.paused,
    createdAt: row.created_at,
  }));
}
