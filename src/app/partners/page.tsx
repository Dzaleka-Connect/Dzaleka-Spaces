import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Organisations working with Dzaleka Spaces: venues, sponsors and the Dzaleka Online ecosystem.",
};

export default function PartnersPage() {
  return (
    <>
      <ContentPage
        title="Partners"
        intro="Dzaleka Spaces works with community organisations, NGOs and the wider Dzaleka Online ecosystem to keep the marketplace trustworthy and accessible."
        sections={[
          {
            heading: "The Dzaleka Online ecosystem",
            items: [
              "Dzaleka Online — community news and the platform's main audience channel",
              "Dzaleka Online Services — in-person support desk and community directory",
              "Visit Dzaleka — the approved homestay programme whose rooms appear as verified homestay listings",
              "DzalekaPay — the payment-reference infrastructure the ledger records",
            ],
          },
          {
            heading: "For NGOs and community organisations",
            items: [
              "Find verified venues for trainings, meetings and events across every zone",
              "Sponsor free verification for low-income or vulnerable providers",
              "List your organisation's unused rooms as offices, training rooms or venues",
              "Receive privacy-safe aggregate reporting — never individual household data",
            ],
          },
          {
            heading: "For camp authorities and protection actors",
            body: "The platform operates within a strict boundary: no land sales, no ownership claims, no fund custody, approximate public locations only, and residential listings switched off until written operational guidance authorises them. Protection-relevant reports are referred to approved pathways rather than investigated by the platform alone.",
          },
        ]}
      />
      <div className="mx-auto w-full max-w-3xl px-4 pb-12">
        <Button render={<Link href="/contact" />} nativeButton={false}>
          Talk to us about partnering
        </Button>
      </div>
    </>
  );
}
