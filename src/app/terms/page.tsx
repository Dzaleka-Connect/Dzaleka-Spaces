import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Terms of use",
};

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of use"
      intro="Plain-language terms for using Dzaleka Spaces during the pilot. By using the platform you agree to these terms."
      sections={[
        {
          heading: "What the platform is",
          body: "Dzaleka Spaces is a directory and record-keeping service. It connects people looking for spaces with people authorised to offer them, verifies listing details in person, and lets both sides keep written records of arrangements and payments. It is not a party to any arrangement between a provider and an occupant.",
        },
        {
          heading: "What verification means",
          body: "A Verified Space badge means a field representative checked the listing details and the provider's stated authority to offer the space at a stated date. It never confirms ownership of land or property, and it is not a guarantee against future disputes.",
        },
        {
          heading: "Money",
          body: "The platform records payments and issues receipts. It does not process, hold or transfer money, and it never holds deposits. Never pay anyone who claims to collect rent or deposits on behalf of Dzaleka Spaces — no such role exists.",
        },
        {
          heading: "Your responsibilities",
          items: [
            "Only list a space you currently manage or are authorised to offer",
            "Keep your listing accurate — price, availability, photographs and facilities",
            "View a space before paying; record arrangements and payments honestly",
            "No discriminatory conditions in listings or arrangements",
            "No land sales, shelter sales or ownership claims of any kind",
            "Respect other users; harassment leads to restriction or removal",
          ],
        },
        {
          heading: "What we may do",
          body: "We may reject, pause, suspend or remove listings that break these terms; restrict accounts involved in fraud, harassment or unauthorised listings; and share information with approved protection or legal-support pathways when safety requires it. Significant actions are recorded in an audit log.",
        },
        {
          heading: "Liability",
          body: "The platform provides information and record-keeping in good faith but cannot guarantee any arrangement's outcome. Providers and occupants remain responsible for their own agreements. Nothing on the platform creates, transfers or evidences ownership of land or property.",
        },
        {
          heading: "Changes",
          body: "These terms may be updated as the pilot develops. Material changes are announced through the platform and Dzaleka Online channels before they take effect.",
        },
      ]}
      footnote="Pilot terms — reviewed with the Dzaleka Spaces advisory group. Questions: see the Contact page."
    />
  );
}
