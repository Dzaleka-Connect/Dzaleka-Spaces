import { isSupabaseConfigured, supabaseKey } from "./supabase/config";
import { createClient } from "./supabase/server";

export interface SpaceMedia {
  id: string;
  storagePath: string;
  bucket: string;
  sortOrder: number;
  isPublic: boolean;
  url: string | null;
}

export function publicMediaUrl(bucket: string, path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  if (bucket === "listing-public") {
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
  }
  return null;
}

export function listingCoverUrl(
  coverPath: string | null | undefined,
  coverBucket: string | null | undefined
): string | null {
  if (!coverPath || !coverBucket) return null;
  return publicMediaUrl(coverBucket, coverPath);
}

export async function getListingMedia(
  spaceId: string,
  publicOnly = true
): Promise<SpaceMedia[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  let query = supabase
    .from("space_media")
    .select("id, storage_path, bucket, sort_order, is_public")
    .eq("space_id", spaceId)
    .order("sort_order")
    .order("created_at");

  if (publicOnly) {
    query = query.eq("is_public", true).eq("bucket", "listing-public");
  }

  const { data, error } = await query;
  if (error) {
    console.error("getListingMedia failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    bucket: row.bucket,
    sortOrder: row.sort_order,
    isPublic: row.is_public,
    url: publicMediaUrl(row.bucket, row.storage_path),
  }));
}

export async function getListingMediaByListingId(
  listingId: string
): Promise<SpaceMedia[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("space_id")
    .eq("id", listingId)
    .eq("status", "published")
    .maybeSingle();

  if (!listing) return [];
  return getListingMedia(listing.space_id);
}

export async function registerSpaceMedia(
  spaceId: string,
  storagePath: string,
  options: {
    bucket?: string;
    isPublic?: boolean;
    sortOrder?: number;
  } = {}
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode: media not stored." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("space_media").insert({
    space_id: spaceId,
    storage_path: storagePath,
    bucket: options.bucket ?? "listing-public",
    is_public: options.isPublic ?? true,
    sort_order: options.sortOrder ?? 0,
  });

  if (error) {
    console.error("registerSpaceMedia failed:", error.message);
    return { ok: false, message: "Could not save photo record." };
  }
  return { ok: true, message: "Photo saved." };
}

export function supabaseStorageBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = supabaseKey();
  if (!base || !key) return null;
  return base;
}
