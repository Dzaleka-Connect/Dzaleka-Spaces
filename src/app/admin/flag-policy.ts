export const LOCKED_PILOT_FLAGS = [
  "deposit_processing",
  "mobile_money_processing",
] as const;

export function isLockedPilotFlag(name: string): boolean {
  return LOCKED_PILOT_FLAGS.includes(name as (typeof LOCKED_PILOT_FLAGS)[number]);
}

export function lockedFlagReason(name: string): string {
  if (name === "deposit_processing" || name === "mobile_money_processing") {
    return "Locked off during the pilot: Dzaleka Spaces records payments only and never holds funds.";
  }
  return "Locked by pilot policy.";
}
