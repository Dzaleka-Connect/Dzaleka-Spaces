import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy policy"
      intro="How Dzaleka Spaces collects, uses and protects personal information, in line with Malawi's Data Protection Act 2024."
      sections={[
        {
          heading: "What we collect",
          items: [
            "Account: email address, name, optional phone/WhatsApp and preferred language",
            "Listings: space details, photographs, price, and the provider's stated authority basis",
            "Activity: enquiries, viewings, saved spaces and searches, occupancy records, recorded payments",
            "Verification: field-visit checklists, evidence photographs and internal location notes (staff-only)",
          ],
        },
        {
          heading: "What we never collect or publish",
          items: [
            "Refugee identification numbers or registration records — the platform never connects to UNHCR systems",
            "Exact household coordinates on any public page — public locations are zone and landmark only",
            "Identity documents as a condition of using the platform",
          ],
        },
        {
          heading: "How information is used",
          body: "Only to run the service: showing published listings, delivering enquiries, arranging viewings, keeping occupancy and payment records, verification, safety investigation and aggregate (never individual) reporting. Personal data is never sold.",
        },
        {
          heading: "Who can see what",
          body: "Access is enforced in the database itself with row-level security. Public visitors see published listings with approximate locations. Providers see enquiries on their own listings. Verification evidence, exact locations and reports are restricted to authorised staff, and staff access to sensitive records is logged.",
        },
        {
          heading: "Your rights",
          items: [
            "Ask what information we hold about you",
            "Ask for corrections",
            "Ask for deletion — honoured except where records must be kept (e.g. confirmed occupancy history during a dispute)",
            "Complain to the Malawi Data Protection Authority if unsatisfied",
          ],
        },
        {
          heading: "Retention",
          body: "Enquiries are kept up to 24 months; verification evidence while the space remains active; notification logs 90–180 days; audit records longer under restricted access. Final periods follow the platform's retention review.",
        },
      ]}
      footnote="Data controller: Dzaleka Online Services. Requests via the Contact page or the support desk."
    />
  );
}
