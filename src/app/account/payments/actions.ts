"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { recordPayment, confirmPayment, disputePayment, type PaymentMethod } from "@/lib/payments";

export async function tenantRecordPaymentAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const occupancyId = formData.get("occupancyId") as string;
  const amountStr = formData.get("amount") as string;
  const paymentDate = formData.get("paymentDate") as string;
  const method = formData.get("method") as string;
  const externalReference = formData.get("externalReference") as string;
  const notes = formData.get("notes") as string;

  if (!occupancyId || !amountStr || !paymentDate || !method) {
    return { ok: false, message: "Missing required fields." };
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }

  const res = await recordPayment(
    occupancyId,
    user.id,
    amount,
    paymentDate,
    method as PaymentMethod,
    externalReference,
    notes,
    "payer"
  );

  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to report payment." };
  }

  revalidatePath(`/account/payments`);
  revalidatePath(`/account/occupancy`);
  return { ok: true, message: "Payment reported successfully. Awaiting provider confirmation." };
}

export async function tenantConfirmPaymentAction(paymentId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const res = await confirmPayment(paymentId, "occupant");
  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to confirm payment." };
  }

  revalidatePath(`/account/payments`);
  revalidatePath(`/account/occupancy`);
  return { ok: true, message: "Payment confirmed." };
}

export async function tenantDisputePaymentAction(paymentId: string, reason: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const res = await disputePayment(paymentId, reason);
  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to register dispute." };
  }

  revalidatePath(`/account/payments`);
  revalidatePath(`/account/occupancy`);
  return { ok: true, message: "Dispute registered." };
}
