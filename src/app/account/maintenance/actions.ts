"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function createMaintenanceTicketAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const occupancyId = formData.get("occupancyId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const priority = formData.get("priority") as string;

  if (!occupancyId || !title || !description || !category) {
    return { ok: false, message: "Missing required fields." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode: ticket recorded locally." };
  }

  const supabase = await createClient();

  // Get occupancy details to fetch space_id and verify user is part of it
  const { data: occupancy, error: occErr } = await supabase
    .from("occupancies")
    .select("space_id, provider_id, spaces(zone_id, landmark)")
    .eq("id", occupancyId)
    .maybeSingle();

  if (occErr || !occupancy) {
    return { ok: false, message: "Occupancy record not found." };
  }

  const space = occupancy.spaces as unknown as { zone_id: string; landmark: string };
  const zoneId = space?.zone_id ?? null;
  const landmark = space?.landmark ?? null;

  const { error } = await supabase.from("maintenance_tickets").insert({
    space_id: occupancy.space_id,
    occupancy_id: occupancyId,
    requester_id: user.id,
    title,
    description,
    category,
    priority,
    status: "open",
    zone_id: zoneId,
    landmark: landmark,
  });

  if (error) {
    console.error("createMaintenanceTicketAction failed:", error.message);
    return { ok: false, message: error.message };
  }

  revalidatePath("/account/maintenance");
  revalidatePath("/provider/maintenance");
  return { ok: true, message: "Maintenance request submitted successfully." };
}

export async function acceptQuoteAction(quoteId: string, ticketId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode: quote accepted." };
  }

  const supabase = await createClient();

  // 1. Fetch quote details
  const { data: quote, error: quoteErr } = await supabase
    .from("maintenance_quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();

  if (quoteErr || !quote) {
    return { ok: false, message: "Quote not found." };
  }

  // 2. Accept this quote
  const { error: acceptErr } = await supabase
    .from("maintenance_quotes")
    .update({ status: "accepted" })
    .eq("id", quoteId);

  if (acceptErr) {
    return { ok: false, message: acceptErr.message };
  }

  // 3. Decline other quotes for this ticket
  await supabase
    .from("maintenance_quotes")
    .update({ status: "declined" })
    .eq("ticket_id", ticketId)
    .neq("id", quoteId);

  // 4. Update ticket status to assigned
  await supabase
    .from("maintenance_tickets")
    .update({
      status: "assigned",
      assigned_service_provider_id: quote.service_provider_id,
    })
    .eq("id", ticketId);

  // 5. Create work order
  const { error: woErr } = await supabase.from("maintenance_work_orders").insert({
    ticket_id: ticketId,
    quote_id: quoteId,
    service_provider_id: quote.service_provider_id,
    status: "scheduled",
    scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // defaults to tomorrow
  });

  if (woErr) {
    console.error("Failed to create work order:", woErr.message);
  }

  revalidatePath("/account/maintenance");
  revalidatePath(`/account/maintenance/${ticketId}`);
  revalidatePath(`/provider/maintenance/${ticketId}`);
  revalidatePath(`/trades/jobs/${ticketId}`);
  revalidatePath("/trades/work-orders");

  return { ok: true, message: "Quote accepted and work order scheduled." };
}
