import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "./supabase/admin";
import { sendTransactionalEmail, isEmailConfigured } from "./email/resend";

async function emailNotificationsEnabled(): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return true;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("name", "email_notifications")
    .maybeSingle();
  if (error) {
    console.error("emailNotificationsEnabled failed:", error.message);
    return true;
  }
  if (!data) return true;
  return Boolean(data.enabled);
}

interface QueueEmailInput {
  recipientUserId?: string | null;
  recipientEmail: string;
  templateKey: string;
  subject: string;
  bodyText: string;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
}

interface NotificationRow {
  id: string;
  recipient_email: string;
  template_key: string;
  subject: string;
  body_text: string;
  payload: Record<string, unknown> | null;
  attempts: number;
  idempotency_key: string;
}

function appUrl(path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, origin).toString();
}

export async function queueEmailNotification(input: QueueEmailInput) {
  if (!isSupabaseAdminConfigured()) return { ok: false, disabled: true };
  if (!(await emailNotificationsEnabled())) {
    return { ok: false, disabled: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("notification_queue").upsert(
    {
      recipient_user_id: input.recipientUserId ?? null,
      recipient_email: input.recipientEmail,
      template_key: input.templateKey,
      subject: input.subject,
      body_text: input.bodyText,
      payload: input.payload ?? {},
      idempotency_key: input.idempotencyKey,
    },
    { onConflict: "idempotency_key" }
  );

  if (error) {
    console.error("queueEmailNotification failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function queueEnquiryMessageEmail(
  enquiryId: string,
  senderRole: "seeker" | "provider"
) {
  if (!isSupabaseAdminConfigured()) return { ok: false, disabled: true };

  const supabase = createAdminClient();
  const { data: enquiry, error } = await supabase
    .from("enquiries")
    .select(
      "id, contact, seeker_id, listing_id, listings(title, spaces(provider_id))"
    )
    .eq("id", enquiryId)
    .maybeSingle();

  if (error || !enquiry) {
    if (error) console.error("queueEnquiryMessageEmail failed:", error.message);
    return { ok: false, error: "Enquiry not found." };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const listing = enquiry.listings as any;
  const providerId = listing?.spaces?.provider_id ?? null;
  const listingTitle = listing?.title ?? "a listing";
  const recipientUserId = senderRole === "seeker" ? providerId : enquiry.seeker_id;
  let recipientEmail: string | null = null;

  if (senderRole === "provider" && String(enquiry.contact).includes("@")) {
    recipientEmail = enquiry.contact;
  }

  if (!recipientEmail && recipientUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", recipientUserId)
      .maybeSingle();
    recipientEmail = profile?.email ?? null;
  }

  if (!recipientEmail) return { ok: false, disabled: true };

  const path =
    senderRole === "seeker"
      ? `/provider/enquiries/${enquiryId}`
      : `/account/enquiries/${enquiryId}`;
  const url = appUrl(path);

  return queueEmailNotification({
    recipientUserId,
    recipientEmail,
    templateKey: "enquiry_message",
    subject: `New message about ${listingTitle}`,
    bodyText: `You have a new Dzaleka Spaces message about ${listingTitle}.\n\nOpen ${url} to reply.`,
    payload: { enquiryId, listingTitle, url },
    idempotencyKey: `enquiry-message/${enquiryId}/${senderRole}/${Date.now()}`,
  });
}

export async function processPendingNotifications(limit = 20) {
  if (!isSupabaseAdminConfigured()) {
    return { processed: 0, sent: 0, failed: 0, disabled: true };
  }
  if (!(await emailNotificationsEnabled())) {
    return { processed: 0, sent: 0, failed: 0, disabled: true };
  }
  if (!isEmailConfigured()) {
    return { processed: 0, sent: 0, failed: 0, disabled: true };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_queue")
    .select(
      "id, recipient_email, template_key, subject, body_text, payload, attempts, idempotency_key"
    )
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("processPendingNotifications read failed:", error.message);
    return { processed: 0, sent: 0, failed: 0, error: error.message };
  }

  let sent = 0;
  let failed = 0;
  const rows = (data ?? []) as NotificationRow[];

  for (const row of rows) {
    await supabase
      .from("notification_queue")
      .update({
        status: "processing",
        locked_at: new Date().toISOString(),
        attempts: row.attempts + 1,
      })
      .eq("id", row.id);

    const result = await sendTransactionalEmail({
      to: row.recipient_email,
      subject: row.subject,
      text: row.body_text,
      idempotencyKey: row.idempotency_key,
      tags: [
        { name: "template", value: row.template_key },
        { name: "queue_id", value: row.id },
      ],
    });

    await supabase.from("notification_deliveries").insert({
      queue_id: row.id,
      provider: "resend",
      provider_message_id: result.providerMessageId ?? null,
      status: result.ok ? "sent" : "failed",
      error: result.error ?? null,
    });

    if (result.ok) {
      sent += 1;
      await supabase
        .from("notification_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);
    } else {
      failed += 1;
      const delayMinutes = Math.min(60, Math.pow(2, row.attempts));
      await supabase
        .from("notification_queue")
        .update({
          status: row.attempts >= 4 ? "failed" : "pending",
          error: result.error ?? "Email send failed.",
          next_attempt_at: new Date(
            Date.now() + delayMinutes * 60 * 1000
          ).toISOString(),
        })
        .eq("id", row.id);
    }
  }

  return { processed: rows.length, sent, failed };
}
