"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getEnquiryForUser } from "@/lib/enquiries";
import { featureEnabled } from "@/lib/features";
import { queueEnquiryMessageEmail } from "@/lib/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function sendEnquiryMessage(
  enquiryId: string,
  formData: FormData,
  senderRole: "seeker" | "provider"
): Promise<ActionResult> {
  const body = String(formData.get("body") ?? "").trim();
  const files = formData
    .getAll("attachments")
    .filter(
      (value): value is File =>
        typeof File !== "undefined" && value instanceof File && value.size > 0
    );
  if (!body && files.length === 0) {
    return { ok: false, error: "Message or attachment is required." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, message: body };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const enquiry = await getEnquiryForUser(enquiryId, user.id);
  if (!enquiry || enquiry.status !== "open") {
    return { ok: false, error: "Enquiry not found or closed." };
  }
  if (
    (senderRole === "seeker" && enquiry.seekerId !== user.id) ||
    (senderRole === "provider" && enquiry.providerId !== user.id)
  ) {
    return { ok: false, error: "You cannot send as that participant." };
  }

  const supabase = await createClient();
  const { data: insertedMessage, error } = await supabase
    .from("enquiry_messages")
    .insert({
      enquiry_id: enquiryId,
      sender_id: user.id,
      sender_role: senderRole,
      body: body || "Attachment sent",
    })
    .select("id")
    .single();

  if (error) {
    console.error("sendEnquiryMessage failed:", error.message);
    return { ok: false, error: "Could not send message." };
  }

  if (files.length > 0) {
    if (!(await featureEnabled("enquiry_attachments"))) {
      return {
        ok: false,
        error: "File attachments are currently disabled.",
      };
    }

    for (const file of files.slice(0, 5)) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
      const path = `${enquiryId}/${insertedMessage.id}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from("message-private").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (upload.error) {
        console.error("enquiry attachment upload failed:", upload.error.message);
        continue;
      }
      await supabase.from("enquiry_attachments").insert({
        enquiry_id: enquiryId,
        message_id: insertedMessage.id,
        uploader_id: user.id,
        storage_path: path,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
    }
  }

  await queueEnquiryMessageEmail(enquiryId, senderRole);

  revalidatePath(`/account/enquiries/${enquiryId}`);
  revalidatePath(`/provider/enquiries/${enquiryId}`);
  return { ok: true, message: body || "Attachment sent" };
}

export async function closeEnquiry(
  enquiryId: string,
  role: "seeker" | "provider"
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const enquiry = await getEnquiryForUser(enquiryId, user.id);
  if (!enquiry) return { ok: false, error: "Enquiry not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("enquiries")
    .update({ status: "closed" })
    .eq("id", enquiryId);

  if (error) {
    console.error("closeEnquiry failed:", error.message);
    return { ok: false, error: "Could not close enquiry." };
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: role,
    action: "enquiry.closed",
    entity: "enquiry",
    entity_id: enquiryId,
  });

  revalidatePath(`/account/enquiries/${enquiryId}`);
  revalidatePath(`/provider/enquiries/${enquiryId}`);
  return { ok: true };
}
