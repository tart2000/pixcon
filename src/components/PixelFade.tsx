const COLS = 200;
const ROWS = 12;

/** Small seeded PRNG, so the server and the client draw the same pixels. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One path for the whole fade: each row's runs of filled cells become a rectangle. */
function fadePath() {
  const random = mulberry32(11);
  let d = "";
  for (let y = 0; y < ROWS; y++) {
    // Sparse at the top, almost solid against the footer.
    const density = ((y + 1) / ROWS) ** 2.2 * 0.95;
    let run = 0;
    for (let x = 0; x <= COLS; x++) {
      if (x < COLS && random() < density) {
        run++;
      } else if (run) {
        d += `M${x - run} ${y}h${run}v1h-${run}z`;
        run = 0;
      }
    }
  }
  return d;
}

const PATH = fadePath();

/** Dithered pixels fading into the footer, in the active colour. */
export function PixelFade() {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${COLS} ${ROWS}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      fill="currentColor"
      className="-mb-px block h-24 w-full text-foreground sm:h-32"
    >
      <path d={PATH} />
    </svg>
  );
}
