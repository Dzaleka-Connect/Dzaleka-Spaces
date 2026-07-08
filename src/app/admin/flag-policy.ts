export const LOCKED_PILOT_FLAGS = [
  "deposit_processing",
  "mobile_money_processing",
  "residential_listings",
  "family_accommodation",
] as const;

export function isLockedPilotFlag(name: string): boolean {
  return LOCKED_PILOT_FLAGS.includes(name as (typeof LOCKED_PILOT_FLAGS)[number]);
}

export function lockedFlagReason(name: string): string {
  if (name === "deposit_processing" || name === "mobile_money_processing") {
    return "Locked off during the pilot: Dzaleka Spaces records payments only and never holds funds.";
  }
  if (name === "residential_listings" || name === "family_accommodation") {
    return "Locked off until written operational guidance authorises the residential pilot.";
  }
  return "Locked by pilot policy.";
}
