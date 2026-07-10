import Image from "next/image";
import type { SpaceMedia } from "@/lib/media";

export function ListingGallery({ media, title }: { media: SpaceMedia[]; title: string }) {
  if (media.length === 0) {
    return (
      <div className="relative h-56 overflow-hidden rounded-md border bg-muted sm:h-72">
        <Image
          src="/dzaleka-community-overview.webp"
          alt="Dzaleka community overview; listing photographs are not available yet"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-3 text-sm font-medium text-white">
          Listing photographs will appear after field verification.
        </div>
      </div>
    );
  }

  const [cover, ...rest] = media;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-56 overflow-hidden rounded-md sm:h-72">
        {cover.url ? (
          <Image
            src={cover.url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority
          />
        ) : null}
      </div>
      {rest.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {rest.map((item) =>
            item.url ? (
              <div
                key={item.id}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border"
              >
                <Image src={item.url} alt="" fill className="object-cover" sizes="120px" />
              </div>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  );
}
