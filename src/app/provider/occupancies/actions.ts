"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { featureEnabled } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";

export interface OccupancyActionResult {
  ok: boolean;
  message: string;
}

export async function createOccupancy(
  formData: FormData
): Promise<OccupancyActionResult> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  if (!(await featureEnabled("occupancy_records"))) {
    return { ok: false, message: "Occupancy records are not enabled." };
  }

  const spaceId = String(formData.get("space_id") ?? "");
  const occupantUserId = String(formData.get("occupant_user_id") ?? "");
  const occupantName = String(formData.get("occupant_name") ?? "").trim();
  const occupantContact = String(formData.get("occupant_contact") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const expectedEndDate = String(formData.get("expected_end_date") ?? "");
  const billingPeriod = String(formData.get("billing_period") ?? "monthly");
  const amount = Number(formData.get("amount") ?? 0);
  const deposit = formData.get("deposit") ? Number(formData.get("deposit")) : null;
  const paymentDueDay = formData.get("payment_due_day")
    ? Number(formData.get("payment_due_day"))
    : null;
  const noticeDays = formData.get("notice_period_days")
    ? Number(formData.get("notice_period_days"))
    : null;
  const includedServices = String(
    formData.get("included_services") ?? ""
  ).trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!spaceId || !occupantName || !startDate || !amount) {
    return {
      ok: false,
      message:
        "Please complete the space, occupant name, start date and amount.",
    };
  }

  const supabase = await createClient();
  const { data: occupancy, error } = await supabase
    .from("occupancies")
    .insert({
      space_id: spaceId,
      provider_id: user.id,
      start_date: startDate,
      expected_end_date: expectedEndDate || null,
      billing_period: billingPeriod,
      agreed_amount_mwk: amount,
      deposit_amount_mwk: deposit,
      payment_due_day: paymentDueDay,
      notice_period_days: noticeDays,
      included_services: includedServices || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !occupancy) {
    console.error("createOccupancy failed:", error?.message);
    return {
      ok: false,
      message:
        error?.message.includes("one_live_occupancy_per_space")
          ? "This space already has a live occupancy. Close it before creating a new one."
          : "Could not create the occupancy record. Please try again.",
    };
  }

  const { error: partiesError } = await supabase
    .from("occupancy_parties")
    .insert([
      {
        occupancy_id: occupancy.id,
        user_id: user.id,
        role: "provider",
        full_name: user.fullName || user.email || "Provider",
        confirmed_at: new Date().toISOString(),
        confirmation_method: "in_app",
      },
      {
        occupancy_id: occupancy.id,
        user_id: occupantUserId || null,
        role: "occupant",
        full_name: occupantName,
        contact: occupantContact || null,
      },
    ]);

  if (partiesError) {
    console.error("createOccupancy parties failed:", partiesError.message);
    return {
      ok: false,
      message: "The record was created but parties could not be saved.",
    };
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: "provider",
    action: "occupancy.created",
    entity: "occupancy",
    entity_id: occupancy.id,
    after_state: { space_id: spaceId, amount_mwk: amount },
  });

  revalidatePath("/provider/occupancies");
  redirect(`/provider/occupancies/${occupancy.id}`);
}

async function transitionOccupancy(
  occupancyId: string,
  updates: Record<string, unknown>,
  action: string
): Promise<OccupancyActionResult> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("occupancies")
    .update(updates)
    .eq("id", occupancyId);

  if (error) {
    console.error(`${action} failed:`, error.message);
    return { ok: false, message: "Could not update the occupancy record." };
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action,
    entity: "occupancy",
    entity_id: occupancyId,
    after_state: updates,
  });

  revalidatePath("/provider/occupancies");
  revalidatePath(`/provider/occupancies/${occupancyId}`);
  revalidatePath("/account/occupancy");
  return { ok: true, message: "Occupancy updated." };
}

// Provider records that the occupant (who has no account) confirmed in person.
export async function recordInPersonConfirmation(
  occupancyId: string
): Promise<OccupancyActionResult> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: party } = await supabase
    .from("occupancy_parties")
    .select("id, user_id")
    .eq("occupancy_id", occupancyId)
    .eq("role", "occupant")
    .maybeSingle();

  if (!party) {
    return { ok: false, message: "No occupant recorded on this occupancy." };
  }
  if (party.user_id) {
    return {
      ok: false,
      message:
        "This occupant has an account — they must confirm from their own account.",
    };
  }

  const { error } = await supabase
    .from("occupancy_parties")
    .update({
      confirmed_at: new Date().toISOString(),
      confirmation_method: "in_person",
    })
    .eq("id", party.id);

  if (error) {
    console.error("recordInPersonConfirmation failed:", error.message);
    return { ok: false, message: "Could not record the confirmation." };
  }

  return transitionOccupancy(
    occupancyId,
    { status: "active", activated_at: new Date().toISOString() },
    "occupancy.confirmed_in_person"
  );
}

export async function giveNotice(
  occupancyId: string
): Promise<OccupancyActionResult> {
  return transitionOccupancy(
    occupancyId,
    { status: "notice_given" },
    "occupancy.notice_given"
  );
}

export async function completeOccupancy(
  occupancyId: string
): Promise<OccupancyActionResult> {
  return transitionOccupancy(
    occupancyId,
    { status: "completed", closed_at: new Date().toISOString() },
    "occupancy.completed"
  );
}

export async function cancelOccupancy(
  occupancyId: string
): Promise<OccupancyActionResult> {
  return transitionOccupancy(
    occupancyId,
    { status: "cancelled", closed_at: new Date().toISOString() },
    "occupancy.cancelled"
  );
}
