import type { Metadata } from "next";
import { Camera, ClipboardCheck, UserRound } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssistedListingForm } from "@/components/assisted-listing-form";
import { getZones } from "@/lib/zones";

export const metadata: Metadata = {
  title: "Request an assisted listing",
  description:
    "A Dzaleka Spaces field representative visits your space, takes photographs and prepares the listing with you.",
};

export default async function RequestAssistedListingPage() {
  const zones = await getZones();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Request an assisted listing
        </h1>
        <p className="mt-1 text-muted-foreground">
          No smartphone or internet needed. A field representative visits your
          space, takes photographs, writes the description with you and
          publishes the listing after verification.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="py-4">
          <CardHeader>
            <UserRound className="size-5 text-primary" />
            <CardTitle className="text-sm">1. You ask for a visit</CardTitle>
            <CardDescription>
              With this form, by phone, or through a community representative.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="py-4">
          <CardHeader>
            <Camera className="size-5 text-primary" />
            <CardTitle className="text-sm">2. We visit and prepare</CardTitle>
            <CardDescription>
              Photographs, description, price and your authority to offer —
              checked in one visit.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="py-4">
          <CardHeader>
            <ClipboardCheck className="size-5 text-primary" />
            <CardTitle className="text-sm">3. Your listing goes live</CardTitle>
            <CardDescription>
              Published with the Verified badge once a reviewer approves it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <AssistedListingForm zones={zones} />
    </div>
  );
}
