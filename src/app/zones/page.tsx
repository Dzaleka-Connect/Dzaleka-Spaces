import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getZoneSummaries } from "@/lib/zones";

export const metadata: Metadata = {
  title: "Browse by zone",
  description:
    "Available shops, offices, venues and community spaces across the recognised areas of Dzaleka Refugee Camp.",
};

export default async function ZonesPage() {
  const zones = await getZoneSummaries();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse by zone</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every listing shows its zone and a nearby landmark. Exact locations
          are shared only after a viewing is arranged with the provider.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {zones.map((zone) => (
          <Link key={zone.slug} href={`/zones/${zone.slug}`}>
            <Card className="h-full py-4 transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <MapPin className="size-4 text-primary" />
                  {zone.name}
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {zone.listingCount} space
                    {zone.listingCount === 1 ? "" : "s"}
                  </Badge>
                  {zone.verifiedCount > 0 ? (
                    <Badge variant="secondary">
                      <BadgeCheck className="text-primary" />
                      {zone.verifiedCount} verified
                    </Badge>
                  ) : null}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
