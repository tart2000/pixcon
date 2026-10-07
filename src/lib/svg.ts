import { GRID, type Grid } from "./pixels";

export const STYLES = [
  { id: "pixel", label: "Pixel" },
  { id: "rounded", label: "Rounded" },
  { id: "blob", label: "Blob" },
  { id: "liquid", label: "Liquid" },
  { id: "liquid-blob", label: "Liquid Blob" },
  { id: "retro", label: "Retro" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

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
 * half-pixel row, sitting at its bottom: pills a quarter of a pixel tall, fully rounded.
 */
function retroPath(g: Grid): string {
  const h = U / 4;
  const r = h / 2;
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
        d += `M${x0 + r} ${b}A${r} ${r} 0 0 1 ${x0 + r} ${b - h}H${x1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${b}Z`;
      }
    }
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
  }
}

export function iconSvg(g: Grid, style: StyleId, opts: { size?: number; color?: string } = {}): string {
  const { size = 24, color = "currentColor" } = opts;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${SIZE} ${SIZE}" fill="${color}"><path d="${iconPath(g, style)}"/></svg>`;
}

export const VIEWBOX = `0 0 ${SIZE} ${SIZE}`;

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "icon";

export function downloadFile(filename: string, content: string, type = "image/svg+xml") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
