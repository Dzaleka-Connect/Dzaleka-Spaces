"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createCharge, voidCharge } from "@/lib/payments";

export async function createChargeAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const occupancyId = formData.get("occupancyId") as string;
  const amountStr = formData.get("amount") as string;
  const dueDate = formData.get("dueDate") as string;
  const description = formData.get("description") as string;

  if (!occupancyId || !amountStr || !dueDate) {
    return { ok: false, message: "Missing required fields." };
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }

  const res = await createCharge(occupancyId, amount, dueDate, description);
  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to create charge." };
  }

  revalidatePath(`/provider/charges`);
  revalidatePath(`/provider/occupancies/${occupancyId}`);
  return { ok: true, message: "Charge scheduled successfully." };
}

export async function voidChargeAction(chargeId: string, occupancyId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const res = await voidCharge(chargeId);
  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to void charge." };
  }

  revalidatePath(`/provider/charges`);
  revalidatePath(`/provider/occupancies/${occupancyId}`);
  return { ok: true, message: "Charge marked as void." };
}
