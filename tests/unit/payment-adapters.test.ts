import { describe, expect, it } from "vitest";
import {
  AirtelMoneyAdapter,
  DzalekaPayAdapter,
  TnmMpambaAdapter,
} from "@/lib/adapters/payment-adapters";

describe("pilot payment adapters", () => {
  for (const adapter of [new AirtelMoneyAdapter(), new TnmMpambaAdapter()]) {
    it(`${adapter.name} cannot process or verify funds`, async () => {
      expect(await adapter.isEnabled()).toBe(false);
      await expect(adapter.initiatePayment(1000, "0999000000", "test")).resolves.toMatchObject({
        ok: false,
        transactionStatus: "failed",
      });
      await expect(adapter.verifyTransaction("external-reference")).resolves.toMatchObject({
        ok: false,
        transactionStatus: "failed",
      });
    });
  }

  it("DzalekaPay cannot initiate funds and reconciliation is disabled by default", async () => {
    const adapter = new DzalekaPayAdapter();
    expect(await adapter.isEnabled()).toBe(false);
    await expect(adapter.initiatePayment(1000, "0999000000", "test")).resolves.toMatchObject({
      ok: false,
      transactionStatus: "failed",
    });
    await expect(adapter.verifyTransaction("external-reference")).resolves.toMatchObject({
      ok: false,
      transactionStatus: "failed",
    });
  });
});
