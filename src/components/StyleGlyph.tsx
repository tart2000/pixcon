import { emptyGrid, GRID } from "@/lib/pixels";
import { STYLES, iconPath, type StyleId } from "@/lib/svg";

/**
 * Where the 2×2 sample (X0 / 0X) sits: mid-grid so every style engine can draw it.
 * Patchwork picks its texture by position, so its sample moves to straddle a solid
 * zone and a checkered one.
 */
const SAMPLE_AT: Partial<Record<StyleId, number>> = { patchwork: 3 };

const sample = (at: number) => {
  const g = emptyGrid();
  for (const [x, y] of [[0, 0], [1, 1]]) g[(at + y) * GRID + at + x] = true;
  return g;
};
const GLYPHS = Object.fromEntries(
  STYLES.map((s) => {
    const at = SAMPLE_AT[s.id] ?? 4;
    // The sample covers two cells (20 units); a little margin keeps stroked styles' caps in view.
    return [s.id, { d: iconPath(sample(at), s.id), view: `${at * 10 - 3} ${at * 10 - 3} 26 26` }];
  }),
) as Record<StyleId, { d: string; view: string }>;

/** A style shown by example: the 2×2 sample drawn in that style. */
export function StyleGlyph({ style, size = 22, className }: { style: StyleId; size?: number; className?: string }) {
  const { d, view } = GLYPHS[style];
  return (
    <svg width={size} height={size} viewBox={view} fill="currentColor" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}
