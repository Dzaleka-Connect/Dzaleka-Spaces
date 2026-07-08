"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function updateProviderListing(
  listingId: string,
  formData: FormData
) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!isSupabaseConfigured()) redirect(`/provider/listings/${listingId}/edit?saved=demo`);

  const title = String(formData.get("title") ?? "").trim();
  const priceMwk = Number(formData.get("priceMwk") ?? 0);
  const depositRaw = String(formData.get("depositMwk") ?? "").trim();
  const billingPeriod = String(formData.get("billingPeriod") ?? "monthly");
  const availableFrom = String(formData.get("availableFrom") ?? "").trim();

  if (!title || !Number.isFinite(priceMwk) || priceMwk < 0) {
    redirect(`/provider/listings/${listingId}/edit?error=Valid%20title%20and%20amount%20required`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("listings")
    .update({
      title,
      price_mwk: priceMwk,
      deposit_mwk: depositRaw ? Number(depositRaw) : null,
      billing_period: billingPeriod,
      available_from: availableFrom || null,
    })
    .eq("id", listingId);

  if (error) {
    redirect(`/provider/listings/${listingId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/provider/listings");
  revalidatePath(`/provider/listings/${listingId}/preview`);
  redirect(`/provider/listings/${listingId}/edit?saved=1`);
}
