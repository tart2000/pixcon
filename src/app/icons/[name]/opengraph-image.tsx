import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { getValidatedIconByName } from "@/lib/db";
import { decode } from "@/lib/pixels";
import { DEFAULT_STYLE, iconSvg, STYLES, type StyleId } from "@/lib/svg";

// The share image of an icon's page: the icon big, its name, and a few of its styles.
// Refreshed hourly like the page; drawn on first request, then cached.
export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Pixicons pixel icon";

const INK = "#171717";
const MUTED = "#737373";
/** A strip of the icon in styles that each look different. */
const STRIP: StyleId[] = ["pixel", "mosaic", "studs", "quirky", "halftone", "retro"];

const asset = (file: string) => readFile(join(process.cwd(), "src/assets", file));
const img = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const [icon, display, mono, logo] = await Promise.all([
    getValidatedIconByName(name),
    asset("LondrinaSolid-Regular.ttf"),
    asset("GeistMono-Regular.ttf"),
    // The favicon, without its dark-mode stylesheet (the image is always light).
    readFile(join(process.cwd(), "src/app/icon.svg"), "utf8").then((s) =>
      s.replace(/<style>.*?<\/style>/, "").replace("<svg ", `<svg fill="${INK}" `),
    ),
  ]);
  if (!icon) notFound();
  const grid = decode(icon.pixels);
  // Long names get a smaller title so they stay on one line.
  const titleSize = name.length <= 8 ? 150 : name.length <= 14 ? 110 : name.length <= 20 ? 80 : 60;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fff", padding: 64, gap: 64 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 502,
            height: 502,
            border: "2px solid #e5e5e5",
            borderRadius: 32,
            background: "#fafafa",
          }}
        >
          <img src={img(iconSvg(grid, DEFAULT_STYLE, { color: INK }))} width={360} height={360} alt="" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={img(logo)} width={44} height={44} alt="" />
            <span style={{ fontFamily: "Londrina", fontSize: 44, color: INK }}>Pixicons</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: 12 }}>
            <span style={{ fontFamily: "Londrina", fontSize: titleSize, lineHeight: 1, color: INK }}>{name}</span>
            <span style={{ fontFamily: "Mono", fontSize: 24, color: MUTED }}>Free pixel icon · SVG, PNG, HTML</span>
            <span style={{ fontFamily: "Mono", fontSize: 24, color: MUTED }}>In {STYLES.length} styles, like these:</span>
          </div>

          <div style={{ display: "flex", gap: 22 }}>
            {STRIP.map((s) => (
              <img key={s} src={img(iconSvg(grid, s, { color: INK }))} width={68} height={68} alt="" />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Londrina", data: display, style: "normal", weight: 400 },
        { name: "Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
