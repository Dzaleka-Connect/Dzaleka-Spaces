import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseDzalekaPayWebhook,
  verifyDzalekaPayWebhookSignature,
} from "@/lib/dzalekapay/webhooks";

const secret = "whsec_test_secret";
const timestamp = 1_783_900_800;
const payload = JSON.stringify({
  id: "33333333-3333-4333-8333-333333333333",
  type: "transaction.updated",
  createdAt: "2026-07-13T00:00:00.000Z",
  data: {
    id: "11111111-1111-4111-8111-111111111111",
    merchantId: "22222222-2222-4222-8222-222222222222",
    type: "collection",
    status: "completed",
    amount: "5000",
    reference: "DZALEKA-API-1234",
    customerPhone: "265991234567",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:05.000Z",
  },
});

function signature(body: string, time = timestamp) {
  const digest = createHmac("sha256", secret).update(`${time}.${body}`).digest("hex");
  return `t=${time},v1=${digest}`;
}

describe("DzalekaPay webhooks", () => {
  it("verifies the exact raw body and rejects altered or stale deliveries", () => {
    expect(
      verifyDzalekaPayWebhookSignature(Buffer.from(payload), signature(payload), secret, timestamp)
    ).toBe(true);
    expect(
      verifyDzalekaPayWebhookSignature(
        Buffer.from(`${payload} `),
        signature(payload),
        secret,
        timestamp
      )
    ).toBe(false);
    expect(
      verifyDzalekaPayWebhookSignature(
        Buffer.from(payload),
        signature(payload),
        secret,
        timestamp + 301
      )
    ).toBe(false);
  });

  it("returns a minimal validated event without payer details", () => {
    expect(parseDzalekaPayWebhook(payload)).toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      type: "transaction.updated",
      createdAt: "2026-07-13T00:00:00.000Z",
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        merchantId: "22222222-2222-4222-8222-222222222222",
        amountMwk: 5000,
        status: "completed",
        reference: "DZALEKA-API-1234",
        createdAt: "2026-07-13T00:00:00.000Z",
        updatedAt: "2026-07-13T00:00:05.000Z",
      },
    });
  });

  it("rejects unsupported event types", () => {
    expect(() =>
      parseDzalekaPayWebhook(payload.replace("transaction.updated", "payout.updated"))
    ).toThrow("Invalid DzalekaPay webhook payload.");
  });
});
