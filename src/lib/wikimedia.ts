// Wikimedia Commons only serves thumbnails at a few standard widths; other
// widths return HTTP 400. Pick the smallest standard width that's big enough.
const STANDARD_WIDTHS = [330, 500, 960, 1280, 1920];

/**
 * Rewrites a Commons image URL (original or thumbnail) to a thumbnail at a
 * standard width ≥ `width`, never larger than `maxWidth` (the stored photo width).
 */
export function wikimediaThumb(src: string, width: number, maxWidth: number): string {
  const allowed = STANDARD_WIDTHS.filter((w) => w <= maxWidth);
  if (allowed.length === 0) return src;
  const size = allowed.find((w) => w >= width) ?? allowed[allowed.length - 1];

  if (/\/thumb\/.+\/\d+px-[^/]+$/.test(src)) {
    return src.replace(/\/\d+px-([^/]+)$/, `/${size}px-$1`);
  }
  // Original file: /commons/a/ab/Name.jpg → /commons/thumb/a/ab/Name.jpg/960px-Name.jpg
  const match = src.match(/^(https:\/\/[^/]+\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/);
  if (!match) return src;
  const [, base, hashPath, name] = match;
  return `${base}/thumb/${hashPath}/${name}/${size}px-${name}`;
}
