import { decode, type Grid } from "@/lib/pixels";
import { iconPath, VIEWBOX, type StyleId } from "@/lib/svg";

export function IconGlyph({
  pixels,
  style,
  size = 24,
  className,
  color,
}: {
  pixels: string | Grid;
  style: StyleId;
  size?: number;
  className?: string;
  /** Defaults to the surrounding text colour. */
  color?: string | null;
}) {
  const grid = typeof pixels === "string" ? decode(pixels) : pixels;
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill={color ?? "currentColor"} className={className} aria-hidden>
      <path d={iconPath(grid, style)} />
    </svg>
  );
}
