"use client";

import { StyleSelect } from "./StyleSelect";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { VARIANTS, decode, type Variant } from "@/lib/pixels";
import { GRID_LINES, VIEWBOX, downloadFile, iconSvg, slugify, svgToPng, type StyleId } from "@/lib/svg";
import { useIconColor } from "@/lib/iconColor";
import { canEdit } from "@/lib/editing";
import { kitTag } from "@/lib/kit";
import { editUrl, iconUrl } from "@/lib/paths";
import { recordDownload, recordView } from "@/app/actions";
import { ColorPicker } from "./ColorPicker";
import { IconGlyph } from "./IconGlyph";
import { Segmented } from "./Segmented";
import { GridToggle } from "./GridToggle";
import { findInk } from "@/lib/merch/products";
import { CheckIcon, CopyIcon, DownloadIcon, LinkIcon, ShirtIcon } from "./UiIcons";

/** Side of the PNG export, in pixels. */
const PNG_SIZE = 600;

const TAG =
  "rounded-full border border-border px-2.5 py-0.5 font-mono text-xs text-muted transition-colors hover:border-border-strong hover:bg-subtle hover:text-foreground";

export type DetailsItem = { id: number; name: string; alts: string[]; pixels: string; fill: string | null; views: number; downloads: number };

/**
 * An icon's details: big preview, variant/style/colour, code to copy or download, tags.
 * Shown in the gallery popup and on the icon's own page.
 */
