export const DZALEKAPAY_BASE_URL = "https://pay.dzaleka.com";
export const DZALEKAPAY_TRANSACTION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DzalekaPayProviderStatus =
  "pending" | "completed" | "failed" | "expired" | "refunded" | (string & {});

export type DzalekaPayReconciliationStatus =
  "pending" | "verified" | "failed" | "refunded" | "amount_mismatch" | "unknown";

export interface DzalekaPayTransaction {
  id: string;
  merchantId: string;
  amountMwk: number;
  status: DzalekaPayProviderStatus;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DzalekaPayReconciliation {
  transactionId: string;
  merchantId: string;
  providerStatus: string;
  reconciliationStatus: DzalekaPayReconciliationStatus;
  amountMwk: number;
  reference: string | null;
  providerUpdatedAt: string;
  lastVerifiedAt: string;
  source: "api" | "webhook";
}

export class DzalekaPayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null
  ) {
    super(message);
    this.name = "DzalekaPayApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function safeMessage(value: unknown, fallback: string) {
  if (!isRecord(value) || typeof value.message !== "string") return fallback;
  return value.message.slice(0, 300);
}

export function isDzalekaPayTransactionId(value: string): boolean {
  return DZALEKAPAY_TRANSACTION_ID_PATTERN.test(value.trim());
}

export function reconciliationStatus(
  providerStatus: string,
  amountMatches: boolean
): DzalekaPayReconciliationStatus {
  if (!amountMatches) return "amount_mismatch";
  if (providerStatus === "completed") return "verified";
  if (providerStatus === "pending") return "pending";
  if (providerStatus === "failed" || providerStatus === "expired") return "failed";
  if (providerStatus === "refunded") return "refunded";
  return "unknown";
}

export function parseDzalekaPayTransaction(value: unknown): DzalekaPayTransaction {
  if (!isRecord(value)) throw new Error("DzalekaPay returned an invalid transaction.");

  const amount = Number(value.amount);
  const referenceValue = value.malipoReferenceId ?? value.reference;
  if (
    typeof value.id !== "string" ||
    !isDzalekaPayTransactionId(value.id) ||
    typeof value.merchantId !== "string" ||
    !isDzalekaPayTransactionId(value.merchantId) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    typeof value.status !== "string" ||
    value.status.length > 50 ||
    !validTimestamp(value.createdAt) ||
    !validTimestamp(value.updatedAt) ||
    (referenceValue !== undefined && referenceValue !== null && typeof referenceValue !== "string")
  ) {
    throw new Error("DzalekaPay returned an invalid transaction.");
  }

  return {
    id: value.id,
    merchantId: value.merchantId,
    amountMwk: amount,
    status: value.status,
    reference: typeof referenceValue === "string" ? referenceValue.slice(0, 100) : null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export async function requestDzalekaPayTransaction({
  transactionId,
  apiKey,
  baseUrl = DZALEKAPAY_BASE_URL,
  fetcher = fetch,
}: {
  transactionId: string;
  apiKey: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
}): Promise<DzalekaPayTransaction> {
  if (!isDzalekaPayTransactionId(transactionId)) {
    throw new DzalekaPayApiError("Enter a valid DzalekaPay transaction ID.", 400);
  }

  const response = await fetcher(
    `${baseUrl.replace(/\/$/, "")}/api/v1/transactions/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }
  );
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new DzalekaPayApiError(
      safeMessage(body, "DzalekaPay could not verify this transaction."),
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
    );
  }

  return parseDzalekaPayTransaction(body);
}
