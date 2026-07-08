"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface EnquiryResult {
  ok: boolean;
  message: string;
}

export async function submitEnquiry(
  listingId: string,
  formData: FormData
): Promise<EnquiryResult> {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const channel = String(formData.get("channel") ?? "whatsapp");
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !contact) {
    return { ok: false, message: "Please provide your name and a contact." };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message:
        "Demo mode: enquiry recorded locally. Connect Supabase to deliver enquiries to providers.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("enquiries").insert({
    listing_id: listingId,
    seeker_id: user?.id ?? null,
    name,
    contact,
    channel,
    message: message || null,
  });

  if (error) {
    console.error("submitEnquiry failed:", error.message);
    return {
      ok: false,
      message: "Something went wrong sending your enquiry. Please try again.",
    };
  }

  return {
    ok: true,
    message: "Enquiry sent. The provider will contact you to arrange a viewing.",
  };
}

export async function saveListing(listingId: string) {
  if (!isSupabaseConfigured()) {
    redirect(`/spaces/${listingId}?saved=demo`);
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("public_listings")
    .select("id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    redirect(
      `/spaces/${listingId}?error=${encodeURIComponent("Listing not found.")}`
    );
  }

  const { error } = await supabase.from("saved_listings").upsert({
    user_id: user.id,
    listing_id: listingId,
  });

  if (error) {
    console.error("saveListing failed:", error.message);
    redirect(`/spaces/${listingId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath("/account/saved-spaces");
  redirect(`/spaces/${listingId}?saved=1`);
}

export async function removeSavedListing(listingId: string) {
  if (!isSupabaseConfigured()) redirect("/account/saved-spaces");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", listingId);

  if (error) {
    console.error("removeSavedListing failed:", error.message);
    redirect(`/account/saved-spaces?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath("/account/saved-spaces");
  redirect("/account/saved-spaces?removed=1");
}

export async function reportListing(listingId: string, formData: FormData) {
  const details = String(formData.get("details") ?? "").trim();
  if (details.length < 10) {
    redirect(
      `/spaces/${listingId}?error=${encodeURIComponent(
        "Please add a short report summary."
      )}`
    );
  }

  if (!isSupabaseConfigured()) {
    redirect(`/spaces/${listingId}?reported=demo`);
  }

  const supabase = await createClient();
  const user = await getSessionUser();
  const { data: listing } = await supabase
    .from("public_listings")
    .select("id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    redirect(
      `/spaces/${listingId}?error=${encodeURIComponent("Listing not found.")}`
    );
  }

  const { error } = await supabase.from("reports").insert({
    listing_id: listingId,
    reporter_id: user?.id ?? null,
    reason: "other",
    details,
  });

  if (error) {
    console.error("reportListing failed:", error.message);
    redirect(`/spaces/${listingId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/spaces/${listingId}?reported=1`);
}
