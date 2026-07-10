"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMwk } from "@/lib/types";
import type { MapMarker } from "@/lib/map";

export function SpacesMap({ markers }: { markers: MapMarker[] }) {
  if (markers.length === 0) {
    return <p className="text-sm text-muted-foreground">No listings to show on the map.</p>;
  }

  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  function position(marker: MapMarker) {
    const x = maxLng === minLng ? 50 : ((marker.lng - minLng) / (maxLng - minLng)) * 100;
    const y = maxLat === minLat ? 50 : (1 - (marker.lat - minLat) / (maxLat - minLat)) * 100;
    return { left: `${x}%`, top: `${y}%` };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[420px] overflow-hidden rounded-md border bg-muted">
        {markers.map((marker) => {
          const pos = position(marker);
          return (
            <Link
              key={marker.listingId}
              href={`/spaces/${marker.listingSlug ?? marker.listingId}`}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={pos}
              title={marker.title}
            >
              <span className="flex flex-col items-center gap-0.5">
                <MapPin className="size-6 text-primary drop-shadow" />
                <span className="max-w-28 truncate rounded bg-background/95 px-1.5 py-0.5 text-[10px] shadow">
                  {formatMwk(marker.priceMwk)}
                </span>
              </span>
            </Link>
          );
        })}
        <p className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-xs text-muted-foreground">
          Approximate zone markers only — not exact locations
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {markers.map((marker) => (
          <li key={marker.listingId}>
            <Link
              href={`/spaces/${marker.listingSlug ?? marker.listingId}`}
              className="flex items-start justify-between gap-2 rounded-lg border p-3 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{marker.title}</p>
                <p className="text-xs text-muted-foreground">
                  {marker.zone} · {marker.landmark}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium">{formatMwk(marker.priceMwk)}</span>
                {marker.verified ? (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
