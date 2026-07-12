import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isDzalekaPayTransactionId,
  parseDzalekaPayTransaction,
  type DzalekaPayTransaction,
} from "./contract";

export interface DzalekaPayWebhookEvent {
  id: string;
  type: "transaction.created" | "transaction.updated";
  createdAt: string;
  data: DzalekaPayTransaction;
}

export function verifyDzalekaPayWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
  nowSeconds = Date.now() / 1000
): boolean {
  const fields = signatureHeader.split(",").reduce<Record<string, string[]>>((result, part) => {
    const separator = part.indexOf("=");
    if (separator <= 0) return result;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key && value) (result[key] ??= []).push(value);
    return result;
  }, {});
  const timestampText = fields.t?.[0];
  const timestamp = Number(timestampText);
  const signatures = fields.v1 ?? [];

  if (
    !timestampText ||
    !Number.isInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > 300 ||
    signatures.length === 0
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestampText}.${rawBody.toString("utf8")}`)
    .digest();

  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(expected, received);
  });
}

export function parseDzalekaPayWebhook(rawBody: string): DzalekaPayWebhookEvent {
  const value: unknown = JSON.parse(rawBody);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid DzalekaPay webhook payload.");
  }
  const event = value as Record<string, unknown>;
  if (
    typeof event.id !== "string" ||
    !isDzalekaPayTransactionId(event.id) ||
    (event.type !== "transaction.created" && event.type !== "transaction.updated") ||
    typeof event.createdAt !== "string" ||
    !Number.isFinite(new Date(event.createdAt).getTime())
  ) {
    throw new Error("Invalid DzalekaPay webhook payload.");
  }

  return {
    id: event.id,
    type: event.type,
    createdAt: event.createdAt,
    data: parseDzalekaPayTransaction(event.data),
  };
}
