"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { VARIANTS, decode, type Variant } from "@/lib/pixels";
import { STYLES, downloadFile, iconSvg, slugify, type StyleId } from "@/lib/svg";
import { useIconColor } from "@/lib/iconColor";
import { ColorPicker } from "./ColorPicker";
import { IconGlyph } from "./IconGlyph";
import { Segmented } from "./Segmented";
import { matchesQuery } from "@/lib/alts";
import { canEdit } from "@/lib/editing";
import { IconModal } from "./IconModal";
import { CheckIcon, CopyIcon, DownloadIcon } from "./UiIcons";

type Item = { id: number; name: string; alts: string[]; pixels: string; fill: string | null };

export function IconGallery({ icons }: { icons: Item[] }) {
  const [style, setStyle] = useState<StyleId>("liquid-blob");
  const [variant, setVariant] = useState<Variant>("regular");
  const [size, setSize] = useState(68);
  const [copied, setCopied] = useState<number | null>(null);
  const color = useIconColor();

  // The search (?q=) and the open icon (?icon=name) live in the URL so both can be shared; back closes the icon.
  const search = useSyncExternalStore(subscribeUrl, () => location.search, () => "");
  const params = new URLSearchParams(search);
  const query = params.get("q") ?? "";
  const openName = params.get("icon");
  const setQuery = (q: string) => setUrl("replace", urlWith({ q }));
  const filtered = useMemo(() => icons.filter((i) => matchesQuery(i, query)), [icons, query]);
  const pushed = useRef(false);
  // Browse the filtered list, unless a shared link points outside it.
  const browsing = filtered.some((i) => i.name === openName) ? filtered : icons;
  const openIndex = browsing.findIndex((i) => i.name === openName);
  const openIcon = (i: Item) => {
    setUrl("push", urlWith({ icon: i.name }));
    pushed.current = true;
  };
  const closeIcon = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else setUrl("replace", urlWith({ icon: null }));
  };
  /** A tag clicked in the popup: close it and search for that tag. */
  const showTag = (tag: string) => {
    pushed.current = false;
    setUrl("replace", urlWith({ icon: null, q: tag }));
    window.scrollTo({ top: 0 });
  };

  /** Pixels of the selected variant, or null when this icon has no fill yet. */
  const pixelsOf = (i: Item) => (variant === "fill" ? i.fill : i.pixels);
  const svgFor = (i: Item) => iconSvg(decode(pixelsOf(i)!), style, { color: color ?? undefined });

  const copy = async (i: Item) => {
    await navigator.clipboard.writeText(svgFor(i));
    setCopied(i.id);
    setTimeout(() => setCopied((c) => (c === i.id ? null : c)), 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar: search, then how to show icons (variant, style, colour) + how big.
          A full-width white band that starts right under the header (cancelling main's top padding) and sticks there. */}
      <div className="sticky top-14 z-[5] -mt-8 ml-[calc(50%-50vw)] w-screen border-b border-border bg-background sm:-mt-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:px-6">
        <input
          className="input h-12 w-full px-4 text-base"
          placeholder={`Search ${icons.length} icons…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Variant" options={VARIANTS} value={variant} onChange={setVariant} />
          <Segmented label="Style" options={STYLES} value={style} onChange={setStyle} />
          <ColorPicker align="left" />
          <label
            className="flex h-9 items-center gap-3 rounded-md border border-border bg-background px-3 sm:ml-auto"
            title="Preview size"
          >
            <input
              type="range"
              min={16}
              max={192}
              step={4}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-28 accent-foreground"
              aria-label="Preview size"
            />
            <span className="w-11 text-right font-mono text-xs text-muted">{size}px</span>
          </label>
        </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-sm text-muted">{icons.length === 0 ? "No icons yet." : "No icons match your search."}</p>
          {icons.length === 0 && canEdit && (
            <Link href="/new" className="btn">
              Draw the first one
            </Link>
          )}
        </div>
      ) : (
        // Columns follow the preview size. Each cell draws its right/bottom divider as a
        // shadow; the ones on the outer edge are clipped, so a partial last row stays clean.
        <ul
          className="grid overflow-hidden rounded-lg border border-border"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(140, size + 64)}px, 1fr))` }}
        >
          {filtered.map((i) => {
            const missing = pixelsOf(i) === null;
            return (
              <li
                key={i.id}
                className="group relative flex flex-col items-center gap-3 bg-background px-3 pt-8 pb-4 shadow-[1px_1px_0_0_var(--border)]"
              >
                <button
                  className="flex w-full flex-col items-center gap-3"
                  title={missing ? "No fill variant yet" : i.name}
                  onClick={() => openIcon(i)}
                >
                  {/* Without a fill variant, show the regular one faded as an invitation to draw it. */}
                  <IconGlyph
                    pixels={pixelsOf(i) ?? i.pixels}
                    style={style}
                    size={size}
                    color={color}
                    className={missing ? "opacity-15" : undefined}
                  />
                  <span className="w-full truncate text-center font-mono text-xs text-muted">{i.name}</span>
                </button>
                {!missing && (
                  <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
                    <button className="btn-icon size-7" title="Copy SVG" onClick={() => copy(i)}>
                      {copied === i.id ? <CheckIcon /> : <CopyIcon />}
                    </button>
                    <button
                      className="btn-icon size-7"
                      title="Download SVG"
                      onClick={() => downloadFile(`${slugify(i.name)}-${variant}-${style}.svg`, svgFor(i))}
                    >
                      <DownloadIcon />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {openIndex >= 0 && (
        <IconModal
          icons={browsing}
          index={openIndex}
          onIndex={(n) => setUrl("replace", urlWith({ icon: browsing[n].name }))}
          onClose={closeIcon}
          onTag={showTag}
          variant={variant}
          setVariant={setVariant}
          style={style}
          setStyle={setStyle}
        />
      )}
    </div>
  );
}

// The URL is read through our own store rather than useSearchParams, which would need a
// Suspense boundary and leave the gallery out of the static export's HTML.
const URL_CHANGE = "pixcon:url";
function subscribeUrl(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(URL_CHANGE, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(URL_CHANGE, cb);
  };
}
/** Current URL with some query params changed; empty values are dropped. */
function urlWith(changes: Record<string, string | null>) {
  const params = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(changes)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  const s = params.toString();
  return s ? `?${s}` : location.pathname;
}
function setUrl(mode: "push" | "replace", url: string) {
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(URL_CHANGE));
}
