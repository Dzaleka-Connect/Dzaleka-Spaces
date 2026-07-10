"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/account/enquiries/actions";

async function assertEnquiryParticipant(enquiryId: string, userId: string) {
  const supabase = await createClient();
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("id, seeker_id, listing_id, listings(spaces(provider_id))")
    .eq("id", enquiryId)
    .maybeSingle();

  if (!enquiry) return null;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const providerId = (enquiry.listings as any)?.spaces?.provider_id;
  const isSeeker = enquiry.seeker_id === userId;
  const isProvider = providerId === userId;
  if (!isSeeker && !isProvider) return null;
  return { enquiry, isSeeker, isProvider };
}

export async function requestViewing(enquiryId: string, formData: FormData): Promise<ActionResult> {
  const proposedAt = String(formData.get("proposed_at") ?? "");
  if (!proposedAt) return { ok: false, error: "Choose a viewing time." };

  if (!isSupabaseConfigured()) return { ok: true };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const participant = await assertEnquiryParticipant(enquiryId, user.id);
  if (!participant?.isSeeker) {
    return { ok: false, error: "Only the seeker can request a viewing." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("viewings").insert({
    enquiry_id: enquiryId,
    proposed_at: new Date(proposedAt).toISOString(),
    status: "requested",
  });

  if (error) {
    console.error("requestViewing failed:", error.message);
    return { ok: false, error: "Could not request viewing." };
  }

  revalidatePath(`/account/enquiries/${enquiryId}`);
  revalidatePath("/account/viewings");
  revalidatePath("/provider/viewings");
  return { ok: true };
}

export async function confirmViewing(viewingId: string, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const supabase = await createClient();
  const { data: viewing } = await supabase
    .from("viewings")
    .select("id, enquiry_id, enquiries(listing_id, listings(spaces(provider_id)))")
    .eq("id", viewingId)
    .maybeSingle();

  if (!viewing) return { ok: false, error: "Viewing not found." };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const providerId = (viewing.enquiries as any)?.listings?.spaces?.provider_id;
  if (providerId !== user.id) {
    return { ok: false, error: "Only the provider can confirm viewings." };
  }

  const providerNotes = String(formData.get("provider_notes") ?? "").trim();
  const alternativeAt = formData.get("alternative_at")
    ? new Date(String(formData.get("alternative_at"))).toISOString()
    : null;

  const { error } = await supabase
    .from("viewings")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      provider_notes: providerNotes || null,
      alternative_at: alternativeAt,
    })
    .eq("id", viewingId);

  if (error) {
    console.error("confirmViewing failed:", error.message);
    return { ok: false, error: "Could not confirm viewing." };
  }

  revalidatePath(`/provider/viewings`);
  revalidatePath(`/account/viewings`);
  revalidatePath(`/account/enquiries/${viewing.enquiry_id}`);
  return { ok: true };
}

export async function releaseViewingDirections(
  viewingId: string,
  formData: FormData
): Promise<ActionResult> {
  const directions = String(formData.get("directions") ?? "").trim();
  const contact = String(formData.get("meeting_contact") ?? "").trim();
  if (directions.length < 10) {
    return { ok: false, error: "Provide clear meeting directions." };
  }
  if (!isSupabaseConfigured()) return { ok: true };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const supabase = await createClient();
  const releasedAt = new Date().toISOString();
  const { error } = await supabase.from("viewing_private_details").upsert({
    viewing_id: viewingId,
    detailed_directions: directions,
    meeting_contact: contact || null,
    released_at: releasedAt,
    updated_by: user.id,
    updated_at: releasedAt,
  });
  if (error) {
    console.error("releaseViewingDirections failed:", error.message);
    return { ok: false, error: "Could not release the directions." };
  }
  const { error: viewingError } = await supabase
    .from("viewings")
    .update({ location_released_at: releasedAt })
    .eq("id", viewingId)
    .eq("status", "confirmed");
  if (viewingError) {
    console.error("releaseViewingDirections viewing update failed:", viewingError.message);
    return { ok: false, error: "Directions were saved but release status could not be updated." };
  }
  revalidatePath(`/provider/viewings/${viewingId}`);
  revalidatePath(`/account/viewings/${viewingId}`);
  return { ok: true };
}

export async function recordViewingSafetyCheckIn(
  viewingId: string,
  status: "departing" | "arrived" | "safe" | "needs_help"
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: true };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const supabase = await createClient();
  const { error } = await supabase.from("viewing_safety_checkins").insert({
    viewing_id: viewingId,
    user_id: user.id,
    status,
  });
  if (error) {
    console.error("recordViewingSafetyCheckIn failed:", error.message);
    return { ok: false, error: "Could not record the safety check-in." };
  }
  revalidatePath(`/account/viewings/${viewingId}`);
  return { ok: true };
}

export async function proposeViewing(viewingId: string, formData: FormData): Promise<ActionResult> {
  const proposedAt = String(formData.get("proposed_at") ?? "");
  if (!proposedAt) return { ok: false, error: "Choose a time." };

  if (!isSupabaseConfigured()) return { ok: true };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const supabase = await createClient();
  const { data: viewing } = await supabase
    .from("viewings")
    .select("id, enquiry_id, enquiries(seeker_id)")
    .eq("id", viewingId)
    .maybeSingle();

  if (!viewing) return { ok: false, error: "Viewing not found." };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const seekerId = (viewing.enquiries as any)?.seeker_id;
  if (seekerId !== user.id) {
    return { ok: false, error: "Only the seeker can propose a new time." };
  }

  const { error } = await supabase
    .from("viewings")
    .update({
      proposed_at: new Date(proposedAt).toISOString(),
      status: "proposed",
    })
    .eq("id", viewingId);

  if (error) {
    console.error("proposeViewing failed:", error.message);
    return { ok: false, error: "Could not update viewing." };
  }

  revalidatePath("/account/viewings");
  revalidatePath("/provider/viewings");
  return { ok: true };
}

export async function cancelViewing(
  viewingId: string,
  role: "seeker" | "provider"
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("viewings")
    .update({
      status: "cancelled",
      cancelled_by: role,
    })
    .eq("id", viewingId);

  if (error) {
    console.error("cancelViewing failed:", error.message);
    return { ok: false, error: "Could not cancel viewing." };
  }

  revalidatePath("/account/viewings");
  revalidatePath("/provider/viewings");
  return { ok: true };
}
