import type { Metadata } from "next";
import { getCountry, getCountrySlugs } from "@/content";
import type { Photo } from "@/content/schema";

export const metadata: Metadata = { title: "Photo credits" };

export default function CreditsPage() {
  const photos: { place: string; photo: Photo }[] = getCountrySlugs().flatMap((slug) => {
    const { country, destinations } = getCountry(slug)!;
    return [
      ...(country.photo ? [{ place: country.name, photo: country.photo }] : []),
      ...destinations.flatMap((d) => (d.photo ? [{ place: `${d.name}, ${country.name}`, photo: d.photo }] : [])),
    ];
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Photo credits</h1>
      <p className="mt-2 text-muted">
        All photos are from Wikimedia Commons and used under the licences shown. Thank you to the
        photographers.
      </p>
      <ul className="mt-8 divide-y divide-line">
        {photos.map(({ place, photo }) => (
          <li key={photo.src} className="py-3 text-sm">
            <span className="font-medium">{place}</span>:{" "}
            <a href={photo.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">
              {photo.credit}
            </a>
            ,{" "}
            {photo.licenseUrl ? (
              <a href={photo.licenseUrl} className="underline" target="_blank" rel="noopener noreferrer">
                {photo.license}
              </a>
            ) : (
              photo.license
            )}
          </li>
        ))}
      </ul>
      {photos.length === 0 && <p className="mt-8 text-muted">No photos yet.</p>}
    </main>
  );
}
