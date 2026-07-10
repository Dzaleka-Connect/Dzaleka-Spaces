import { Resend } from "resend";
import { isResendDeliveryEvent } from "@/lib/email/delivery-events";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type VerifiedEvent = {
  type: string;
  created_at: string;
  data: { email_id?: string };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY || !isSupabaseAdminConfigured()) {
    return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const eventId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!eventId || !timestamp || !signature) {
    return Response.json({ error: "Missing signature headers." }, { status: 400 });
  }

  const payload = await request.text();
  let event: VerifiedEvent;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: {
        id: eventId,
        timestamp,
        signature,
      },
      webhookSecret: secret,
    }) as VerifiedEvent;
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const messageId = event.data?.email_id;
  if (!messageId || !isResendDeliveryEvent(event.type)) {
    return Response.json({ accepted: true, processed: false });
  }

  const occurredAt = new Date(event.created_at);
  if (!Number.isFinite(occurredAt.getTime())) {
    return Response.json({ error: "Invalid event timestamp." }, { status: 400 });
  }

  const { data, error } = await createAdminClient().rpc("record_resend_delivery_event", {
    provider_event_id: eventId,
    message_id: messageId,
    delivery_event_type: event.type,
    event_time: occurredAt.toISOString(),
  });
  if (error) {
    console.error("Resend webhook persistence failed:", error.message);
    return Response.json({ error: "Could not persist event." }, { status: 500 });
  }
  return Response.json({ accepted: true, processed: Boolean(data) });
}
