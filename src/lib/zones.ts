import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import { ZONES } from "./types";

// Zone names come from the zones table when Supabase is connected; the
// static list is the demo-mode fallback.
export async function getZones(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [...ZONES];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zones")
    .select("name")
    .eq("active", true)
    .order("sort_order");

  if (error || !data?.length) {
    if (error) console.error("getZones failed:", error.message);
    return [...ZONES];
  }
  return data.map((z) => z.name);
}
