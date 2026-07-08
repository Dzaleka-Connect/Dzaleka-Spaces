"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface SubmitSpaceResult {
  ok: boolean;
  message: string;
}

export async function submitSpace(
  formData: FormData
): Promise<SubmitSpaceResult> {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const zone = String(formData.get("zone") ?? "").trim();
  const landmark = String(formData.get("landmark") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const deposit = formData.get("deposit")
    ? Number(formData.get("deposit"))
    : null;
  const billingPeriod = String(formData.get("billing_period") ?? "monthly");
  const authorityBasis = String(formData.get("authority_basis") ?? "").trim();
  const facilities = formData.getAll("facilities").map(String);

  if (!title || !category || !zone || !landmark || !description || !price) {
    return { ok: false, message: "Please complete all required fields." };
  }
  if (!authorityBasis) {
    return {
      ok: false,
      message:
        "Please state the basis on which you are authorised to offer this space.",
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in before listing a space.",
    };
  }

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
      provider_id: user.id,
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

  const { error: listingError } = await supabase.from("listings").insert({
    space_id: space.id,
    title,
    price_mwk: price,
    deposit_mwk: deposit,
    billing_period: billingPeriod,
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
  };
}
