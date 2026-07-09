import type { Metadata } from "next";
import Link from "next/link";
import { Map, MapPinned } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SpacesMap } from "@/components/spaces-map";
import { featureEnabled } from "@/lib/features";
import { getPublicMapMarkers } from "@/lib/map";

export const metadata: Metadata = {
  title: "Map search",
  description:
    "Browse Dzaleka Spaces on an approximate map. Markers show zones only.",
};

export default async function SpacesMapPage() {
  const mapEnabled = await featureEnabled("public_map");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Map search</h1>
          <p className="mt-1 text-muted-foreground">
            Approximate markers by zone — exact household locations are never
            shown publicly.
          </p>
        </div>
        <Button render={<Link href="/spaces" />} nativeButton={false}>
          Browse the list instead
        </Button>
      </div>

      {mapEnabled ? (
        <>
          <SpacesMap markers={await getPublicMapMarkers()} />
          <Alert>
            <Map />
            <AlertTitle>Privacy-safe map</AlertTitle>
            <AlertDescription>
              Pins are placed at zone centres for discovery only. Authorised
              directions are shared after a confirmed viewing.
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <Empty className="rounded-xl border border-dashed bg-muted/30 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinned />
            </EmptyMedia>
            <EmptyTitle>Map view is coming soon</EmptyTitle>
            <EmptyDescription>
              The approximate zone map is not switched on yet. In the meantime,
              browse every available space as a list and filter by zone,
              category, budget and facilities.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap justify-center gap-3">
            <Button render={<Link href="/spaces" />} nativeButton={false}>
              Browse spaces
            </Button>
            <Button
              variant="outline"
              render={<Link href="/zones" />}
              nativeButton={false}
            >
              Browse by zone
            </Button>
          </div>
        </Empty>
      )}
    </div>
  );
}
