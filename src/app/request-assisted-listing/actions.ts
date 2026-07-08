"use server";

import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface AssistedListingResult {
  ok: boolean;
  message: string;
}

export async function requestAssistedListing(
  formData: FormData
): Promise<AssistedListingResult> {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const zone = String(formData.get("zone") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !contact) {
    return { ok: false, message: "Please provide your name and a contact." };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message:
        "Demo mode: request recorded locally. Connect Supabase to deliver requests to the field team.",
    };
  }

  const supabase = await createClient();
  const user = await getSessionUser();

  let zoneId: string | null = null;
  if (zone) {
    const { data: zoneRow } = await supabase
      .from("zones")
      .select("id")
      .eq("name", zone)
      .maybeSingle();
    zoneId = zoneRow?.id ?? null;
  }

  const { error } = await supabase.from("assisted_listing_requests").insert({
    requester_name: name,
    contact,
    zone_id: zoneId,
    category: category || null,
    notes: notes || null,
    requester_id: user?.id ?? null,
  });

  if (error) {
    console.error("requestAssistedListing failed:", error.message);
    return {
      ok: false,
      message: "Something went wrong. Please try again or call support.",
    };
  }

  return {
    ok: true,
    message:
      "Request received. A field representative will contact you to arrange a visit.",
  };
}
