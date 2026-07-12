import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { PaymentRecord } from "@/lib/payments";
import { getPaymentForUser } from "@/lib/payments";
import {
  DzalekaPayApiError,
  isDzalekaPayTransactionId,
  reconciliationStatus,
  type DzalekaPayTransaction,
} from "./contract";
import {
  dzalekaPayMerchantId,
  dzalekaPayReconciliationEnabled,
  getDzalekaPayTransaction,
} from "./server";

export interface DzalekaPayReconciliationResult {
  ok: boolean;
  message: string;
  status?: ReturnType<typeof reconciliationStatus>;
}

function clientMessage(error: unknown): string {
  if (error instanceof DzalekaPayApiError) {
    if (error.status === 401 || error.status === 403) {
      return "DzalekaPay verification is unavailable. Staff must check the merchant connection.";
    }
    if (error.status === 404) return "DzalekaPay could not find this transaction for this store.";
    if (error.status === 429) return "DzalekaPay is rate-limiting checks. Try again later.";
    return error.message;
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "The DzalekaPay check timed out. The payment remains unverified, not failed.";
  }
  return "DzalekaPay could not verify this transaction right now.";
}

async function persistReconciliation(payment: PaymentRecord, transaction: DzalekaPayTransaction) {
  if (!isSupabaseAdminConfigured()) throw new Error("Database service connection is unavailable.");
  const merchantId = dzalekaPayMerchantId();
  if (!merchantId || transaction.merchantId !== merchantId) {
    throw new Error("DzalekaPay returned a transaction for a different merchant.");
  }

  const status = reconciliationStatus(
    transaction.status,
    transaction.amountMwk === payment.amountMwk
  );
  const { error } = await createAdminClient().rpc("record_dzalekapay_reconciliation", {
    payment: payment.id,
    transaction_id_value: transaction.id,
    merchant_id_value: transaction.merchantId,
    provider_status_value: transaction.status,
    provider_amount_mwk: transaction.amountMwk,
    provider_reference: transaction.reference,
    provider_created: transaction.createdAt,
    provider_updated: transaction.updatedAt,
  });
  if (error) throw new Error("Could not save the DzalekaPay verification result.");
  return status;
}

export async function reconcileRecordedDzalekaPayPayment(
  payment: PaymentRecord
): Promise<DzalekaPayReconciliationResult> {
  if (payment.method !== "dzalekapay") {
    return { ok: false, message: "This payment does not use DzalekaPay." };
  }
  if (!payment.externalReference || !isDzalekaPayTransactionId(payment.externalReference)) {
    return { ok: false, message: "Enter the DzalekaPay transaction ID, not a receipt reference." };
  }
  if (!dzalekaPayReconciliationEnabled()) {
    return { ok: false, message: "DzalekaPay reconciliation is not enabled." };
  }

  try {
    const transaction = await getDzalekaPayTransaction(payment.externalReference);
    if (transaction.id !== payment.externalReference) {
      return { ok: false, message: "DzalekaPay returned a different transaction." };
    }
    const status = await persistReconciliation(payment, transaction);
    if (status === "verified") {
      return {
        ok: true,
        status,
        message:
          "DzalekaPay confirms this external transaction and amount. Both parties must still confirm the payment record.",
      };
    }
    if (status === "amount_mismatch") {
      return {
        ok: false,
        status,
        message: "The amount recorded here does not match DzalekaPay. Do not confirm this record.",
      };
    }
    return {
      ok: true,
      status,
      message: `DzalekaPay currently reports this transaction as ${transaction.status}.`,
    };
  } catch (error) {
    return { ok: false, message: clientMessage(error) };
  }
}

export async function reconcileDzalekaPayPaymentForUser(
  paymentId: string,
  userId: string
): Promise<DzalekaPayReconciliationResult> {
  const payment = await getPaymentForUser(paymentId, userId);
  if (!payment) return { ok: false, message: "Payment record not found." };
  return reconcileRecordedDzalekaPayPayment(payment);
}
