"use server";

import { randomUUID } from "node:crypto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Mirrors the DB function `listing_slug_from_title(title, listing_id)`. */
function listingSlug(title: string, listingId: string): string {
  return (
    (title || "listing")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    listingId.slice(0, 8)
  );
}

export interface SubmitSpaceResult {
  ok: boolean;
  message: string;
  spaceId?: string;
}

export async function submitSpace(formData: FormData): Promise<SubmitSpaceResult> {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const zone = String(formData.get("zone") ?? "").trim();
  const landmark = String(formData.get("landmark") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const deposit = formData.get("deposit") ? Number(formData.get("deposit")) : null;
  const billingPeriodRaw = String(formData.get("billing_period") ?? "monthly");
  const billingPeriod = ["daily", "weekly", "monthly"].includes(billingPeriodRaw)
    ? billingPeriodRaw
    : "monthly";
  const minStayDays = formData.get("min_stay_days") ? Number(formData.get("min_stay_days")) : null;
  const maxStayDays = formData.get("max_stay_days") ? Number(formData.get("max_stay_days")) : null;
  const authorityBasis = String(formData.get("authority_basis") ?? "").trim();
  const facilities = formData.getAll("facilities").map(String);

  if (!title || !category || !zone || !landmark || !description || !price) {
    return { ok: false, message: "Please complete all required fields." };
  }
  if (
    (minStayDays !== null && (!Number.isInteger(minStayDays) || minStayDays < 1)) ||
    (maxStayDays !== null && (!Number.isInteger(maxStayDays) || maxStayDays < 1)) ||
    (minStayDays !== null && maxStayDays !== null && maxStayDays < minStayDays)
  ) {
    return {
      ok: false,
      message: "Stay length must be whole days, with the maximum at least the minimum.",
    };
  }
  if (!authorityBasis) {
    return {
      ok: false,
      message: "Please state the basis on which you are authorised to offer this space.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message:
        "Demo mode: submission recorded locally. Connect Supabase to save listings for review.",
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return {
      ok: false,
      message: "Please sign in before listing a space.",
    };
  }

  const userId = claimsData.claims.sub;

  const { data: zoneRow, error: zoneError } = await supabase
    .from("zones")
    .select("id")
    .eq("name", zone)
    .maybeSingle();

  if (zoneError || !zoneRow) {
    return { ok: false, message: "Please select a valid zone." };
  }

  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .insert({
      provider_id: userId,
      category,
      zone_id: zoneRow.id,
      landmark,
      description,
      facilities,
    })
    .select("id")
    .single();

  if (spaceError || !space) {
    console.error("submitSpace space insert failed:", spaceError?.message);
    return { ok: false, message: "Could not save the space. Please try again." };
  }

  const { error: internalError } = await supabase.from("space_internal").insert({
    space_id: space.id,
    authority_basis: authorityBasis,
  });
  if (internalError) {
    console.error("submitSpace authority insert failed:", internalError.message);
  }

  const listingId = randomUUID();
  const slug = listingSlug(title, listingId);

  const { error: listingError } = await supabase.from("listings").insert({
    id: listingId,
    space_id: space.id,
    title,
    slug,
    price_mwk: price,
    deposit_mwk: deposit,
    billing_period: billingPeriod,
    min_stay_days: minStayDays,
    max_stay_days: maxStayDays,
    status: "pending_review",
  });

  if (listingError) {
    console.error("submitSpace listing insert failed:", listingError.message);
    return {
      ok: false,
      message: "Could not save the listing. Please try again.",
    };
  }

  return {
    ok: true,
    message:
      "Space submitted. A field representative will contact you to arrange verification before it is published.",
    spaceId: space.id,
  };
}
