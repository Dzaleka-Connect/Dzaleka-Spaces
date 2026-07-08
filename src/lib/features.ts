import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export async function featureEnabled(name: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    if (name === "public_map") return false;
    if (name === "saved_search_alerts") return false;
    return false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    console.error(`featureEnabled(${name}) failed:`, error.message);
    return false;
  }
  return Boolean(data?.enabled);
}
