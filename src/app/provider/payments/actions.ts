"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { recordPayment, confirmPayment, rejectPayment, type PaymentMethod } from "@/lib/payments";

export async function recordPaymentAction(prevState: unknown, formData: FormData) {
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
    null, // recorded by provider manually
    amount,
    paymentDate,
    method as PaymentMethod,
    externalReference,
    notes,
    "provider"
  );

  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to record payment." };
  }

  revalidatePath(`/provider/payments`);
  revalidatePath(`/provider/occupancies/${occupancyId}`);
  return { ok: true, message: "Payment recorded successfully." };
}

export async function confirmPaymentAction(paymentId: string, occupancyId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const res = await confirmPayment(paymentId, "provider");
  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to confirm payment." };
  }

  revalidatePath(`/provider/payments`);
  revalidatePath(`/provider/occupancies/${occupancyId}`);
  return { ok: true, message: "Payment confirmed." };
}

export async function rejectPaymentAction(paymentId: string, occupancyId: string, reason: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const res = await rejectPayment(paymentId, reason);
  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to reject payment." };
  }

  revalidatePath(`/provider/payments`);
  revalidatePath(`/provider/occupancies/${occupancyId}`);
  return { ok: true, message: "Payment rejected." };
}
