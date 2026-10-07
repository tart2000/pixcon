export const GRID = 11;
export const CELLS = GRID * GRID;

/** A grid is a flat array of 121 booleans, row by row. Stored as a "0"/"1" string. */
export type Grid = boolean[];

export const emptyGrid = (): Grid => Array(CELLS).fill(false);

export const decode = (s: string): Grid =>
  Array.from({ length: CELLS }, (_, i) => s[i] === "1");

export const encode = (g: Grid): string => g.map((v) => (v ? "1" : "0")).join("");

/** Compact form served by the kit: 121 bits as 31 hex digits (padded with zeros). */
export const toHex = (s: string): string =>
  (s + "000").match(/.{4}/g)!.map((b) => parseInt(b, 2).toString(16)).join("");

export const fromHex = (hex: string): Grid =>
  Array.from({ length: CELLS }, (_, i) => ((parseInt(hex[i >> 2], 16) >> (3 - (i & 3))) & 1) === 1);

export const isValidPixels = (s: unknown): s is string =>
  typeof s === "string" && s.length === CELLS && /^[01]+$/.test(s);

/** Swap filled and empty pixels; the 4 canvas corners stay empty so the result reads as a rounded tile. */
export const invert = (g: Grid): Grid => {
  const corners = [0, GRID - 1, CELLS - GRID, CELLS - 1];
  return g.map((v, i) => !v && !corners.includes(i));
};

export const flipH = (g: Grid): Grid =>
  g.map((_, i) => g[Math.floor(i / GRID) * GRID + (GRID - 1 - (i % GRID))]);

export const flipV = (g: Grid): Grid =>
  g.map((_, i) => g[(GRID - 1 - Math.floor(i / GRID)) * GRID + (i % GRID)]);

/** Rotate a quarter turn clockwise: the left column becomes the top row. */
export const rotate = (g: Grid): Grid =>
  g.map((_, i) => g[(GRID - 1 - (i % GRID)) * GRID + Math.floor(i / GRID)]);

/** Shift the drawing by (dx, dy); pixels pushed off the edge are lost. */
export const shift = (g: Grid, dx: number, dy: number): Grid =>
  g.map((_, i) => {
    const x = (i % GRID) - dx;
    const y = Math.floor(i / GRID) - dy;
    return x >= 0 && x < GRID && y >= 0 && y < GRID ? g[y * GRID + x] : false;
  });

/** Each icon is drawn twice: an outlined "regular" version and a solid "fill" one. */
export const VARIANTS = [
  { id: "regular", label: "Regular" },
  { id: "fill", label: "Fill" },
] as const;

export type Variant = (typeof VARIANTS)[number]["id"];
