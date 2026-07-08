export const CHECKLIST_ITEMS = [
  { key: "space_exists", label: "The space exists as described" },
  { key: "provider_attended", label: "The provider attended the visit" },
  { key: "photos_match", label: "Photographs match the space" },
  { key: "zone_landmark_confirmed", label: "Zone and landmark confirmed" },
  { key: "price_confirmed", label: "Price confirmed with the provider" },
  { key: "deposit_confirmed", label: "Deposit confirmed" },
  { key: "water_checked", label: "Water access checked" },
  { key: "sanitation_checked", label: "Sanitation checked" },
  { key: "electricity_checked", label: "Electricity / solar checked" },
  { key: "availability_confirmed", label: "Availability confirmed" },
  {
    key: "authority_evidence_reviewed",
    label: "Provider authority evidence reviewed",
  },
] as const;

export const RECOMMENDATIONS = [
  { value: "details_confirmed", label: "Details confirmed" },
  { value: "changes_required", label: "Changes required" },
  { value: "escalate", label: "Escalate for review" },
  { value: "unable_to_verify", label: "Unable to verify" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "conflicting_authority", label: "Conflicting authority claim" },
] as const;
