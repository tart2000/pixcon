import { decode } from "@/lib/pixels";
import { VIEWBOX, iconPath } from "@/lib/svg";

const COLS = 64;
/** Enough rows for the tallest hero (phones); the hero's height is a whole number of rows (see .hero-rows). */
const ROWS = 18;
const PITCH = 44;
const SIZE = 22;
/** Distinct glyphs drawn once as <symbol>s, then reused across the grid to keep the page light. */
const GLYPHS = 72;
/** No glyph repeats within this many cells, in any direction. */
const SPREAD = 3;

/** Deterministic integer hash → [0, 1), so server and client agree and neighbours don't correlate. */
function rand(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Distinct icons in a stable shuffled order. */
function pickGlyphs(icons: { pixels: string; fill: string | null }[]) {
  return icons
    .map((icon, i) => ({ icon, key: rand(i + 1) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, GLYPHS)
    .map(({ icon }, i) => iconPath(decode(rand(i + 7001) < 0.4 && icon.fill ? icon.fill : icon.pixels), "pixel"));
}

/** Glyph per cell, re-rolling until none of the nearby cells already placed uses it. */
function layout(glyphs: number) {
  const grid: number[] = [];
  for (let n = 0; n < ROWS * COLS; n++) {
    const x = n % COLS;
    const y = Math.floor(n / COLS);
    const near = new Set<number>();
    for (let dy = -SPREAD; dy <= 0; dy++)
      for (let dx = -SPREAD; dx <= SPREAD; dx++) {
        if (dy === 0 && dx >= 0) break;
        const nx = x + dx;
        if (nx >= 0 && nx < COLS && y + dy >= 0) near.add(grid[(y + dy) * COLS + nx]);
      }
    let g = Math.floor(rand(n + 1000) * glyphs);
    for (let tries = 0; near.has(g) && tries < glyphs; tries++) g = (g + 1) % glyphs;
    grid.push(g);
  }
  return grid;
}

/**
 * A wall of small pixel icons behind the hero, faded out in the middle so the text stays readable.
 * One SVG: each glyph is a <symbol>, each cell a <use>. Rows start at the top edge so none is cut there.
 */
export function HeroPattern({ icons }: { icons: { pixels: string; fill: string | null }[] }) {
  if (!icons.length) return null;
  const glyphs = pickGlyphs(icons);
  const cells = layout(glyphs.length);

  return (
    <div aria-hidden className="hero-fade pointer-events-none absolute inset-0 overflow-hidden text-foreground">
      <svg width={COLS * PITCH} height={ROWS * PITCH} className="absolute top-0 left-1/2 -translate-x-1/2" fill="currentColor">
        <defs>
          {glyphs.map((d, i) => (
            <symbol key={i} id={`hero-glyph-${i}`} viewBox={VIEWBOX}>
              <path d={d} />
            </symbol>
          ))}
        </defs>
        {cells.map((g, n) => (
          <use
            key={n}
            href={`#hero-glyph-${g}`}
            x={(n % COLS) * PITCH + (PITCH - SIZE) / 2}
            y={Math.floor(n / COLS) * PITCH + (PITCH - SIZE) / 2}
            width={SIZE}
            height={SIZE}
            opacity={0.25 + rand(n + 5000) * 0.6}
          />
        ))}
      </svg>
    </div>
  );
}
