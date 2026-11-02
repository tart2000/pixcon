import { decode, type Grid } from "@/lib/pixels";
import { GRID_OPACITY, gridPath, iconPath, VIEWBOX, type StyleId } from "@/lib/svg";

export function IconGlyph({
  pixels,
  style,
  size = 24,
  className,
  color,
  grid = false,
}: {
  pixels: string | Grid;
  style: StyleId;
  size?: number;
  className?: string;
  /** Defaults to the surrounding text colour. */
  color?: string | null;
  /** Show the style's grid behind the icon. */
  grid?: boolean;
}) {
  const cells = typeof pixels === "string" ? decode(pixels) : pixels;
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill={color ?? "currentColor"} className={className} aria-hidden>
      {grid && <path d={gridPath(style)} opacity={GRID_OPACITY} />}
      <path d={iconPath(cells, style)} />
    </svg>
  );
}
