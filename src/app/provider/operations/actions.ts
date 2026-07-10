"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProviderSpace(spaceId: string, formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const landmark = String(formData.get("landmark") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const capacityValue = String(formData.get("capacity") ?? "").trim();
  if (landmark.length < 3 || description.length < 20) {
    redirect(
      `/provider/spaces/${spaceId}/edit?error=Provide%20a%20landmark%20and%20complete%20description`
    );
  }
  const capacity = capacityValue ? Number.parseInt(capacityValue, 10) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000)) {
    redirect(`/provider/spaces/${spaceId}/edit?error=Capacity%20must%20be%20a%20positive%20number`);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("spaces")
    .update({ landmark, description, capacity })
    .eq("id", spaceId);
  if (error) {
    console.error("updateProviderSpace failed:", error.message);
    redirect(
      `/provider/spaces/${spaceId}/edit?error=${encodeURIComponent("Could not update this space")}`
    );
  }
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: "space.updated",
    entity: "space",
    entity_id: spaceId,
    after_state: { landmark, capacity },
  });
  revalidatePath(`/provider/spaces/${spaceId}`);
  revalidatePath("/provider/spaces");
  redirect(`/provider/spaces/${spaceId}?saved=1`);
}

export async function createProviderExpense(_previous: unknown, formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Please sign in." };
  const amount = Number.parseInt(String(formData.get("amount_mwk") ?? ""), 10);
  const occurredOn = String(formData.get("occurred_on") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!Number.isInteger(amount) || amount <= 0 || !occurredOn || category.length < 2)
    return { ok: false, message: "Amount, date and category are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("provider_expenses").insert({
    provider_id: user.id,
    amount_mwk: amount,
    occurred_on: occurredOn,
    category,
    description: description || null,
  });
  if (error) {
    console.error("createProviderExpense failed:", error.message);
    return { ok: false, message: "Could not record the expense." };
  }
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: "provider_expense.recorded",
    entity: "provider_expense",
    meta: { amount_mwk: amount, category },
  });
  revalidatePath("/provider/expenses");
  return { ok: true, message: "Expense recorded." };
}
