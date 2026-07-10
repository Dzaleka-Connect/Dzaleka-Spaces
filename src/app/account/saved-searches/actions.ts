"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { featureEnabled } from "@/lib/features";
import type { ListingFilters } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/account/enquiries/actions";

export async function saveSearch(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const channel = String(formData.get("channel") ?? "email");
  const frequency = String(formData.get("frequency") ?? "weekly");
  const criteriaRaw = String(formData.get("criteria") ?? "{}");

  if (!name) return { ok: false, error: "Name is required." };
  if (!new Set(["email", "in_app"]).has(channel)) {
    return { ok: false, error: "Choose email or in-app notifications." };
  }
  if (!new Set(["daily", "weekly", "instant"]).has(frequency)) {
    return { ok: false, error: "Choose a valid notification frequency." };
  }

  let criteria: ListingFilters = {};
  try {
    criteria = JSON.parse(criteriaRaw) as ListingFilters;
  } catch {
    return { ok: false, error: "Invalid search criteria." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const alertsEnabled = await featureEnabled("saved_search_alerts");

  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    name,
    criteria,
    channel,
    frequency,
    paused: !alertsEnabled,
  });

  if (error) {
    console.error("saveSearch failed:", error.message);
    return { ok: false, error: "Could not save search." };
  }

  revalidatePath("/account/saved-searches");
  return { ok: true };
}

export async function toggleSavedSearch(searchId: string, paused: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_searches")
    .update({ paused })
    .eq("id", searchId)
    .eq("user_id", user.id);

  if (error) {
    console.error("toggleSavedSearch failed:", error.message);
    return { ok: false, error: "Could not update search." };
  }

  revalidatePath("/account/saved-searches");
  return { ok: true };
}

export async function deleteSavedSearch(searchId: string) {
  if (!isSupabaseConfigured()) redirect("/account/saved-searches");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", searchId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/account/saved-searches?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account/saved-searches");
  redirect("/account/saved-searches?deleted=1");
}
