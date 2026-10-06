import { CELLS, GRID, type Grid, type Variant } from "./pixels";

const CDN = "https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2/assets";
/** Supersampling per cell when rasterising. */
const SS = 12;
/** Share of a cell an icon must cover to turn the pixel on; strokes are thin, fills are solid. */
const THRESHOLD: Record<Variant, number> = { regular: 0.3, fill: 0.5 };

async function fetchSvg(name: string, variant: Variant): Promise<string | null> {
  const file = variant === "fill" ? `${name}-fill` : name;
  const res = await fetch(`${CDN}/${variant}/${file}.svg`, { signal: AbortSignal.timeout(8000) });
  return res.ok ? res.text() : null;
}

/** Draw the SVG on a canvas and turn each cell's ink coverage into a pixel. */
async function rasterize(svg: string, threshold: number): Promise<Grid> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const size = GRID * SS;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, size, size);
    const alpha = ctx.getImageData(0, 0, size, size).data;
    return Array.from({ length: CELLS }, (_, i) => {
      const cx = (i % GRID) * SS;
      const cy = Math.floor(i / GRID) * SS;
      let ink = 0;
      for (let y = 0; y < SS; y++) for (let x = 0; x < SS; x++) ink += alpha[((cy + y) * size + cx + x) * 4 + 3];
      return ink / (SS * SS * 255) >= threshold;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Approximate the Phosphor icon with the first matching name (e.g. the icon's
 * name, then its alts) on the 11×11 grid. Returns null when none exists.
 */
export async function importPhosphor(names: string[], variant: Variant): Promise<{ name: string; grid: Grid } | null> {
  for (const name of names) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) continue;
    const svg = await fetchSvg(slug, variant);
    if (svg) return { name: slug, grid: await rasterize(svg, THRESHOLD[variant]) };
  }
  return null;
}
