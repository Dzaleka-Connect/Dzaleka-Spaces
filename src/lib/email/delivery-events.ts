export const RESEND_DELIVERY_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.delivery_delayed",
  "email.failed",
  "email.suppressed",
] as const;

export type ResendDeliveryEvent = (typeof RESEND_DELIVERY_EVENTS)[number];

export function isResendDeliveryEvent(value: string): value is ResendDeliveryEvent {
  return RESEND_DELIVERY_EVENTS.some((event) => event === value);
}

export function isPermanentDeliveryFailure(event: ResendDeliveryEvent) {
  return ["email.bounced", "email.complained", "email.failed", "email.suppressed"].includes(event);
}
