"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const REQUEST_TYPES = new Set(["access", "correction", "export", "deletion", "restriction"]);

export async function createPrivacyRequest(_previous: unknown, formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Please sign in." };
  if (!isSupabaseConfigured())
    return { ok: false, message: "Privacy requests require a connected account." };
  const requestType = String(formData.get("request_type") ?? "");
  const details = String(formData.get("details") ?? "").trim();
  if (!REQUEST_TYPES.has(requestType))
    return { ok: false, message: "Choose a valid request type." };
  if (details.length > 2000)
    return { ok: false, message: "Details must be 2,000 characters or fewer." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("privacy_requests")
    .insert({ user_id: user.id, request_type: requestType, details: details || null });
  if (error) {
    console.error("createPrivacyRequest failed:", error.message);
    return { ok: false, message: "Could not submit the privacy request." };
  }
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: "privacy.request_created",
    entity: "privacy_request",
    meta: { request_type: requestType },
  });
  revalidatePath("/account/privacy");
  return { ok: true, message: "Privacy request submitted." };
}
