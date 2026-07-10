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
      intro="Dzaleka Spaces helps people find shops, workspaces and community venues in Dzaleka Refugee Camp while giving space providers tools to manage occupancy records, payment records and maintenance."
      sections={[
        {
          heading: "Why it exists",
          body: "Commercial and community spaces in Dzaleka are often discovered through personal networks, messaging groups and signs. That makes it difficult to compare current details or know whether a provider has stated authority to offer a space. Dzaleka Spaces adds field-checked listing information, zone-and-landmark discovery, written occupancy records and dual-confirmed payment receipts.",
        },
        {
          heading: "Built for the camp's real economy",
          body: "Dzaleka has shops, workshops, craft collectives, training rooms and community venues serving residents and organisations. The platform is designed around those real operating needs: it helps existing spaces be discovered and documented without presenting the camp as a conventional property market.",
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
