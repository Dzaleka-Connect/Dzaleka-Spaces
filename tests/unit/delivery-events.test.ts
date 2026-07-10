import { describe, expect, it } from "vitest";
import { isPermanentDeliveryFailure, isResendDeliveryEvent } from "@/lib/email/delivery-events";

describe("Resend delivery events", () => {
  it("accepts only the delivery events handled by the database function", () => {
    expect(isResendDeliveryEvent("email.delivered")).toBe(true);
    expect(isResendDeliveryEvent("contact.created")).toBe(false);
  });

  it("distinguishes permanent delivery failures from delays", () => {
    expect(isPermanentDeliveryFailure("email.bounced")).toBe(true);
    expect(isPermanentDeliveryFailure("email.complained")).toBe(true);
    expect(isPermanentDeliveryFailure("email.delivery_delayed")).toBe(false);
  });
});
