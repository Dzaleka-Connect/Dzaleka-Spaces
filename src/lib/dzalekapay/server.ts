import "server-only";

import {
  DZALEKAPAY_BASE_URL,
  isDzalekaPayTransactionId,
  requestDzalekaPayTransaction,
} from "./contract";

export function dzalekaPayReconciliationEnabled(): boolean {
  return process.env.DZALEKAPAY_RECONCILIATION_ENABLED === "true";
}

export function dzalekaPayReconciliationConfigured(): boolean {
  return Boolean(
    dzalekaPayReconciliationEnabled() &&
    process.env.DZALEKAPAY_API_KEY?.startsWith("dzp_live_") &&
    process.env.DZALEKAPAY_MERCHANT_ID &&
    isDzalekaPayTransactionId(process.env.DZALEKAPAY_MERCHANT_ID)
  );
}

export function dzalekaPayWebhookConfigured(): boolean {
  return Boolean(
    dzalekaPayReconciliationConfigured() &&
    process.env.DZALEKAPAY_WEBHOOK_SECRET?.startsWith("whsec_")
  );
}

export function dzalekaPayMerchantId(): string | null {
  const value = process.env.DZALEKAPAY_MERCHANT_ID;
  return value && isDzalekaPayTransactionId(value) ? value : null;
}

function dzalekaPayBaseUrl(): string {
  const value = process.env.DZALEKAPAY_BASE_URL ?? DZALEKAPAY_BASE_URL;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("DzalekaPay base URL must be an HTTPS origin.");
  }
  return url.origin;
}

export async function getDzalekaPayTransaction(transactionId: string) {
  if (!dzalekaPayReconciliationConfigured() || !process.env.DZALEKAPAY_API_KEY) {
    throw new Error("DzalekaPay reconciliation is not configured.");
  }

  return requestDzalekaPayTransaction({
    transactionId,
    apiKey: process.env.DZALEKAPAY_API_KEY,
    baseUrl: dzalekaPayBaseUrl(),
  });
}
