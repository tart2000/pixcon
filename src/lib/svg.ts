import { GRID, type Grid } from "./pixels";

export const STYLES = [
  { id: "pixel", label: "Pixel" },
  { id: "mosaic", label: "Mosaic" },
  { id: "studs", label: "Studs" },
  { id: "quirky", label: "Quirky" },
  { id: "rounded", label: "Rounded" },
  { id: "blob", label: "Blob" },
  { id: "liquid", label: "Liquid" },
  { id: "liquid-blob", label: "Liquid Blob" },
  { id: "retro", label: "Retro" },
  { id: "stitch", label: "Stitch" },
  { id: "knit", label: "Knit" },
  { id: "dots", label: "Dots" },
  { id: "halftone", label: "Halftone" },
  { id: "grainy", label: "Grainy" },
  { id: "patchwork", label: "Patchwork" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

/** The style asked for in a page's query (?style=), if it is one. */
export const styleFrom = (query: { style?: string | string[] }): StyleId | undefined =>
  STYLES.find((s) => s.id === query.style)?.id;

/** Each cell is 10 units wide, so an 11×11 icon has a viewBox of 110×110. */
const U = 10;
const SIZE = GRID * U;

const on = (g: Grid, x: number, y: number) =>
  x >= 0 && x < GRID && y >= 0 && y < GRID && g[y * GRID + x];

const rect = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y}h${w}v${h}h${-w}z`;

/** Pixel style: merge horizontal runs so adjacent pixels have no seams. */
function pixelPath(g: Grid): string {
  let d = "";
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      if (!on(g, x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (on(g, x, y)) x++;
      d += rect(start * U, y * U, (x - start) * U, U);
    }
  }
  return d;
}

/**
 * Label 4-connected regions of each colour. Empty cells on the border all share
 * label 0: they connect through the space around the icon. Any other empty
 * region is an enclosed hole.
 */
function regions(g: Grid): number[] {
  const label = Array<number>(GRID * GRID).fill(-1);
  const flood = (seeds: number[], id: number) => {
    const stack = seeds.filter((i) => label[i] < 0);
    while (stack.length) {
      const i = stack.pop()!;
      if (label[i] >= 0) continue;
      label[i] = id;
      const x = i % GRID;
      const y = Math.floor(i / GRID);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const n = ny * GRID + nx;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && label[n] < 0 && g[n] === g[i]) stack.push(n);
      }
    }
  };
  const border = Array.from({ length: GRID * GRID }, (_, i) => i).filter((i) => {
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    return !g[i] && (x === 0 || y === 0 || x === GRID - 1 || y === GRID - 1);
  });
  flood(border, 0);
  for (let i = 0, id = 1; i < GRID * GRID; i++) if (label[i] < 0) flood([i], id++);
  return label;
}

/**
 * Empty cells that are not holes: reachable from the canvas edge, moving through
 * empty cells in 8 directions (a diagonal gap between pixels lets the outside in).
 */
function outsideCells(g: Grid): boolean[] {
  const out = Array<boolean>(GRID * GRID).fill(false);
  const stack: number[] = [];
  for (let i = 0; i < GRID; i++) stack.push(i, (GRID - 1) * GRID + i, i * GRID, i * GRID + GRID - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (out[i] || g[i]) continue;
    out[i] = true;
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) stack.push(ny * GRID + nx);
      }
  }
  return out;
}

/**
 * Blob and Rounded styles: full-size pixels where every corner — outer and
 * inner — is rounded with radius `r` (fully round for Blob), and shapes never
 * merge diagonally. Each cell is drawn as four quarter tiles; a filled quarter
 * is rounded when its corner is exposed, and an inner corner is rounded by
 * filling it back in with a concave quarter.
 */
function blobPath(g: Grid, r = U / 2): string {
  const h = U / 2;
  const out = outsideCells(g);
  const hole = (x: number, y: number) =>
    x >= 0 && x < GRID && y >= 0 && y < GRID && !g[y * GRID + x] && !out[y * GRID + x];
  let d = "";
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const px = x * U;
      const py = y * U;
      const cx = px + h;
      const cy = py + h;
      const R = px + U;
      const B = py + U;

      if (on(g, x, y)) {
        // Rounded when both side neighbours are empty — except between two holes
        // that touch diagonally: the pixels stay joined so the holes stay apart.
        const exposed = (sx: number, sy: number) =>
          !on(g, x + sx, y) &&
          !on(g, x, y + sy) &&
          !(hole(x + sx, y) && hole(x, y + sy) && on(g, x + sx, y + sy));
        d += exposed(-1, -1)
          ? `M${px} ${cy}V${py + r}A${r} ${r} 0 0 1 ${px + r} ${py}H${cx}V${cy}z`
          : rect(px, py, h, h);
        d += exposed(1, -1)
          ? `M${cx} ${py}H${R - r}A${r} ${r} 0 0 1 ${R} ${py + r}V${cy}H${cx}z`
          : rect(cx, py, h, h);
        d += exposed(1, 1)
          ? `M${R} ${cy}V${B - r}A${r} ${r} 0 0 1 ${R - r} ${B}H${cx}V${cy}z`
          : rect(cx, cy, h, h);
        d += exposed(-1, 1)
          ? `M${cx} ${B}H${px + r}A${r} ${r} 0 0 1 ${px} ${B - r}V${cy}H${cx}z`
          : rect(px, cy, h, h);
      } else {
        // Inner corner (empty corner with pixels on all three other sides): round it.
        const shut = (sx: number, sy: number) => on(g, x + sx, y) && on(g, x, y + sy) && on(g, x + sx, y + sy);
        if (shut(-1, -1)) d += `M${px} ${py}L${px + r} ${py}A${r} ${r} 0 0 0 ${px} ${py + r}z`;
        if (shut(1, -1)) d += `M${R - r} ${py}L${R} ${py}L${R} ${py + r}A${r} ${r} 0 0 0 ${R - r} ${py}z`;
        if (shut(1, 1)) d += `M${R} ${B - r}L${R} ${B}L${R - r} ${B}A${r} ${r} 0 0 0 ${R} ${B - r}z`;
        if (shut(-1, 1)) d += `M${px} ${B}L${px} ${B - r}A${r} ${r} 0 0 0 ${px + r} ${B}z`;
      }
    }
  return d;
}

/**
 * Where pixels touch only diagonally, either the filled pair or the empty pair can be
 * bridged, not both. Returns, for the crossing between (x, y) and (x+sx, y+sy), whether
 * the empty cells win. We bridge the pair that isn't already connected some other way;
 * when both pairs are separate, the finer detail wins; on a perfect tie, pixels connect
 * unless the icon is inverted.
 */
function diagonalRule(g: Grid) {
  const label = regions(g);
  const lab = (x: number, y: number) => (x >= 0 && x < GRID && y >= 0 && y < GRID ? label[y * GRID + x] : 0);
  // Inverted icon: the canvas edge is mostly filled, so the holes are the drawing.
  let edgeFilled = 0;
  for (let i = 0; i < GRID; i++) edgeFilled += +g[i] + +g[(GRID - 1) * GRID + i] + +g[i * GRID] + +g[i * GRID + GRID - 1];
  const inverted = edgeFilled > (4 * GRID) / 2;
  const size = new Map<number, number>();
  for (const l of label) size.set(l, (size.get(l) ?? 0) + 1);

  /** At the crossing between (x, y) and (x+sx, y+sy), do the empty cells win the bridge? */
  const holesBridge = (x: number, y: number, sx: number, sy: number) => {
    const diagSplit = lab(x, y) !== lab(x + sx, y + sy);
    const sideSplit = lab(x + sx, y) !== lab(x, y + sy);
    // (x, y) and its diagonal share a colour; the two side cells share the other one.
    const holesSplit = on(g, x, y) ? sideSplit : diagSplit;
    const pixelsSplit = on(g, x, y) ? diagSplit : sideSplit;
    // The space around the icon (label 0) never bridges: it would just cut the outline open.
    const [h1, h2] = on(g, x, y) ? [lab(x + sx, y), lab(x, y + sy)] : [lab(x, y), lab(x + sx, y + sy)];
    if (h1 === 0 || h2 === 0) return false;
    if (holesSplit !== pixelsSplit) return holesSplit;
    // Both pairs are separate: the finer detail wins (the pair whose smallest piece is
    // smaller, e.g. a 1-pixel branch, or a thin ring of holes around a filled island)…
    const [p1, p2] = on(g, x, y) ? [lab(x, y), lab(x + sx, y + sy)] : [lab(x + sx, y), lab(x, y + sy)];
    const holesMin = Math.min(size.get(h1)!, size.get(h2)!);
    const pixelsMin = Math.min(size.get(p1)!, size.get(p2)!);
    if (holesMin !== pixelsMin) return holesMin < pixelsMin;
    // …and on a perfect tie (e.g. a checkerboard), pixels connect, unless the icon is inverted.
    return inverted;
  };
  return holesBridge;
}

/**
 * Liquid styles: full-size pixels that melt into each other. Exposed outer corners
 * are rounded, and empty corners squeezed between two filled pixels get a concave
 * fillet — which also bridges pixels that only touch diagonally.
 * Where pixels touch only diagonally, either the filled pair or the empty pair can
 * be bridged, not both. We bridge the pair that isn't already connected some other
 * way: separate holes carved into a solid shape merge, separate strokes merge. When
 * both pairs are separate, the finer detail wins (see diagonalRule).
 * Every sub-path is drawn clockwise so overlaps union under the nonzero fill rule.
 */
function liquidPath(g: Grid, r = 3.5, c = 3.5): string {
  // r: radius of exposed outer corners, c: radius of the concave fillets (both ≤ U / 2).
  const h = U / 2;

  const holesBridge = diagonalRule(g);

  let d = "";
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const px = x * U;
      const py = y * U;
      const cx = px + h;
      const cy = py + h;
      const R = px + U;
      const B = py + U;
      if (on(g, x, y)) {
        // A quarter is rounded when its corner is exposed: both side neighbours are
        // empty and the diagonal one is either empty or loses the bridge to the holes.
        const exposed = (sx: number, sy: number) =>
          !on(g, x + sx, y) && !on(g, x, y + sy) && (!on(g, x + sx, y + sy) || holesBridge(x, y, sx, sy));
        d += exposed(-1, -1)
          ? `M${px} ${py + r}A${r} ${r} 0 0 1 ${px + r} ${py}L${cx} ${py}L${cx} ${cy}L${px} ${cy}z`
          : rect(px, py, h, h);
        d += exposed(1, -1)
          ? `M${cx} ${py}L${R - r} ${py}A${r} ${r} 0 0 1 ${R} ${py + r}L${R} ${cy}L${cx} ${cy}z`
          : rect(cx, py, h, h);
        d += exposed(1, 1)
          ? `M${cx} ${cy}L${R} ${cy}L${R} ${B - r}A${r} ${r} 0 0 1 ${R - r} ${B}L${cx} ${B}z`
          : rect(cx, cy, h, h);
        d += exposed(-1, 1)
          ? `M${px} ${cy}L${cx} ${cy}L${cx} ${B}L${px + r} ${B}A${r} ${r} 0 0 1 ${px} ${B - r}z`
          : rect(px, cy, h, h);
      } else {
        // Empty cell: fill the corners pinched between two filled neighbours, unless
        // this hole bridges diagonally to another hole through that corner.
        const pinched = (sx: number, sy: number) =>
          on(g, x + sx, y) && on(g, x, y + sy) && (on(g, x + sx, y + sy) || !holesBridge(x, y, sx, sy));
        if (pinched(-1, -1)) d += `M${px} ${py}L${px + c} ${py}A${c} ${c} 0 0 0 ${px} ${py + c}z`;
        if (pinched(1, -1)) d += `M${R - c} ${py}L${R} ${py}L${R} ${py + c}A${c} ${c} 0 0 0 ${R - c} ${py}z`;
        if (pinched(1, 1)) d += `M${R} ${B - c}L${R} ${B}L${R - c} ${B}A${c} ${c} 0 0 0 ${R} ${B - c}z`;
        if (pinched(-1, 1)) d += `M${px} ${B}L${px} ${B - c}A${c} ${c} 0 0 0 ${px + c} ${B}z`;
      }
    }
  return d;
}

/**
 * Retro style: a CRT look. Each horizontal run of pixels becomes two scanlines, one per
 * half-pixel row, sitting at its bottom: fully rounded pills a third of a pixel tall.
 */
function retroPath(g: Grid): string {
  const h = U / 3;
  const r = h / 2;
  const n = (v: number) => +v.toFixed(3);
  let d = "";
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      if (!on(g, x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (on(g, x, y)) x++;
      const x0 = start * U;
      const x1 = x * U;
      for (const b of [y * U + U / 2, (y + 1) * U]) {
        d += `M${n(x0 + r)} ${b}A${n(r)} ${n(r)} 0 0 1 ${n(x0 + r)} ${n(b - h)}H${n(x1 - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x1 - r)} ${b}Z`;
      }
    }
  }
  return d;
}

/**
 * Round-capped strokes as filled pills, for the needlework styles. Each segment is a pill
 * `cap` wide on each side, all wound the same way so overlaps merge under the nonzero rule.
 * The drawing is shrunk by `cap` on each side so caps on the grid's edge stay in the viewBox.
 */
/** Where a point of a needlework drawing lands once shrunk to keep its `cap` in view. */
const shrunk = (cap: number) => (v: number) => cap + (v * (SIZE - 2 * cap)) / SIZE;

function roundStrokes(segments: [number, number, number, number][], cap: number): string {
  const k = (SIZE - 2 * cap) / SIZE;
  const r = cap * k;
  const n = (v: number) => +v.toFixed(3);
  const at = shrunk(cap);
  return segments
    .map(([ax, ay, bx, by]) => {
      [ax, ay, bx, by] = [at(ax), at(ay), at(bx), at(by)];
      const len = Math.hypot(bx - ax, by - ay);
      const ox = (-(by - ay) / len) * r;
      const oy = ((bx - ax) / len) * r;
      return (
        `M${n(ax + ox)} ${n(ay + oy)}L${n(bx + ox)} ${n(by + oy)}` +
        `A${n(r)} ${n(r)} 0 0 0 ${n(bx - ox)} ${n(by - oy)}` +
        `L${n(ax - ox)} ${n(ay - oy)}A${n(r)} ${n(r)} 0 0 0 ${n(ax + ox)} ${n(ay + oy)}Z`
      );
    })
    .join("");
}

/** Every filled pixel's segments, from its top-left corner (x0, y0). */
function eachPixel(g: Grid, segs: (x0: number, y0: number) => [number, number, number, number][]) {
  const out: [number, number, number, number][] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (on(g, x, y)) out.push(...segs(x * U, y * U));
  return out;
}

/**
 * Stitch style: cross-stitch embroidery. Each pixel is an X joining its corners, strokes
 * 0.4 of a pixel thick, so neighbouring crosses join at their corners.
 */
function stitchPath(g: Grid): string {
  return roundStrokes(
    eachPixel(g, (x0, y0) => [
      [x0, y0, x0 + U, y0 + U],
      [x0 + U, y0, x0, y0 + U],
    ]),
    U / 5,
  );
}

/**
 * Knit style: knitted stitches. Each pixel holds two stacked chevrons (^), apex on the top
 * edge then half a pixel lower, arms reaching the side edges at 45°; strokes a third of a
 * pixel thick, so side-by-side pixels zigzag like a row of knitting.
 */
function knitPath(g: Grid): string {
  return roundStrokes(
    eachPixel(g, (x0, y0) =>
      [0, U / 2].flatMap((dy): [number, number, number, number][] => {
        const top = y0 + dy;
        return [
          [x0, top + U / 2, x0 + U / 2, top],
          [x0 + U / 2, top, x0 + U, top + U / 2],
        ];
      }),
    ),
    U / 6,
  );
}

/** Dots style: each pixel is filled with 2×2 touching circles, a quarter of a pixel in radius. */
function dotsPath(g: Grid): string {
  const r = U / 4;
  let d = "";
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (!on(g, x, y)) continue;
      for (const cy of [y * U + r, y * U + 3 * r])
        for (const cx of [x * U + r, x * U + 3 * r])
          d += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    }
  return d;
}

/**
 * Fixed nudge for each vertex of the grid, in [-1, 1] on both axes: a hash of its
 * position, so every icon bends the same way at the same place, on every render.
 */
function nudge(x: number, y: number): [number, number] {
  const unit = (seed: number) => {
    let h = Math.imul(x * 374761393 + y * 668265263 + seed, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
  };
  return [unit(0x9e37), unit(0x7f4a)];
}

/**
 * Quirky style: trace the outline of each region on the grid, keep only its corners,
 * and move each corner by its vertex's nudge. Straight edges stay straight, and
 * shapes that share a corner still meet there. `amp` is in viewBox units, so the
 * default moves corners by up to 15% of a pixel at any size.
 */
function quirkyPath(g: Grid, amp = 1.5): string {
  // Outline edges, clockwise around the filled cells, keyed by their start vertex.
  const V = GRID + 1;
  const out = new Map<number, number[]>();
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const from = y0 * V + x0;
    out.set(from, [...(out.get(from) ?? []), y1 * V + x1]);
  };
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (!on(g, x, y)) continue;
      if (!on(g, x, y - 1)) add(x, y, x + 1, y);
      if (!on(g, x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!on(g, x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!on(g, x - 1, y)) add(x, y + 1, x, y);
    }

  const dir = (a: number, b: number): [number, number] => [(b % V) - (a % V), Math.floor(b / V) - Math.floor(a / V)];
  const clamp = (v: number) => Math.min(SIZE, Math.max(0, v));
  let d = "";
  for (const start of out.keys()) {
    while (out.get(start)?.length) {
      // Walk one loop. Where two diagonal pixels meet, turn right so they stay separate shapes.
      const loop = [start];
      let prev = start;
      let at = out.get(start)!.shift()!;
      while (at !== start) {
        const next = out.get(at)!;
        const [px, py] = dir(prev, at);
        const pick = next.length > 1 ? Math.max(0, next.findIndex((n) => {
          const [nx, ny] = dir(at, n);
          return nx === -py && ny === px;
        })) : 0;
        loop.push(at);
        prev = at;
        at = next.splice(pick, 1)[0];
      }
      // Keep the corners only, then nudge them.
      const corners = loop.filter((v, i) => {
        const [ax, ay] = dir(loop[(i + loop.length - 1) % loop.length], v);
        const [bx, by] = dir(v, loop[(i + 1) % loop.length]);
        return ax !== bx || ay !== by;
      });
      d += corners
        .map((v, i) => {
          const x = v % V;
          const y = Math.floor(v / V);
          const [nx, ny] = nudge(x, y);
          const px = clamp(x * U + nx * amp);
          const py = clamp(y * U + ny * amp);
          return `${i ? "L" : "M"}${+px.toFixed(2)} ${+py.toFixed(2)}`;
        })
        .join("") + "Z";
    }
  }
  return d;
}

/** A full circle as two arcs; `cw` picks its winding, so it can fill or cut out. */
const circle = (cx: number, cy: number, r: number, cw: boolean) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 ${+cw} ${2 * r} 0a${r} ${r} 0 1 ${+cw} ${-2 * r} 0Z`;

/** Brick lengths for a run of `n` pixels starting at (x, y): 2 to 4 long, the same split every time. */
function brickLengths(n: number, x: number, y: number): number[] {
  const lengths: number[] = [];
  while (n > 4) {
    let len = 2 + (Math.imul(x * 73856093 ^ y * 19349663, 2654435761) >>> 0) % 3;
    if (n - len === 1) len--;
    lengths.push(len);
    n -= len;
    x += len;
  }
  return [...lengths, n];
}

/**
 * Studs style: each row of pixels is laid in bricks 2 to 4 long, with a stud on every
 * pixel, set apart by a cut-out ring that widens to the bottom right like a shadow.
 */
function studsPath(g: Grid): string {
  const gap = 0.25;
  const stud = 2.8;
  const ring = 3.6;
  const shadow = 0.7;
  let d = "";
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      if (!on(g, x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (on(g, x, y)) x++;
      let bx = start;
      for (const len of brickLengths(x - start, start, y)) {
        d += rect(bx * U + gap, y * U + gap, len * U - 2 * gap, U - 2 * gap);
        for (let i = bx; i < bx + len; i++) {
          const cx = i * U + U / 2;
          const cy = y * U + U / 2;
          d += circle(cx + shadow, cy + shadow, ring, false) + circle(cx, cy, stud, true);
        }
        bx += len;
      }
    }
  }
  return d;
}

const poly = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${+x.toFixed(2)} ${+y.toFixed(2)}`).join("") + "Z";

/** Mosaic style: each pixel a square tile, with an L-shaped groove along its bottom and right edges. */
/** Mosaic style; `negative` draws what lies around the tiles instead: the joints and the grooves. */
function mosaicPath(g: Grid, negative = false): string {
  const gap = 0.3;
  const inset = 1.6;
  const t = 1.1;
  let d = negative ? rect(0, 0, SIZE, SIZE) : "";
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (!on(g, x, y)) continue;
      const x0 = x * U + gap;
      const y0 = y * U + gap;
      const x1 = (x + 1) * U - gap;
      const y1 = (y + 1) * U - gap;
      const r = x1 - inset;
      const b = y1 - inset;
      // Counter-clockwise, so it cuts out of the tile.
      const groove: [number, number][] = [[r - t, b - t], [x0 + inset, b - t], [x0 + inset, b], [r, b], [r, y0 + inset], [r - t, y0 + inset]];
      // In the negative, the tile is the hole and the groove is filled: both wound the other way.
      d += negative
        ? `M${x0} ${y0}V${y1}H${x1}V${y0}Z` + poly(groove.reverse())
        : rect(x0, y0, x1 - x0, y1 - y0) + poly(groove);
    }
  return d;
}

/** Steps from each filled pixel to the nearest empty one (4-connected, off the grid counts as empty); 0 when empty. */
function depth(g: Grid): number[] {
  const dist = Array<number>(GRID * GRID).fill(0);
  const around = (x: number, y: number) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  let ring: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    if (g[i] && around(x, y).some(([a, b]) => !on(g, a, b))) {
      dist[i] = 1;
      ring.push(i);
    }
  }
  while (ring.length) {
    const next: number[] = [];
    for (const i of ring)
      for (const [a, b] of around(i % GRID, Math.floor(i / GRID))) {
        const n = b * GRID + a;
        if (on(g, a, b) && !dist[n]) {
          dist[n] = dist[i] + 1;
          next.push(n);
        }
      }
    ring = next;
  }
  return dist;
}

/**
 * Halftone style: a dot per pixel, bigger the deeper it sits in the shape, so thick
 * areas melt into a solid core. Best with the fill variant: thin lines are all edge.
 */
function halftonePath(g: Grid): string {
  const radii = [3.8, 5, 6.4];
  const dist = depth(g);
  let d = "";
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const k = dist[y * GRID + x];
      if (k) d += circle(x * U + U / 2, y * U + U / 2, radii[Math.min(k, radii.length) - 1], true);
    }
  return d;
}

/** A fixed value in [0, 1) for a list of small integers: the same inputs always give the same value. */
function hash(...n: number[]): number {
  let h = 0x811c9dc5;
  for (const v of n) h = Math.imul(h ^ v, 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/**
 * Grainy style: square tiles set apart by a thin joint, each with up to 16 specks cut
 * out like a worn stamp. Most specks hug the tile's open edges, a few are bigger, and
 * they sit at fixed places for each pixel.
 */
function grainyPath(g: Grid): string {
  const gap = 0.4;
  const round = (v: number) => +v.toFixed(1);
  let d = "";
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (!on(g, x, y)) continue;
      const x0 = x * U + gap;
      const y0 = y * U + gap;
      const x1 = (x + 1) * U - gap;
      const y1 = (y + 1) * U - gap;
      d += rect(x0, y0, x1 - x0, y1 - y0);
      const open = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => !on(g, x + dx, y + dy));
      const placed: [number, number, number][] = [];
      for (let i = 0; i < 16; i++) {
        const h = (k: number) => hash(x, y, i, k);
        const s = round(h(0) < 0.15 ? 1.1 + h(1) * 0.7 : 0.4 + h(1) * 0.5);
        let px = x0 + 0.2 + h(2) * (x1 - x0 - 0.4 - s);
        let py = y0 + 0.2 + h(3) * (y1 - y0 - 0.4 - s);
        if (open.length && h(4) < 0.7) {
          const [dx, dy] = open[Math.floor(h(5) * open.length)];
          const inset = 0.2 + h(6) * 2.2;
          if (dx) px = dx > 0 ? x1 - inset - s : x0 + inset;
          if (dy) py = dy > 0 ? y1 - inset - s : y0 + inset;
        }
        px = round(px);
        py = round(py);
        // Overlapping cut-outs would cancel out and leave a filled square.
        if (placed.some(([a, b, c]) => px < a + c + 0.1 && a < px + s + 0.1 && py < b + c + 0.1 && b < py + s + 0.1)) continue;
        placed.push([px, py, s]);
        d += `M${px} ${py}v${s}h${s}v${-s}Z`;
      }
    }
  return d;
}

/**
 * Patchwork style: the grid is cut into 2×2 zones, and each zone gets a fixed texture —
 * solid or a 2×2 checker — from its position. The checkers are in phase across
 * the whole grid, so neighbouring pixels with the same texture tile seamlessly.
 */
function patchworkPath(g: Grid): string {
  const textures = [0, 2, 0, 2, 2, 0, 2, 0]; // checker size per pixel, 0 for solid
  const zone = (x: number, y: number) => {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return textures[Math.floor((((h ^ (h >>> 16)) >>> 0) / 4294967296) * textures.length)];
  };
  let d = "";
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (!on(g, x, y)) continue;
      const n = zone(x >> 1, y >> 1);
      if (!n) {
        d += rect(x * U, y * U, U, U);
        continue;
      }
      const s = U / n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) if ((x * n + i + y * n + j) % 2 === 0) d += rect(x * U + i * s, y * U + j * s, s, s);
    }
  return d;
}

export function iconPath(g: Grid, style: StyleId): string {
  switch (style) {
    case "pixel":
      return pixelPath(g);
    case "rounded":
      return blobPath(g, 2.5);
    case "liquid":
      return liquidPath(g);
    case "liquid-blob":
      return liquidPath(g, U / 2, U / 2);
    case "blob":
      return blobPath(g);
    case "retro":
      return retroPath(g);
    case "stitch":
      return stitchPath(g);
    case "knit":
      return knitPath(g);
    case "dots":
      return dotsPath(g);
    case "quirky":
      return quirkyPath(g);
    case "studs":
      return studsPath(g);
    case "mosaic":
      return mosaicPath(g);
    case "halftone":
      return halftonePath(g);
    case "grainy":
      return grainyPath(g);
    case "patchwork":
      return patchworkPath(g);
  }
}

// ---- The grid behind an icon (px-gridded) ----

/** How strongly the grid shows, in the icon's own colour. */
export const GRID_OPACITY = 0.25;

/** Every vertex (0–11 on both axes) or every cell centre, as points in units. */
const VERTICES = Array.from({ length: (GRID + 1) ** 2 }, (_, i) => [(i % (GRID + 1)) * U, Math.floor(i / (GRID + 1)) * U]);
const CENTRES = Array.from({ length: GRID * GRID }, (_, i) => [(i % GRID) * U + U / 2, Math.floor(i / GRID) * U + U / 2]);
const dotsAt = (points: number[][], r: number) => points.map(([x, y]) => circle(x, y, r, true)).join("");

/** Thin lines along the cell edges, the outer ones kept inside the canvas. */
function gridLines(w: number, { across = true, down = true } = {}): string {
  const at = (i: number) => Math.min(Math.max(i * U - w / 2, 0), SIZE - w);
  let d = "";
  for (let i = 0; i <= GRID; i++) {
    if (down) d += rect(at(i), 0, w, SIZE);
    if (across) d += rect(0, at(i), SIZE, w);
  }
  return d;
}

/** Quirky's grid: every cell edge runs between the same nudged vertices as the icon. */
function quirkyGrid(w: number, amp = 1.5): string {
  const pt = (x: number, y: number) => {
    const [nx, ny] = nudge(x, y);
    return [Math.min(SIZE, Math.max(0, x * U + nx * amp)), Math.min(SIZE, Math.max(0, y * U + ny * amp))];
  };
  const edge = ([ax, ay]: number[], [bx, by]: number[]) => {
    // A thin quad along a→b, w wide.
    const len = Math.hypot(bx - ax, by - ay);
    const [ox, oy] = [(-(by - ay) / len) * (w / 2), ((bx - ax) / len) * (w / 2)];
    return poly([[ax + ox, ay + oy], [bx + ox, by + oy], [bx - ox, by - oy], [ax - ox, ay - oy]]);
  };
  let d = "";
  for (let y = 0; y <= GRID; y++)
    for (let x = 0; x <= GRID; x++) {
      if (x < GRID) d += edge(pt(x, y), pt(x + 1, y));
      if (y < GRID) d += edge(pt(x, y), pt(x, y + 1));
    }
  return d;
}

/**
 * Knit's grid: the same knitting over the whole canvas, as a thin line through the middle
 * of the stitches. Every half-pixel row of chevrons is one zigzag, drawn as the band
 * between it moved up and down (slopes are ±1, so that keeps the line `w` thick).
 */
function knitGrid(w: number): string {
  const at = shrunk(U / 6);
  const half = (w / 2) * Math.SQRT2;
  let d = "";
  for (let j = 0; j < 2 * GRID; j++) {
    // Valleys on the cell edges, peaks half a pixel up in the middle of the cells.
    const pts = Array.from({ length: 2 * GRID + 1 }, (_, i) => [at((i * U) / 2), at((j * U) / 2 + (i % 2 ? 0 : U / 2))]);
    d += poly([...pts.map(([x, y]) => [x, y - half]), ...pts.map(([x, y]) => [x, y + half]).reverse()] as [number, number][]);
  }
  return d;
}

/** Each style's grid, drawn in its own spirit: lines, dots, empty studs… */
const GRID_PATHS = new Map<StyleId, string>();
export function gridPath(style: StyleId): string {
  const cached = GRID_PATHS.get(style);
  if (cached !== undefined) return cached;
  let d: string;
  switch (style) {
    case "quirky":
      d = quirkyGrid(0.6);
      break;
    case "halftone":
    case "liquid":
    case "liquid-blob":
      d = dotsAt(CENTRES, 1.3);
      break;
    case "dots":
      // Small dots where the icon puts its own, four per cell.
      d = dotsAt(CENTRES.flatMap(([x, y]) => [[x - U / 4, y - U / 4], [x + U / 4, y - U / 4], [x - U / 4, y + U / 4], [x + U / 4, y + U / 4]]), 0.8);
      break;
    case "mosaic":
      // The joints and grooves of a fully tiled grid: empty tiles, outlined.
      d = mosaicPath(Array(GRID * GRID).fill(true), true);
      break;
    case "stitch": {
      // Holes of an embroidery canvas, where the crosses end: the cell corners, shrunk like the stitches.
      const at = shrunk(U / 5);
      d = dotsAt(VERTICES.map(([x, y]) => [at(x), at(y)]), 1.2);
      break;
    }
    case "knit":
      d = knitGrid(0.6);
      break;
    case "blob":
      // An empty bubble in each cell.
      d = CENTRES.map(([x, y]) => circle(x, y, U / 2 - 0.5, true) + circle(x, y, U / 2 - 1.4, false)).join("");
      break;
    case "studs":
      // A baseplate: an empty stud on every cell.
      d = CENTRES.map(([x, y]) => circle(x, y, 3.6, true) + circle(x, y, 2.8, false)).join("");
      break;
    case "retro":
      // A thin line through the middle of each of the two scanlines a row holds.
      d = Array.from({ length: GRID * 2 }, (_, i) => rect(0, Math.floor(i / 2) * U + (i % 2 ? U : U / 2) - U / 6 - 0.3, SIZE, 0.6)).join("");
      break;
    default:
      d = gridLines(0.6);
  }
  GRID_PATHS.set(style, d);
  return d;
}

export function iconSvg(g: Grid, style: StyleId, opts: { size?: number; color?: string; grid?: boolean } = {}): string {
  const { size = 24, color = "currentColor", grid = false } = opts;
  const behind = grid ? `<path d="${gridPath(style)}" opacity="${GRID_OPACITY}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${SIZE} ${SIZE}" fill="${color}">${behind}<path d="${iconPath(g, style)}"/></svg>`;
}

export const VIEWBOX = `0 0 ${SIZE} ${SIZE}`;

/** The inner lines of the 11×11 grid, in viewBox units. */
export const GRID_LINES = Array.from({ length: GRID - 1 }, (_, i) => `M${(i + 1) * U} 0V${SIZE}M0 ${(i + 1) * U}H${SIZE}`).join("");

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "icon";

export function downloadFile(filename: string, content: string | Blob, type = "image/svg+xml") {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rasterise an SVG string into a square PNG (browser only). */
export async function svgToPng(svg: string, size: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image(size, size);
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
