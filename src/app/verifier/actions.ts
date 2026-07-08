"use server";

import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHECKLIST_ITEMS } from "@/lib/verification";

export async function submitChecklist(listingId: string, formData: FormData) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/sign-in");

  const checklist: Record<string, boolean> = {};
  for (const item of CHECKLIST_ITEMS) {
    checklist[item.key] = formData.get(item.key) === "on";
  }
  const safetyNotes = String(formData.get("safety_notes") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const recommendation = String(
    formData.get("recommendation") ?? "details_confirmed"
  );

  const supabase = await createClient();
  const { error } = await supabase.from("verifications").insert({
    listing_id: listingId,
    verifier_id: user.id,
    status: "pending",
    checklist: { ...checklist, recommendation, safety_notes: safetyNotes },
    notes: notes || null,
  });

  if (error) {
    console.error("submitChecklist failed:", error.message);
    redirect(
      `/verifier/assignments/${listingId}?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: "field_verifier",
    action: "verification.checklist_submitted",
    entity: "listing",
    entity_id: listingId,
    after_state: { recommendation },
  });

  redirect("/verifier/assignments?submitted=1");
}
