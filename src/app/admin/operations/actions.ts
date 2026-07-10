"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireModerator } from "@/lib/portal-auth";
import { createClient } from "@/lib/supabase/server";

export async function updateModerationCase(caseId: string, formData: FormData) {
  const user = await requireModerator();
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!new Set(["open", "triaged", "waiting", "resolved", "closed"]).has(status))
    return { ok: false, message: "Choose a valid case status." };
  if (note.length < 5) return { ok: false, message: "Record a reason for the case update." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("moderation_cases")
    .update({
      status,
      resolved_at: ["resolved", "closed"].includes(status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);
  if (error) {
    console.error("updateModerationCase failed:", error.message);
    return { ok: false, message: "Could not update the case." };
  }
  await supabase
    .from("case_events")
    .insert({ case_id: caseId, actor_id: user.id, action: `status.${status}`, note });
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: "case.status_updated",
    entity: "moderation_case",
    entity_id: caseId,
    after_state: { status },
    meta: { reason: note },
  });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
  return { ok: true, message: "Case updated." };
}

export async function saveSystemSetting(key: string, formData: FormData) {
  const user = await requireAdmin();
  const raw = String(formData.get("value") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!/^[a-z][a-z0-9_.-]{2,100}$/.test(key)) return { ok: false, message: "Invalid setting key." };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Value must be valid JSON." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("system_settings").upsert({
    key,
    value,
    description: description || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("saveSystemSetting failed:", error.message);
    return { ok: false, message: "Could not save the setting." };
  }
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: "system_setting.updated",
    entity: "system_setting",
    entity_id: key,
    meta: { reason: description },
  });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Setting saved." };
}

export async function saveContentPage(slug: string, formData: FormData) {
  const user = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  if (!/^[a-z0-9][a-z0-9/-]{1,120}$/.test(slug) || title.length < 3 || body.length < 20)
    return { ok: false, message: "Slug, title and complete body content are required." };
  if (!new Set(["draft", "published", "archived"]).has(status))
    return { ok: false, message: "Invalid content status." };
  const supabase = await createClient();
  const { error } = await supabase.from("content_pages").upsert({
    slug,
    title,
    body,
    status,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("saveContentPage failed:", error.message);
    return { ok: false, message: "Could not save the page." };
  }
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: "content_page.updated",
    entity: "content_page",
    entity_id: slug,
    after_state: { title, status },
  });
  revalidatePath("/admin/content/pages");
  return { ok: true, message: "Content page saved." };
}

export async function assignVerification(_previous: unknown, formData: FormData) {
  await requireModerator();
  const listingId = String(formData.get("listing_id") ?? "");
  const verifierId = String(formData.get("verifier_id") ?? "");
  const dueAt = String(formData.get("due_at") ?? "");
  if (!listingId || !verifierId || !dueAt)
    return { ok: false, message: "Listing, verifier and due date are required." };
  const due = new Date(dueAt);
  if (!Number.isFinite(due.getTime()) || due <= new Date())
    return { ok: false, message: "Due date must be in the future." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_verification_visit", {
    target_listing: listingId,
    target_verifier: verifierId,
    due_at: due.toISOString(),
  });
  if (error) {
    console.error("assignVerification failed:", error.message);
    return { ok: false, message: "Could not assign this verification." };
  }
  revalidatePath("/admin/verifications");
  return { ok: true, message: "Verification assigned." };
}
