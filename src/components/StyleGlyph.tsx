import { emptyGrid, GRID } from "@/lib/pixels";
import { STYLES, iconPath, type StyleId } from "@/lib/svg";

/** A tiny 2×2 sample (X0 / 0X), placed mid-grid so every style engine can draw it. */
const SAMPLE = (() => {
  const g = emptyGrid();
  for (const [x, y] of [[0, 0], [1, 1]]) g[(4 + y) * GRID + 4 + x] = true;
  return g;
})();
const PATHS = Object.fromEntries(STYLES.map((s) => [s.id, iconPath(SAMPLE, s.id)])) as Record<StyleId, string>;
// The sample covers cells 4–5 (units 40–60); a little margin keeps stroked styles' caps in view.
const VIEW = "37 37 26 26";

/** A style shown by example: the 3×3 sample drawn in that style. */
export function StyleGlyph({ style, size = 22, className }: { style: StyleId; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox={VIEW} fill="currentColor" className={className} aria-hidden>
      <path d={PATHS[style]} />
    </svg>
  );
}
