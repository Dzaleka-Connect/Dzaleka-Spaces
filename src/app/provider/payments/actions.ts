"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  PAYMENT_METHODS,
  recordPayment,
  confirmPayment,
  rejectPayment,
  type PaymentMethod,
} from "@/lib/payments";

export async function recordPaymentAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Unauthorized." };

  const occupancyId = formData.get("occupancyId") as string;
  const amountStr = formData.get("amount") as string;
  const paymentDate = formData.get("paymentDate") as string;
  const method = formData.get("method") as string;
  const externalReference = formData.get("externalReference") as string;
  const notes = formData.get("notes") as string;
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

  if (!occupancyId || !amountStr || !paymentDate || !method) {
    return { ok: false, message: "Missing required fields." };
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    return { ok: false, message: "Choose a valid payment method." };
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idempotencyKey
    )
  ) {
    return { ok: false, message: "This payment form has expired. Reload and try again." };
  }

  const res = await recordPayment(
    occupancyId,
    null, // recorded by provider manually
    amount,
    paymentDate,
    method as PaymentMethod,
    externalReference,
    notes,
    "provider",
    idempotencyKey
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
