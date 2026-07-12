import { isDzalekaPayTransactionId } from "@/lib/dzalekapay/contract";
import { dzalekaPayMerchantId, dzalekaPayWebhookConfigured } from "@/lib/dzalekapay/server";
import {
  parseDzalekaPayWebhook,
  verifyDzalekaPayWebhookSignature,
} from "@/lib/dzalekapay/webhooks";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const secret = process.env.DZALEKAPAY_WEBHOOK_SECRET;
  const merchantId = dzalekaPayMerchantId();
  if (!secret || !merchantId || !dzalekaPayWebhookConfigured() || !isSupabaseAdminConfigured()) {
    return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const deliveryId = request.headers.get("x-dzalekapay-delivery");
  const signature = request.headers.get("x-dzalekapay-signature");
  if (!deliveryId || !isDzalekaPayTransactionId(deliveryId) || !signature) {
    return Response.json({ error: "Missing or invalid signature headers." }, { status: 400 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.length === 0 || rawBody.length > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Invalid payload size." }, { status: 413 });
  }
  if (!verifyDzalekaPayWebhookSignature(rawBody, signature, secret)) {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event;
  try {
    event = parseDzalekaPayWebhook(rawBody.toString("utf8"));
  } catch {
    return Response.json({ error: "Invalid event payload." }, { status: 400 });
  }
  if (event.id !== deliveryId || event.data.merchantId !== merchantId) {
    return Response.json({ error: "Event does not match this endpoint." }, { status: 400 });
  }

  const { data, error } = await createAdminClient().rpc("record_dzalekapay_webhook_event", {
    delivery_id_value: deliveryId,
    event_type_value: event.type,
    transaction_id_value: event.data.id,
    merchant_id_value: event.data.merchantId,
    provider_status_value: event.data.status,
    provider_amount_mwk: event.data.amountMwk,
    provider_reference: event.data.reference,
    event_created: event.createdAt,
    provider_created: event.data.createdAt,
    provider_updated: event.data.updatedAt,
  });
  if (error) {
    console.error("DzalekaPay webhook persistence failed.");
    return Response.json({ error: "Could not persist event." }, { status: 500 });
  }

  const result = data as { inserted?: boolean; matched?: boolean } | null;
  return Response.json({
    accepted: true,
    duplicate: result?.inserted === false,
    matched: result?.matched === true,
  });
}
