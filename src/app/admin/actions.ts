"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canModerate, getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isLockedPilotFlag } from "./flag-policy";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function reviewerRole(roles: string[]): string {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("moderator")) return "moderator";
  return "reviewer";
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function requireReviewer() {
  if (!isSupabaseConfigured()) redirect("/admin");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");
  return user;
}

async function insertAudit(
  action: string,
  listingId: string,
  beforeState: Record<string, unknown>,
  afterState: Record<string, unknown>
) {
  const user = await getSessionUser();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: reviewerRole(user.roles),
    action,
    entity: "listing",
    entity_id: listingId,
    before_state: beforeState,
    after_state: afterState,
  });

  if (error) console.error("insertAudit failed:", error.message);
}

export async function approveAndPublish(listingId: string) {
  const user = await requireReviewer();
  const supabase = await createClient();

  const [{ data: listing, error: listingError }, { data: verification }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, status")
        .eq("id", listingId)
        .maybeSingle(),
      supabase
        .from("verifications")
        .select("id, status, checklist")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (listingError || !listing) {
    redirectWithError("/admin/review", "Listing not found.");
  }
  if (!verification) {
    redirectWithError(
      "/admin/review",
      "A field checklist is required before publication."
    );
  }

  const now = new Date();
  const reverifyBy = new Date(now);
  reverifyBy.setDate(reverifyBy.getDate() + 90);

  const checklist = {
    ...jsonObject(verification.checklist),
    reviewer_decision: "approved",
    reviewer_id: user.id,
  };

  const { error: verificationError } = await supabase
    .from("verifications")
    .update({
      status: "approved",
      verified_at: now.toISOString(),
      reverify_by: reverifyBy.toISOString().slice(0, 10),
      checklist,
    })
    .eq("id", verification.id);

  if (verificationError) {
    redirectWithError("/admin/review", verificationError.message);
  }

  const { error: listingUpdateError } = await supabase
    .from("listings")
    .update({ status: "published" })
    .eq("id", listingId);

  if (listingUpdateError) {
    redirectWithError("/admin/review", listingUpdateError.message);
  }

  await insertAudit(
    "listing.published",
    listingId,
    { status: listing.status, verification_status: verification.status },
    { status: "published", verification_status: "approved" }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/review");
  revalidatePath("/spaces");
  redirect("/admin/review?published=1");
}

export async function requestChanges(listingId: string, formData: FormData) {
  const user = await requireReviewer();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    redirectWithError("/admin/review", "Add a short reason before requesting changes.");
  }

  const supabase = await createClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    redirectWithError("/admin/review", "Listing not found.");
  }

  const { error: listingUpdateError } = await supabase
    .from("listings")
    .update({ status: "changes_requested" })
    .eq("id", listingId);

  if (listingUpdateError) {
    redirectWithError("/admin/review", listingUpdateError.message);
  }

  const { data: verification } = await supabase
    .from("verifications")
    .select("id, checklist")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verification) {
    await supabase
      .from("verifications")
      .update({
        status: "rejected",
        checklist: {
          ...jsonObject(verification.checklist),
          reviewer_decision: "changes_requested",
          reviewer_id: user.id,
          reviewer_reason: reason,
        },
      })
      .eq("id", verification.id);
  }

  await insertAudit(
    "listing.changes_requested",
    listingId,
    { status: listing.status },
    { status: "changes_requested", reason }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/review");
  redirect("/admin/review?changes=1");
}

export async function rejectListing(listingId: string, formData: FormData) {
  const user = await requireReviewer();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    redirectWithError("/admin/review", "Add a short reason before rejecting.");
  }

  const supabase = await createClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    redirectWithError("/admin/review", "Listing not found.");
  }

  const { error: listingUpdateError } = await supabase
    .from("listings")
    .update({ status: "rejected" })
    .eq("id", listingId);

  if (listingUpdateError) {
    redirectWithError("/admin/review", listingUpdateError.message);
  }

  const { data: verification } = await supabase
    .from("verifications")
    .select("id, checklist")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verification) {
    await supabase
      .from("verifications")
      .update({
        status: "rejected",
        checklist: {
          ...jsonObject(verification.checklist),
          reviewer_decision: "rejected",
          reviewer_id: user.id,
          reviewer_reason: reason,
        },
      })
      .eq("id", verification.id);
  }

  await insertAudit(
    "listing.rejected",
    listingId,
    { status: listing.status },
    { status: "rejected", reason }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/review");
  redirect("/admin/review?rejected=1");
}

export async function updateFeatureFlag(flagName: string, formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/admin/flags");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!hasRole(user, "admin")) redirect("/account");

  const enabled = formData.get("enabled") === "on";
  if (enabled && isLockedPilotFlag(flagName)) {
    redirectWithError(
      "/admin/flags",
      "This flag is locked off by the pilot operating constraints."
    );
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("name", flagName)
    .maybeSingle();

  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("name", flagName);

  if (error) redirectWithError("/admin/flags", error.message);

  const { error: auditError } = await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: "admin",
    action: "feature_flag.updated",
    entity: "feature_flag",
    entity_id: flagName,
    before_state: before ?? {},
    after_state: { enabled },
  });

  if (auditError) console.error("feature flag audit failed:", auditError.message);

  revalidatePath("/admin");
  revalidatePath("/admin/flags");
  redirect("/admin/flags?updated=1");
}
