import { describe, expect, it, vi } from "vitest";
import {
  DzalekaPayApiError,
  isDzalekaPayTransactionId,
  reconciliationStatus,
  requestDzalekaPayTransaction,
} from "@/lib/dzalekapay/contract";

const transactionId = "11111111-1111-4111-8111-111111111111";
const merchantId = "22222222-2222-4222-8222-222222222222";

describe("DzalekaPay transaction contract", () => {
  it("reads only the minimal transaction DTO with server authentication", async () => {
    const fetcher = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json({
        id: transactionId,
        merchantId,
        customerPhone: "265991234567",
        amount: "5000",
        type: "collection",
        status: "completed",
        malipoReferenceId: "DZALEKA-API-1234",
        providerResponse: { private: true },
        createdAt: "2026-07-13T00:00:00.000Z",
        updatedAt: "2026-07-13T00:00:05.000Z",
      });
    });

    await expect(
      requestDzalekaPayTransaction({
        transactionId,
        apiKey: "dzp_live_test",
        fetcher: fetcher as typeof fetch,
      })
    ).resolves.toEqual({
      id: transactionId,
      merchantId,
      amountMwk: 5000,
      status: "completed",
      reference: "DZALEKA-API-1234",
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:05.000Z",
    });

    const [, init] = fetcher.mock.calls[0]!;
    expect(init?.headers).toMatchObject({ Authorization: "Bearer dzp_live_test" });
    expect(init?.cache).toBe("no-store");
  });

  it("preserves rate-limit guidance without exposing a raw response", async () => {
    const fetcher = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json(
        { message: "Wait before checking again", internal: { provider: "private" } },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    });

    const error = await requestDzalekaPayTransaction({
      transactionId,
      apiKey: "dzp_live_test",
      fetcher: fetcher as typeof fetch,
    }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(DzalekaPayApiError);
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 60 });
    expect((error as Error).message).toBe("Wait before checking again");
  });

  it("validates IDs and maps provider status independently from internal confirmation", () => {
    expect(isDzalekaPayTransactionId(transactionId)).toBe(true);
    expect(isDzalekaPayTransactionId("DZALEKA-API-1234")).toBe(false);
    expect(reconciliationStatus("completed", true)).toBe("verified");
    expect(reconciliationStatus("completed", false)).toBe("amount_mismatch");
    expect(reconciliationStatus("new-provider-state", true)).toBe("unknown");
  });
});
