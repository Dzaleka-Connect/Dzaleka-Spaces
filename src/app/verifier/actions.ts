"use server";

import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHECKLIST_ITEMS } from "@/lib/verification";

export async function submitChecklist(assignmentId: string, formData: FormData) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/sign-in");

  const checklist: Record<string, boolean> = {};
  for (const item of CHECKLIST_ITEMS) {
    checklist[item.key] = formData.get(item.key) === "on";
  }
  const safetyNotes = String(formData.get("safety_notes") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const recommendation = String(formData.get("recommendation") ?? "details_confirmed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_verification_assignment", {
    assignment: assignmentId,
    checklist_payload: {
      ...checklist,
      recommendation,
      safety_notes: safetyNotes,
    },
    verifier_notes: notes || null,
    client_event_id: null,
  });

  if (error) {
    console.error("submitChecklist failed:", error.message);
    redirect(`/verifier/assignments/${assignmentId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/verifier/assignments?submitted=1");
}
