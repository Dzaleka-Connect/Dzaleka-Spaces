"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isDzalekaPayTransactionId } from "@/lib/dzalekapay/contract";
import { reconcileRecordedDzalekaPayPayment } from "@/lib/dzalekapay/reconciliation";
import {
  PAYMENT_METHODS,
  recordPayment,
  confirmPayment,
  disputePayment,
  type PaymentMethod,
} from "@/lib/payments";

export async function occupantRecordPaymentAction(prevState: unknown, formData: FormData) {
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
  if (method === "dzalekapay" && !isDzalekaPayTransactionId(externalReference)) {
    return {
      ok: false,
      message: "Enter the DzalekaPay transaction ID, not the DZALEKA receipt reference.",
    };
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
    user.id,
    amount,
    paymentDate,
    method as PaymentMethod,
    externalReference,
    notes,
    "payer",
    idempotencyKey
  );

  if (!res.ok) {
    return { ok: false, message: res.error ?? "Failed to report payment." };
  }

  revalidatePath(`/account/payments`);
  revalidatePath(`/account/occupancy`);
  if (method === "dzalekapay" && res.payment) {
    const reconciliation = await reconcileRecordedDzalekaPayPayment(res.payment);
    return {
      ok: true,
      message: `Payment reported. ${reconciliation.message}`,
    };
  }
  return { ok: true, message: "Payment reported successfully. Awaiting provider confirmation." };
}

export async function occupantConfirmPaymentAction(paymentId: string) {
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

export async function occupantDisputePaymentAction(paymentId: string, reason: string) {
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
