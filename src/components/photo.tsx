"use client";

import Image from "next/image";
import type { Photo as PhotoData } from "@/content/schema";
import { wikimediaThumb } from "@/lib/wikimedia";

/** A credited photo, or a plain accent panel when there isn't one yet. */
export function Photo({
  photo,
  sizes,
  priority = false,
  className = "",
  showCredit = true,
}: {
  photo?: PhotoData;
  sizes: string;
  priority?: boolean;
  className?: string;
  showCredit?: boolean;
}) {
  if (!photo) {
    return <div className={`bg-accent/15 ${className}`} aria-hidden="true" />;
  }
  // Originals are only stored as wide as the file itself, so cap thumbnails below that.
  const maxWidth = /\/\d+px-/.test(photo.src) ? photo.width : photo.width - 1;
  return (
    <figure className={`relative overflow-hidden bg-surface-sunken ${className}`}>
      <Image
        src={photo.src}
        loader={({ src, width }) => wikimediaThumb(src, width, maxWidth)}
        alt={photo.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
      {showCredit && (
        <figcaption className="absolute top-0 right-0 max-w-full truncate rounded-bl bg-black/55 px-2 py-0.5 text-[0.65rem] text-white">
          <a href={photo.sourceUrl} className="hover:underline" target="_blank" rel="noopener noreferrer">
            {photo.credit}
          </a>{" "}
          ·{" "}
          {photo.licenseUrl ? (
            <a href={photo.licenseUrl} className="hover:underline" target="_blank" rel="noopener noreferrer">
              {photo.license}
            </a>
          ) : (
            photo.license
          )}
        </figcaption>
      )}
    </figure>
  );
}
