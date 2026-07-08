import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "About Dzaleka Spaces",
  description:
    "A community space marketplace and occupancy-management service for Dzaleka Refugee Camp.",
};

export default function AboutPage() {
  return (
    <ContentPage
      title="About Dzaleka Spaces"
      intro="Dzaleka Spaces helps people find trusted places to live, work, meet and operate businesses in Dzaleka Refugee Camp — while giving space providers simple tools to manage occupancy, payments and maintenance."
      sections={[
        {
          heading: "Why it exists",
          body: "Dzaleka was established for around 10,000 people and is now home to more than 50,000. Space is scarce and arrangements are made through word of mouth, WhatsApp groups and handwritten signs — with no way to confirm that a listing is real, fairly priced, or offered by someone with the authority to offer it. Dzaleka Spaces adds structure and trust: in-person verification, zone-and-landmark discovery, written occupancy records and payment receipts.",
        },
        {
          heading: "What we are not",
          body: "Dzaleka Spaces is not a conventional real-estate company. It does not sell camp land, issue ownership certificates or make legal-title claims — refugees cannot own land or property in Malawi, and verification never confirms ownership. During the pilot the platform also never holds money: payments are recorded and receipted, not processed.",
        },
        {
          heading: "Part of the Dzaleka Online ecosystem",
          body: "Dzaleka Spaces is built and operated alongside Dzaleka Online, Dzaleka Online Services, Visit Dzaleka (which runs the approved homestay programme) and DzalekaPay (whose payment references the ledger records). Field verifiers are residents who know their zones, landmarks and community structures.",
        },
        {
          heading: "Community governance",
          body: "An advisory group of residents, women and youth representatives, space providers, community organisations and protection specialists reviews listing categories, verification requirements, complaints, pricing and data use. Residential listings remain switched off until written operational guidance authorises that pilot.",
        },
      ]}
      footnote="Dzaleka Spaces verifies listing details and a provider's stated authority to offer a space. Verification does not establish ownership of land or property."
    />
  );
}
