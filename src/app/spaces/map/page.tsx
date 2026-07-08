import type { Metadata } from "next";
import Link from "next/link";
import { Map, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  const markers = await getPublicMapMarkers();

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
        <Button
          variant="outline"
          render={<Link href="/spaces" />}
          nativeButton={false}
        >
          List view
        </Button>
      </div>

      {!mapEnabled ? (
        <Alert>
          <Info />
          <AlertTitle>Map search is not enabled</AlertTitle>
          <AlertDescription>
            An administrator can enable the public_map feature flag. The preview
            below uses demo positioning when the flag is off in production.
          </AlertDescription>
        </Alert>
      ) : null}

      <SpacesMap markers={markers} />

      <Alert>
        <Map />
        <AlertTitle>Privacy-safe map</AlertTitle>
        <AlertDescription>
          Pins are jittered within zone centres for discovery only. Authorised
          directions are shared after a confirmed viewing.
        </AlertDescription>
      </Alert>
    </div>
  );
}
