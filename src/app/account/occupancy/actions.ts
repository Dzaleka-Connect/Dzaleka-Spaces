"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ConfirmResult {
  ok: boolean;
  message: string;
}

// The occupant confirms the arrangement from their own account.
export async function confirmOccupancy(occupancyId: string): Promise<ConfirmResult> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: party } = await supabase
    .from("occupancy_parties")
    .select("id, confirmed_at")
    .eq("occupancy_id", occupancyId)
    .eq("role", "occupant")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!party) {
    return { ok: false, message: "You are not the occupant on this record." };
  }
  if (party.confirmed_at) {
    return { ok: true, message: "Already confirmed." };
  }

  const { error: partyError } = await supabase
    .from("occupancy_parties")
    .update({
      confirmed_at: new Date().toISOString(),
      confirmation_method: "in_app",
    })
    .eq("id", party.id);

  if (partyError) {
    console.error("confirmOccupancy party failed:", partyError.message);
    return { ok: false, message: "Could not record your confirmation." };
  }

  const { error } = await supabase
    .from("occupancies")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("id", occupancyId)
    .eq("status", "awaiting_occupant_confirmation");

  if (error) {
    console.error("confirmOccupancy status failed:", error.message);
    return { ok: false, message: "Could not activate the occupancy." };
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: "occupant",
    action: "occupancy.confirmed_in_app",
    entity: "occupancy",
    entity_id: occupancyId,
  });

  revalidatePath("/account/occupancy");
  revalidatePath(`/provider/occupancies/${occupancyId}`);
  return {
    ok: true,
    message: "Confirmed. Both parties now hold the same written record.",
  };
}
