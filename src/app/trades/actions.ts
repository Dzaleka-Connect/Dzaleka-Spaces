"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
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
