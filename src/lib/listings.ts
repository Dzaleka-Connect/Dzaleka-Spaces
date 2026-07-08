import { DEMO_LISTINGS } from "./demo-data";
import { listingCoverUrl } from "./media";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import type { Listing, ListingFilters } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToListing(row: any): Listing {
  return {
    id: row.id,
    slug: row.slug ?? null,
    title: row.title,
    category: row.category,
    zone: row.zone,
    landmark: row.landmark,
    description: row.description,
    rooms: row.rooms,
    capacity: row.capacity,
    facilities: row.facilities ?? [],
    priceMwk: row.price_mwk,
    depositMwk: row.deposit_mwk,
    billingPeriod: row.billing_period,
    availableFrom: row.available_from,
    verified: Boolean(row.verified),
    verifiedAt: row.verified_at,
    featured: Boolean(row.featured),
    providerName: row.provider_name,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
    coverImagePath: row.cover_image_path ?? null,
    coverImageBucket: row.cover_image_bucket ?? null,
    coverImageUrl: listingCoverUrl(
      row.cover_image_path,
      row.cover_image_bucket
    ),
  };
}

function applyFiltersLocally(
  listings: Listing[],
  filters: ListingFilters
): Listing[] {
  return listings.filter((l) => {
    if (filters.category && l.category !== filters.category) return false;
    if (filters.zone && l.zone !== filters.zone) return false;
    if (filters.maxPrice && l.priceMwk > filters.maxPrice) return false;
    if (filters.verifiedOnly && !l.verified) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const haystack =
        `${l.title} ${l.description} ${l.landmark} ${l.zone}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export async function getListings(
  filters: ListingFilters = {}
): Promise<Listing[]> {
  if (!isSupabaseConfigured()) {
    return applyFiltersLocally(DEMO_LISTINGS, filters);
  }

  const supabase = await createClient();
  let query = supabase.from("public_listings").select("*");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.zone) query = query.eq("zone", filters.zone);
  if (filters.maxPrice) query = query.lte("price_mwk", filters.maxPrice);
  if (filters.verifiedOnly) query = query.eq("verified", true);
  if (filters.q) {
    query = query.or(
      `title.ilike.%${filters.q}%,description.ilike.%${filters.q}%,landmark.ilike.%${filters.q}%`
    );
  }

  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getListings failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToListing);
}

export async function getListing(id: string): Promise<Listing | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_LISTINGS.find((l) => l.id === id || l.slug === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_listings")
    .select("*")
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle();

  if (error) {
    console.error("getListing failed:", error.message);
    return null;
  }
  return data ? rowToListing(data) : null;
}

export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  if (!isSupabaseConfigured()) {
    return uniqueIds
      .map((id) => DEMO_LISTINGS.find((listing) => listing.id === id))
      .filter((listing): listing is Listing => Boolean(listing));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_listings")
    .select("*")
    .in("id", uniqueIds);

  if (error) {
    console.error("getListingsByIds failed:", error.message);
    return [];
  }

  const listingById = new Map(
    (data ?? []).map((row) => [row.id, rowToListing(row)])
  );
  return uniqueIds
    .map((id) => listingById.get(id))
    .filter((listing): listing is Listing => Boolean(listing));
}

export async function getFeaturedListings(limit = 3): Promise<Listing[]> {
  const listings = await getListings();
  const featured = listings.filter((l) => l.featured);
  const rest = listings.filter((l) => !l.featured);
  return [...featured, ...rest].slice(0, limit);
}
