import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import { ZONES } from "./types";
import { getListings } from "./listings";

export function zoneSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export interface ZoneSummary {
  name: string;
  slug: string;
  listingCount: number;
  verifiedCount: number;
}

export async function getZoneSummaries(): Promise<ZoneSummary[]> {
  const [zones, listings] = await Promise.all([getZones(), getListings()]);
  return zones.map((name) => {
    const inZone = listings.filter((l) => l.zone === name);
    return {
      name,
      slug: zoneSlug(name),
      listingCount: inZone.length,
      verifiedCount: inZone.filter((l) => l.verified).length,
    };
  });
}

export async function findZoneBySlug(slug: string): Promise<string | null> {
  const zones = await getZones();
  return zones.find((name) => zoneSlug(name) === slug) ?? null;
}

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
