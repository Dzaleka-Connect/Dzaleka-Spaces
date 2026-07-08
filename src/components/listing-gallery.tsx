import Image from "next/image";
import type { SpaceMedia } from "@/lib/media";

export function ListingGallery({
  media,
  title,
}: {
  media: SpaceMedia[];
  title: string;
}) {
  if (media.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border bg-muted sm:h-72">
        <span className="text-sm text-muted-foreground">
          Photographs added after field verification
        </span>
      </div>
    );
  }

  const [cover, ...rest] = media;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-56 overflow-hidden rounded-xl sm:h-72">
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
                <Image
                  src={item.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </div>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  );
}
