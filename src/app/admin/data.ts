import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminStats {
  publishedListings: number;
  pendingReview: number;
  changesRequested: number;
  pendingVerifications: number;
  enquiries: number;
  openReports: number;
}

export interface AuditEventSummary {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface ReviewListing {
  id: string;
  title: string;
  status: string;
  priceMwk: number;
  billingPeriod: string;
  createdAt: string;
  category: string;
  zone: string;
  landmark: string;
  verification: {
    id: string;
    status: string;
    createdAt: string;
    verifiedAt: string | null;
    notes: string | null;
    checklist: Record<string, unknown>;
  } | null;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
}

interface ListingRow {
  id: string;
  space_id: string;
  title: string;
  status: string;
  price_mwk: number;
  billing_period: string;
  created_at: string;
}

interface SpaceRow {
  id: string;
  category: string;
  landmark: string;
  zones: { name: string } | { name: string }[] | null;
}

interface VerificationRow {
  id: string;
  listing_id: string;
  status: string;
  created_at: string;
  verified_at: string | null;
  notes: string | null;
  checklist: unknown;
}

interface AuditRow {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_role: string | null;
  created_at: string;
}

interface FeatureFlagRow {
  name: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
}

function countValue(count: number | null): number {
  return count ?? 0;
}

function zoneName(zones: SpaceRow["zones"]): string {
  if (Array.isArray(zones)) return zones[0]?.name ?? "Unknown zone";
  return zones?.name ?? "Unknown zone";
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function getAdminOverview(): Promise<{
  stats: AdminStats;
  auditEvents: AuditEventSummary[];
}> {
  const supabase = await createClient();

  const [published, pending, changes, pendingVerifications, enquiries, reports, audit] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "changes_requested"),
      supabase
        .from("verifications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("enquiries").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase
        .from("audit_events")
        .select("id, action, entity, entity_id, actor_role, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const auditRows = (audit.data ?? []) as AuditRow[];

  return {
    stats: {
      publishedListings: countValue(published.count),
      pendingReview: countValue(pending.count),
      changesRequested: countValue(changes.count),
      pendingVerifications: countValue(pendingVerifications.count),
      enquiries: countValue(enquiries.count),
      openReports: countValue(reports.count),
    },
    auditEvents: auditRows.map((event) => ({
      id: event.id,
      action: event.action,
      entity: event.entity,
      entityId: event.entity_id,
      actorRole: event.actor_role,
      createdAt: event.created_at,
    })),
  };
}

export async function getReviewListings(): Promise<ReviewListing[]> {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, space_id, title, status, price_mwk, billing_period, created_at")
    .in("status", ["pending_review", "changes_requested"])
    .order("created_at", { ascending: true });

  const listingRows = (listings ?? []) as ListingRow[];
  const spaceIds = [...new Set(listingRows.map((listing) => listing.space_id))];
  const listingIds = listingRows.map((listing) => listing.id);

  const [{ data: spaces }, { data: verifications }] = await Promise.all([
    spaceIds.length
      ? supabase.from("spaces").select("id, category, landmark, zones(name)").in("id", spaceIds)
      : Promise.resolve({ data: [] }),
    listingIds.length
      ? supabase
          .from("verifications")
          .select("id, listing_id, status, created_at, verified_at, notes, checklist")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const spaceById = new Map(((spaces ?? []) as SpaceRow[]).map((space) => [space.id, space]));
  const verificationByListing = new Map<string, VerificationRow>();
  for (const verification of (verifications ?? []) as VerificationRow[]) {
    if (!verificationByListing.has(verification.listing_id)) {
      verificationByListing.set(verification.listing_id, verification);
    }
  }

  return listingRows.map((listing) => {
    const space = spaceById.get(listing.space_id);
    const verification = verificationByListing.get(listing.id);

    return {
      id: listing.id,
      title: listing.title,
      status: listing.status,
      priceMwk: listing.price_mwk,
      billingPeriod: listing.billing_period,
      createdAt: listing.created_at,
      category: space?.category ?? "other",
      zone: space ? zoneName(space.zones) : "Unknown zone",
      landmark: space?.landmark ?? "Unknown landmark",
      verification: verification
        ? {
            id: verification.id,
            status: verification.status,
            createdAt: verification.created_at,
            verifiedAt: verification.verified_at,
            notes: verification.notes,
            checklist: jsonObject(verification.checklist),
          }
        : null,
    };
  });
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("name, enabled, description, updated_at")
    .order("name");

  return ((data ?? []) as FeatureFlagRow[]).map((flag) => ({
    name: flag.name,
    enabled: flag.enabled,
    description: flag.description,
    updatedAt: flag.updated_at,
  }));
}
