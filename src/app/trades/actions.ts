"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getMaintenanceTicketAccess } from "@/lib/trades";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function csv(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveTradeProfile(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  if (!isSupabaseConfigured()) redirect("/trades/profile?saved=demo");

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) redirect("/trades/profile?error=Display%20name%20is%20required");

  const supabase = await createClient();
  const { error } = await supabase.from("service_provider_profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    bio: String(formData.get("bio") ?? "").trim() || null,
    categories: csv(formData.get("categories")),
    zones_served: csv(formData.get("zonesServed")),
    languages: csv(formData.get("languages")),
    phone: String(formData.get("phone") ?? "").trim() || null,
    status: String(formData.get("status") ?? "draft"),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/trades/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/trades");
  revalidatePath("/trades/profile");
  redirect("/trades/profile?saved=1");
}

export async function createMaintenanceQuote(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const amountMwk = Number(formData.get("amountMwk") ?? 0);
  if (!ticketId || !Number.isFinite(amountMwk) || amountMwk < 0) {
    redirect("/trades/quotes/new?error=Valid%20job%20and%20amount%20required");
  }

  if (!isSupabaseConfigured()) redirect("/trades/quotes?created=demo");

  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_quotes").insert({
    ticket_id: ticketId,
    service_provider_id: user.id,
    amount_mwk: amountMwk,
    timeline: String(formData.get("timeline") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: "submitted",
  });

  if (error) {
    redirect(`/trades/quotes/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/trades/quotes");
  revalidatePath(`/trades/jobs/${ticketId}`);
  redirect("/trades/quotes?created=1");
}

export interface TradeActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function sendMaintenanceMessage(
  ticketId: string,
  formData: FormData
): Promise<TradeActionResult> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Message is required." };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!isSupabaseConfigured()) return { ok: true, message: body };

  const access = await getMaintenanceTicketAccess(ticketId, user);
  if (!access?.role) {
    return { ok: false, error: "You cannot message on this job." };
  }

  const workOrderId = String(formData.get("workOrderId") ?? "").trim() || null;
  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_messages").insert({
    ticket_id: ticketId,
    work_order_id: workOrderId,
    sender_id: user.id,
    sender_role: access.role,
    body,
  });

  if (error) {
    console.error("sendMaintenanceMessage failed:", error.message);
    return { ok: false, error: "Could not send message." };
  }

  revalidatePath("/trades/messages");
  revalidatePath(`/trades/messages/${ticketId}`);
  revalidatePath(`/trades/jobs/${ticketId}`);
  return { ok: true, message: body };
}

export async function createMaintenanceReview(formData: FormData): Promise<TradeActionResult> {
  const workOrderId = String(formData.get("workOrderId") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!workOrderId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choose a work order and rating from 1 to 5." };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode: review recorded locally." };
  }

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("maintenance_work_orders")
    .select("id, ticket_id, service_provider_id, status, maintenance_tickets!inner(requester_id)")
    .eq("id", workOrderId)
    .eq("status", "completed")
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, error: "Completed work order not found." };
  }

  const ticket = Array.isArray(order.maintenance_tickets)
    ? order.maintenance_tickets[0]
    : order.maintenance_tickets;
  if (ticket?.requester_id !== user.id) {
    return { ok: false, error: "Only the requester can leave a review." };
  }

  const { error } = await supabase.from("maintenance_reviews").insert({
    work_order_id: workOrderId,
    ticket_id: order.ticket_id,
    reviewer_id: user.id,
    service_provider_id: order.service_provider_id,
    rating,
    comment,
  });

  if (error) {
    console.error("createMaintenanceReview failed:", error.message);
    return {
      ok: false,
      error: error.message.includes("duplicate")
        ? "This work order already has a review."
        : "Could not save review.",
    };
  }

  revalidatePath("/trades/reviews");
  revalidatePath(`/trades/work-orders/${workOrderId}`);
  return { ok: true };
}

export async function uploadMaintenanceDocument(formData: FormData): Promise<TradeActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const workOrderId = String(formData.get("workOrderId") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "evidence").trim() || "evidence";
  const file = formData.get("file");

  if (!ticketId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Job and file are required." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File must be 10 MB or smaller." };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode: document not stored." };
  }

  const access = await getMaintenanceTicketAccess(ticketId, user);
  if (!access?.role) {
    return { ok: false, error: "You cannot upload documents for this job." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const path = `${ticketId}/${user.id}/${crypto.randomUUID()}-${safeName}`;
  const supabase = await createClient();
  const upload = await supabase.storage.from("maintenance-private").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });

  if (upload.error) {
    console.error("maintenance document upload failed:", upload.error.message);
    return { ok: false, error: "Could not upload file." };
  }

  const { error } = await supabase.from("maintenance_documents").insert({
    ticket_id: ticketId,
    work_order_id: workOrderId,
    uploader_id: user.id,
    kind,
    file_name: file.name.slice(0, 180),
    content_type: file.type || null,
    byte_size: file.size,
    bucket: "maintenance-private",
    storage_path: path,
  });

  if (error) {
    console.error("maintenance document insert failed:", error.message);
    return { ok: false, error: "Could not save document metadata." };
  }

  revalidatePath("/trades/documents");
  revalidatePath(`/trades/jobs/${ticketId}`);
  if (workOrderId) revalidatePath(`/trades/work-orders/${workOrderId}`);
  return { ok: true };
}

export async function completeWorkOrder(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const workOrderId = String(formData.get("workOrderId") ?? "").trim();
  const notes = String(formData.get("completionNotes") ?? "").trim() || null;
  if (!workOrderId) redirect("/trades/work-orders");

  if (!isSupabaseConfigured()) {
    redirect(`/trades/work-orders/${workOrderId}?completed=demo`);
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("maintenance_work_orders")
    .select("id, ticket_id, service_provider_id")
    .eq("id", workOrderId)
    .maybeSingle();

  if (!order || order.service_provider_id !== user.id) {
    redirect("/trades/work-orders");
  }

  const { error } = await supabase
    .from("maintenance_work_orders")
    .update({
      status: "completed",
      completion_notes: notes,
      completed_at: new Date().toISOString(),
    })
    .eq("id", workOrderId);

  if (error) {
    redirect(`/trades/work-orders/${workOrderId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/trades/work-orders");
  revalidatePath(`/trades/work-orders/${workOrderId}`);
  revalidatePath("/trades/reviews");
  redirect(`/trades/work-orders/${workOrderId}?completed=1`);
}