export function IconDetails({
  icon,
  nav,
  onTag,
  heading = false,
  variant,
  setVariant,
  style,
  setStyle,
  grid,
  setGrid,
}: {
  icon: DetailsItem;
  /** Controls on the right of the header (the popup's arrows and close button). */
  nav?: ReactNode;
  /** Search the library for a tag; without it, tags link to the search. */
  onTag?: (tag: string) => void;
  /** The name is the page's heading. */
  heading?: boolean;
  variant: Variant;
  setVariant: (v: Variant) => void;
  style: StyleId;
  setStyle: (s: StyleId) => void;
  grid: boolean;
  setGrid: (g: boolean) => void;
}) {
  const Title = heading ? "h1" : "div";
  const [copied, setCopied] = useState<"name" | "link" | "code" | null>(null);
  const [format, setFormat] = useState<"html" | "svg" | "png">("html");
  const color = useIconColor();
  const pixels = variant === "fill" ? (icon.fill ?? icon.pixels) : icon.pixels;
  const svg = iconSvg(decode(pixels), style, { color: color ?? undefined, grid });
  const tag = kitTag(icon.name, style, variant, grid);
  const code = format === "html" ? tag : svg;

  // One view per icon shown, arrows included. The ref keeps dev's double-run effects from counting twice.
  const counted = useRef<number | null>(null);
  useEffect(() => {
    if (counted.current === icon.id) return;
    counted.current = icon.id;
    recordView(icon.id).catch(() => {});
  }, [icon.id]);

  const download = (ext: "svg" | "png", content: string | Blob) => {
    downloadFile(`${slugify(icon.name)}-${variant}-${style}${grid ? "-grid" : ""}.${ext}`, content);
    recordDownload(icon.id).catch(() => {});
  };

  // The PNG has no surrounding text to inherit a colour from: black unless one is picked.
  const pngSvg = iconSvg(decode(pixels), style, { size: PNG_SIZE, color: color ?? "#000", grid });
  const [png, setPng] = useState<{ svg: string; blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (format !== "png") return;
    let live = true;
    let url: string | null = null;
    svgToPng(pngSvg, PNG_SIZE).then((blob) => {
      if (!live) return;
      url = URL.createObjectURL(blob);
      setPng({ svg: pngSvg, blob, url });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [format, pngSvg]);
  const pngReady = png?.svg === pngSvg ? png : null;

  const copyPng = async () => {
    // Pass the blob as a promise: Safari only allows clipboard writes started right in the click.
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngReady ? Promise.resolve(pngReady.blob) : svgToPng(pngSvg, PNG_SIZE) }),
    ]);
    setCopied("code");
    setTimeout(() => setCopied((c) => (c === "code" ? null : c)), 1200);
  };

  const copy = async (what: "name" | "link" | "code", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 1200);
  };

  return (
      <div className="flex flex-col gap-6">
        <header className="flex items-center gap-2">
          <Title className="min-w-0">
            <button
              className="max-w-full truncate rounded-md px-2 py-1 font-mono text-xl font-semibold tracking-tight hover:bg-subtle sm:text-2xl"
              title="Copy icon name"
              onClick={() => copy("name", icon.name)}
            >
              {icon.name}
            </button>
          </Title>
          {/* The icon's own page, whichever popup or page it's copied from. */}
          <button
            className="btn-icon shrink-0"
            title="Copy link"
            onClick={() => copy("link", `${location.origin}${iconUrl(icon.name)}`)}
          >
            {copied === "link" ? <CheckIcon /> : <LinkIcon />}
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {copied === "name" && "Name copied"}
          </span>
          {nav}
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col rounded-lg border border-border bg-background">
            <div className="flex flex-1 items-center justify-center py-10">
              {/* Hovering the icon reveals the 11×11 grid it's drawn on, faintly, behind it, unless the grid is shown already. */}
              <div className="group relative">
                {!grid && (
                  <svg
                    viewBox={VIEWBOX}
                    className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    aria-hidden
                  >
                    <rect x="0" y="0" width="110" height="110" className="fill-none stroke-border" strokeWidth={0.6} />
                    <path d={GRID_LINES} className="fill-none stroke-border" strokeWidth={0.6} />
                  </svg>
                )}
                <IconGlyph pixels={pixels} style={style} size={176} color={color} grid={grid} className="relative" />
              </div>
            </div>
            <div className="flex items-end justify-center gap-5 border-t border-border py-4">
              {[16, 24, 32, 48].map((size) => (
                <IconGlyph key={size} pixels={pixels} style={style} size={size} color={color} grid={grid} />
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StyleSelect value={style} onChange={setStyle} />
              <Segmented label="Variant" options={VARIANTS} value={variant} onChange={setVariant} />
              <GridToggle value={grid} onChange={setGrid} />
              <ColorPicker />
            </div>
            {/* Code: folder tabs on a panel holding the snippet (or PNG) and its actions. */}
            <div>
              <div role="tablist" aria-label="Code format" className="flex">
                {(["html", "svg", "png"] as const).map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={format === f}
                    onClick={() => setFormat(f)}
                    className={`relative -mb-px rounded-t-lg border px-5 py-2 text-xs font-semibold tracking-wider uppercase transition-colors ${
                      format === f
                        ? "z-10 border-border border-b-background bg-background text-foreground"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                className="flex flex-col gap-4 rounded-lg rounded-tl-none border border-border bg-background p-4"
              >
                {format === "png" ? (
                  <div className="flex h-40 items-center justify-center rounded-lg bg-subtle">
                    {pngReady && (
                      // eslint-disable-next-line @next/next/no-img-element -- a local blob URL, nothing to optimise.
                      <img src={pngReady.url} alt={`${icon.name} PNG`} width={128} height={128} />
                    )}
                  </div>
                ) : (
                  // Code style, like the other snippets on the site: inverted on the main colour.
                  <pre
                    className={`overflow-auto rounded-lg bg-foreground p-4 font-mono leading-relaxed break-all whitespace-pre-wrap ${
                      format === "html" ? "text-sm text-on-foreground" : "max-h-40 text-xs text-on-foreground/80"
                    }`}
                  >
                    {format === "html" ? (
                      <>
                        <span className="text-on-foreground/60">&lt;i class=&quot;</span>
                        <span className="font-semibold">{tag.match(/class="([^"]*)"/)![1]}</span>
                        <span className="text-on-foreground/60">&quot;&gt;&lt;/i&gt;</span>
                      </>
                    ) : (
                      svg
                    )}
                  </pre>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="btn-primary sm:flex-1"
                    onClick={() => (format === "png" ? copyPng() : copy("code", code))}
                  >
                    {copied === "code" ? <CheckIcon /> : <CopyIcon />}
                    {copied === "code" ? "Copied" : `Copy ${format.toUpperCase()}`}
                  </button>
                  {format !== "html" && (
                    <button
                      className="btn sm:flex-1"
                      disabled={format === "png" && !pngReady}
                      onClick={() => (format === "png" ? pngReady && download("png", pngReady.blob) : download("svg", svg))}
                    >
                      <DownloadIcon />
                      Download {format.toUpperCase()}
                    </button>
                  )}
                </div>
                {format === "html" && (
                  <p className="-mt-1 text-xs text-muted">
                    Load the Pixicons kit on your page first ·{" "}
                    <Link href="/how-to" className="text-foreground underline underline-offset-2">
                      How to
                    </Link>
                  </p>
                )}
              </div>
            </div>
            {/* The shop opens on this icon, as shown here (style, variant and, when it's an ink, the colour). */}
            <Link
              href={`/shop?${new URLSearchParams({
                icon: icon.name,
                style,
                variant: variant === "fill" && icon.fill ? "fill" : "regular",
                ...(findInk(color) && { ink: color!.slice(1) }),
              })}`}
              className="btn-fun h-11 w-full"
            >
              <ShirtIcon />
              Shop · Put it on a T-shirt
            </Link>
          </div>
        </div>

        {(icon.alts.length > 0 || canEdit) && (
          <footer className="flex flex-wrap items-center gap-1.5">
            {icon.alts.map((a) => (
              onTag ? (
                <button key={a} onClick={() => onTag(a)} title={`Show icons tagged “${a}”`} className={TAG}>
                  {a}
                </button>
              ) : (
                <Link key={a} href={`/icons?q=${encodeURIComponent(a)}`} title={`Show icons tagged “${a}”`} className={TAG}>
                  {a}
                </Link>
              )
            ))}
            {canEdit && (
              <div className="ml-auto flex items-center gap-3">
                {/* Counts when the page was loaded, before this view. */}
                <span className="font-mono text-xs text-muted">
                  views: {icon.views} · downloads: {icon.downloads}
                </span>
                <Link href={`${editUrl(icon.name)}${variant === "fill" ? "?variant=fill" : ""}`} className="btn h-8">
                  Edit
                </Link>
              </div>
            )}
          </footer>
        )}
      </div>
  );
}
