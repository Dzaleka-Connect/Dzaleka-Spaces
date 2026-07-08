import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type ViewingStatus =
  | "requested"
  | "proposed"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface ViewingRecord {
  id: string;
  enquiryId: string;
  listingId: string;
  listingTitle: string;
  status: ViewingStatus;
  proposedAt: string;
  alternativeAt: string | null;
  confirmedAt: string | null;
  locationReleasedAt: string | null;
  providerNotes: string | null;
  outcome: string | null;
  seekerName: string;
  createdAt: string;
}

export async function listViewingsForUser(
  userId: string,
  role: "seeker" | "provider"
): Promise<ViewingRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  if (role === "provider") {
    const { data: spaces } = await supabase
      .from("spaces")
      .select("id")
      .eq("provider_id", userId);
    const spaceIds = (spaces ?? []).map((s) => s.id);
    if (spaceIds.length === 0) return [];

    const { data: listings } = await supabase
      .from("listings")
      .select("id, title")
      .in("space_id", spaceIds);
    const listingIds = (listings ?? []).map((l) => l.id);
    if (listingIds.length === 0) return [];

    const { data: enquiries } = await supabase
      .from("enquiries")
      .select("id, listing_id, name")
      .in("listing_id", listingIds);
    const enquiryIds = (enquiries ?? []).map((e) => e.id);
    if (enquiryIds.length === 0) return [];

    const { data: viewings, error } = await supabase
      .from("viewings")
      .select(
        "id, enquiry_id, status, proposed_at, alternative_at, confirmed_at, location_released_at, provider_notes, outcome, created_at"
      )
      .in("enquiry_id", enquiryIds)
      .order("proposed_at", { ascending: true });

    if (error) {
      console.error("listViewingsForUser provider failed:", error.message);
      return [];
    }

    const titleByListing = new Map(
      (listings ?? []).map((l) => [l.id, l.title as string])
    );
    const enquiryById = new Map(
      (enquiries ?? []).map((e) => [e.id, e])
    );

    return (viewings ?? []).map((v) => {
      const enquiry = enquiryById.get(v.enquiry_id);
      return {
        id: v.id,
        enquiryId: v.enquiry_id,
        listingId: enquiry?.listing_id ?? "",
        listingTitle: titleByListing.get(enquiry?.listing_id ?? "") ?? "Listing",
        status: v.status as ViewingStatus,
        proposedAt: v.proposed_at,
        alternativeAt: v.alternative_at,
        confirmedAt: v.confirmed_at,
        locationReleasedAt: v.location_released_at,
        providerNotes: v.provider_notes,
        outcome: v.outcome,
        seekerName: enquiry?.name ?? "Seeker",
        createdAt: v.created_at,
      };
    });
  }

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, listing_id, name")
    .eq("seeker_id", userId);
  const enquiryIds = (enquiries ?? []).map((e) => e.id);
  if (enquiryIds.length === 0) return [];

  const listingIds = [...new Set((enquiries ?? []).map((e) => e.listing_id))];
  const { data: listings } = await supabase
    .from("public_listings")
    .select("id, title")
    .in("id", listingIds);
  const titleByListing = new Map(
    (listings ?? []).map((l) => [l.id, l.title as string])
  );
  const enquiryById = new Map((enquiries ?? []).map((e) => [e.id, e]));

  const { data: viewings, error } = await supabase
    .from("viewings")
    .select(
      "id, enquiry_id, status, proposed_at, alternative_at, confirmed_at, location_released_at, provider_notes, outcome, created_at"
    )
    .in("enquiry_id", enquiryIds)
    .order("proposed_at", { ascending: true });

  if (error) {
    console.error("listViewingsForUser seeker failed:", error.message);
    return [];
  }

  return (viewings ?? []).map((v) => {
    const enquiry = enquiryById.get(v.enquiry_id);
    return {
      id: v.id,
      enquiryId: v.enquiry_id,
      listingId: enquiry?.listing_id ?? "",
      listingTitle: titleByListing.get(enquiry?.listing_id ?? "") ?? "Listing",
      status: v.status as ViewingStatus,
      proposedAt: v.proposed_at,
      alternativeAt: v.alternative_at,
      confirmedAt: v.confirmed_at,
      locationReleasedAt: v.location_released_at,
      providerNotes: v.provider_notes,
      outcome: v.outcome,
      seekerName: enquiry?.name ?? "You",
      createdAt: v.created_at,
    };
  });
}

export async function getViewingForUser(
  viewingId: string,
  userId: string
): Promise<ViewingRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: viewing, error } = await supabase
    .from("viewings")
    .select(
      "id, enquiry_id, status, proposed_at, alternative_at, confirmed_at, location_released_at, provider_notes, outcome, created_at, enquiries(id, listing_id, name, seeker_id, listings(id, title, space_id, spaces(id, provider_id)))"
    )
    .eq("id", viewingId)
    .maybeSingle();

  if (error || !viewing) {
    if (error) console.error("getViewingForUser failed:", error.message);
    return null;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const enquiry = viewing.enquiries as any;
  const listing = enquiry?.listings as any;
  const space = listing?.spaces as any;
  const providerId = space?.provider_id;
  const isSeeker = enquiry?.seeker_id === userId;
  const isProvider = providerId === userId;
  if (!isSeeker && !isProvider) return null;

  return {
    id: viewing.id,
    enquiryId: viewing.enquiry_id,
    listingId: enquiry?.listing_id ?? "",
    listingTitle: listing?.title ?? "Listing",
    status: viewing.status as ViewingStatus,
    proposedAt: viewing.proposed_at,
    alternativeAt: viewing.alternative_at,
    confirmedAt: viewing.confirmed_at,
    locationReleasedAt: viewing.location_released_at,
    providerNotes: viewing.provider_notes,
    outcome: viewing.outcome,
    seekerName: enquiry?.name ?? "Seeker",
    createdAt: viewing.created_at,
  };
}
