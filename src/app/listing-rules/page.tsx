import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Listing rules",
};

export default function ListingRulesPage() {
  return (
    <ContentPage
      title="Listing rules"
      intro="Every listing passes an in-person verification and a moderation review before publication. These are the rules applied at both steps."
      sections={[
        {
          heading: "Allowed listing categories",
          items: [
            "Community venues, meeting venues and training spaces",
            "Offices, shops, workshops and storage",
            "Homestays through approved operators",
            "Residential rooms and shared accommodation: not yet — these open under a separately approved pilot",
          ],
        },
        {
          heading: "Requirements before publication",
          items: [
            "A stated authority to offer the space (checked in person, never published)",
            "A zone and nearby landmark — exact locations stay private",
            "Photographs that match the space's current condition",
            "A confirmed price and deposit",
            "One active public listing per space",
          ],
        },
        {
          heading: "A listing is rejected when",
          items: [
            "The provider refuses to show the space to the field representative",
            "Photographs do not match the space",
            "The provider cannot explain their authority to offer it",
            "The space is already occupied and not becoming available",
            "It involves selling land or a shelter, or claims ownership",
            "It contains discriminatory requirements",
            "The provider asks for payment before a viewing",
            "Conflicting providers have submitted the same space (suspended pending review)",
          ],
        },
        {
          heading: "Staying published",
          body: "Listings are re-checked periodically. A listing is paused when its availability can no longer be confirmed, when accurate reports show it has changed, or when the provider asks. Providers can reactivate by confirming details or requesting re-verification.",
        },
      ]}
      footnote="Verification confirms listing details and stated authority to offer — never ownership of land or property."
    />
  );
}
