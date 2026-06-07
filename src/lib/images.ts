import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

// Keystatic stores image paths like "/src/assets/uploads/foo.jpg"; resolve
// them to importable modules so astro:assets can optimize them.
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/uploads/**/*.{jpg,jpeg,png,gif,webp,JPG,JPEG,PNG}"
);

export interface Picture {
  sources: { type: string; srcset: string }[];
  fallback: { src: string; width: number; height: number };
  full: { src: string; width: number; height: number };
}

const FORMATS = ["avif", "webp", "jpeg"] as const;
export const DEFAULT_WIDTHS = [480, 960, 1600];

/// Returns null for paths outside src/assets (e.g. older sites still serving
/// public/uploads), so callers can fall back to a plain <img>.
export async function picture(
  path: string | null | undefined,
  widths: number[] = DEFAULT_WIDTHS
): Promise<Picture | null> {
  if (!path) return null;
  const load = modules[path];
  if (!load) return null;
  const meta = (await load()).default;
  const usable = widths.filter((w) => w <= meta.width);
  if (!usable.length) usable.push(meta.width);

  const sources = [];
  for (const format of FORMATS) {
    const img = await getImage({ src: meta, widths: usable, format });
    sources.push({ type: `image/${format}`, srcset: img.srcSet.attribute });
  }
  const small = await getImage({ src: meta, width: usable[0], format: "jpeg" });
  const fullWidth = Math.min(2000, meta.width);
  const large = await getImage({ src: meta, width: fullWidth, format: "jpeg" });
  return {
    sources,
    fallback: {
      src: small.src,
      width: usable[0],
      height: Math.round((meta.height * usable[0]) / meta.width),
    },
    full: {
      src: large.src,
      width: fullWidth,
      height: Math.round((meta.height * fullWidth) / meta.width),
    },
  };
}
