// Shared by scripts/build-kit.mjs (run by Node with type stripping): no path aliases, no extensionless imports.
import { createHash } from "node:crypto";

type KitRow = { name: string; pixels: string; pixels_fill: string | null };

/** A fingerprint of what the kit holds: the name and both grids of every validated icon. */
export function kitHash(rows: KitRow[]): string {
  const lines = rows.map((r) => `${r.name}:${r.pixels}:${r.pixels_fill ?? ""}`).sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 16);
}
