import { DEMO_LISTINGS } from "./demo-data";
import { featureEnabled } from "./features";
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
    coverImageUrl: listingCoverUrl(row.cover_image_path, row.cover_image_bucket),
  };
}

function applyFiltersLocally(listings: Listing[], filters: ListingFilters): Listing[] {
  return listings.filter((l) => {
    if (filters.category && l.category !== filters.category) return false;
    if (filters.zone && l.zone !== filters.zone) return false;
    if (filters.minPrice && l.priceMwk < filters.minPrice) return false;
    if (filters.maxPrice && l.priceMwk > filters.maxPrice) return false;
    if (filters.billingPeriod && l.billingPeriod !== filters.billingPeriod) return false;
    if (filters.availableBy && l.availableFrom && l.availableFrom > filters.availableBy)
      return false;
    if (filters.minRooms && (l.rooms ?? 0) < filters.minRooms) return false;
    if (filters.facilities?.some((facility) => !l.facilities.includes(facility))) return false;
    if (filters.verifiedOnly && !l.verified) return false;
    if (filters.recentlyVerifiedDays) {
      if (!l.verifiedAt) return false;
      const cutoff = Date.now() - filters.recentlyVerifiedDays * 86_400_000;
      if (new Date(l.verifiedAt).getTime() < cutoff) return false;
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const haystack = `${l.title} ${l.description} ${l.landmark} ${l.zone}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function sortListings(listings: Listing[], filters: ListingFilters) {
  const result = [...listings];
  switch (filters.sort) {
    case "price_asc":
      return result.sort((a, b) => a.priceMwk - b.priceMwk);
    case "price_desc":
      return result.sort((a, b) => b.priceMwk - a.priceMwk);
    case "verified_recent":
      return result.sort((a, b) => (b.verifiedAt ?? "").localeCompare(a.verifiedAt ?? ""));
    case "available_soon":
      return result.sort((a, b) => (a.availableFrom ?? "").localeCompare(b.availableFrom ?? ""));
    case "recent":
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return result.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt)
      );
  }
}

export interface ListingSearchResult {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchListings(filters: ListingFilters = {}): Promise<ListingSearchResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(filters.pageSize ?? 24, 48));
  const offset = (page - 1) * pageSize;
  if (!isSupabaseConfigured()) {
    const filtered = sortListings(applyFiltersLocally(DEMO_LISTINGS, filters), filters);
    return {
      listings: filtered.slice(offset, offset + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_public_listings", {
    p_query: filters.q?.trim() || null,
    p_zone: filters.zone || null,
    p_category: filters.category || null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_billing_period: filters.billingPeriod ?? null,
    p_available_by: filters.availableBy ?? null,
    p_min_rooms: filters.minRooms ?? null,
    p_facilities: filters.facilities ?? [],
    p_verified: filters.verifiedOnly ? true : null,
    p_recent_verified_days: filters.recentlyVerifiedDays ?? null,
    p_sort: filters.sort ?? "relevance",
    p_limit: pageSize,
    p_offset: offset,
  });
  if (error) {
    console.error("searchListings failed:", error.message);
    return { listings: [], total: 0, page, pageSize };
  }
  return {
    listings: (data ?? []).map(rowToListing),
    total: Number(data?.[0]?.total_count ?? 0),
    page,
    pageSize,
  };
}

export async function getListings(filters: ListingFilters = {}): Promise<Listing[]> {
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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const supabase = await createClient();
  let query = supabase.from("public_listings").select("*");

  if (isUuid) {
    query = query.or(`id.eq.${id},slug.eq.${id}`);
  } else {
    query = query.eq("slug", id);
  }

  const { data, error } = await query.maybeSingle();

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
  const { data, error } = await supabase.from("public_listings").select("*").in("id", uniqueIds);

  if (error) {
    console.error("getListingsByIds failed:", error.message);
    return [];
  }

  const listingById = new Map((data ?? []).map((row) => [row.id, rowToListing(row)]));
  return uniqueIds
    .map((id) => listingById.get(id))
    .filter((listing): listing is Listing => Boolean(listing));
}

export async function getFeaturedListings(limit = 3): Promise<Listing[]> {
  if (!(await featureEnabled("featured_listings"))) return [];

  const listings = await getListings();
  const featured = listings.filter((l) => l.featured);
  const rest = listings.filter((l) => !l.featured);
  return [...featured, ...rest].slice(0, limit);
}
