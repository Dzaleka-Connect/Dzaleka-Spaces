import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Community guidelines",
};

export default function CommunityGuidelinesPage() {
  return (
    <ContentPage
      title="Community guidelines"
      intro="Dzaleka Spaces works because neighbours trust it. These guidelines apply to everyone — seekers, providers, service providers and staff."
      sections={[
        {
          heading: "Be honest",
          items: [
            "Photographs must show the actual space as it is today",
            "State the real price and deposit — the verified amount is the amount",
            "Do not promise the same space to more than one person",
            "Record payments and arrangements truthfully",
          ],
        },
        {
          heading: "Be fair",
          items: [
            "No discriminatory conditions — nationality, religion, gender, disability or family status",
            "No exploiting someone's urgency to change agreed terms",
            "Return deposits as agreed and on time",
            "Respect notice periods in both directions",
          ],
        },
        {
          heading: "Be safe",
          items: [
            "Meet for viewings at the space, during daylight where possible",
            "Never ask for identity documents as a rental condition",
            "Never ask for payment before a viewing",
            "Report unsafe conditions rather than ignoring them",
          ],
        },
        {
          heading: "Respect privacy",
          items: [
            "Do not share another person's contact details or location without consent",
            "Do not photograph people or homes without permission",
            "Keep occupancy and payment details between the parties involved",
          ],
        },
        {
          heading: "What happens when guidelines are broken",
          body: "Reports are reviewed by moderation staff. Outcomes range from a listing correction to suspension and account restriction, always recorded in the audit log. Protection-sensitive concerns are referred to approved support pathways. Reporting is confidential and never counted against the reporter.",
        },
      ]}
    />
  );
}
