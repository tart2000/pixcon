"use client";

import { StyleSelect } from "./StyleSelect";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { VARIANTS, decode, type Variant } from "@/lib/pixels";
import { DEFAULT_STYLE, downloadFile, iconSvg, slugify, type StyleId } from "@/lib/svg";
import { useIconColor } from "@/lib/iconColor";
import { ColorPicker } from "./ColorPicker";
import { IconGlyph } from "./IconGlyph";
import { Segmented } from "./Segmented";
import { GridToggle } from "./GridToggle";
import { matchesQuery } from "@/lib/alts";
import { CATEGORIES, categoryPath, inCategory } from "@/lib/categories";
import { canEdit } from "@/lib/editing";
import { IconModal } from "./IconModal";
import { recordDownload } from "@/app/actions";
import { CheckIcon, CloseIcon, CopyIcon, DownloadIcon } from "./UiIcons";

type Item = {
  id: number;
  name: string;
  alts: string[];
  pixels: string;
  fill: string | null;
  views: number;
  downloads: number;
  /** In the latest published batch: badged, and found by searching "new". */
  isNew: boolean;
};

/** `initialStyle` comes from the link that opened the gallery (?style=). */
export function IconGallery({ icons, initialStyle }: { icons: Item[]; initialStyle?: StyleId }) {
  const [style, pickStyle] = useState<StyleId>(initialStyle ?? DEFAULT_STYLE);
  const [variant, setVariant] = useState<Variant>("regular");
  const [grid, setGrid] = useState(false);
  const [size, setSize] = useState(68);
  const [copied, setCopied] = useState<number | null>(null);
  const color = useIconColor();

  // The search (?q=) and the open icon (?icon=name) live in the URL so both can be shared; back closes the icon.
  const search = useSyncExternalStore(subscribeUrl, () => location.search, () => "");
  const params = new URLSearchParams(search);
  const query = params.get("q") ?? "";
  const openName = params.get("icon");
  const setQuery = (q: string) => setUrl("replace", urlWith({ q }));
  // The style follows the URL too, so a link like /icons?style=studs stays true once you change it.
  const setStyle = (s: StyleId) => {
    pickStyle(s);
    setUrl("replace", urlWith({ style: s === DEFAULT_STYLE ? null : s }));
  };
  // The gallery stays full width until the categories are asked for (or a link opens one).
  // Moving between categories keeps this page mounted, so the style and the size stay as they were.
  const pathname = usePathname();
  const category = CATEGORIES.find((c) => categoryPath(c.slug) === pathname);
  const [categoriesOpen, setCategoriesOpen] = useState<boolean | null>(null);
  const showCategories = categoriesOpen ?? !!category;
  const setCategory = (slug: string | null) => {
    setUrl("push", `${categoryPath(slug)}${location.search}`);
    window.scrollTo({ top: 0 });
  };
  const hideCategories = () => {
    setCategoriesOpen(false);
    if (category) setCategory(null);
  };
  useEffect(() => {
    document.title = `${category ? `${category.label} icons` : "Icons"} · Pixicons`;
  }, [category]);
  const filtered = useMemo(
    () =>
      icons.filter(
        (i) => matchesQuery(i.isNew ? { ...i, alts: [...i.alts, "new"] } : i, query) && (!category || inCategory(category, i.alts)),
      ),
    [icons, query, category],
  );
  const categoryTotals = useMemo(
    () => CATEGORIES.map((c) => ({ ...c, total: icons.filter((i) => inCategory(c, i.alts)).length })),
    [icons],
  );
  const robot = icons.find((i) => i.name === "robot");
  const pushed = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
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
    setUrl("replace", `${categoryPath()}${urlWith({ icon: null, q: tag })}`);
    window.scrollTo({ top: 0 });
  };

  /** Pixels of the selected variant, or null when this icon has no fill yet. */
  const pixelsOf = (i: Item) => (variant === "fill" ? i.fill : i.pixels);
  const svgFor = (i: Item) => iconSvg(decode(pixelsOf(i)!), style, { color: color ?? undefined, grid });

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
        <div className="relative">
          <input
            ref={searchRef}
            className="input h-12 w-full px-4 pr-12 text-base"
            placeholder={`Search ${icons.length} free icons…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          />
          {query && (
            <button
              className="btn-icon absolute top-1/2 right-2 -translate-y-1/2"
              title="Clear search (Esc)"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StyleSelect value={style} onChange={setStyle} />
          <Segmented label="Variant" options={VARIANTS} value={variant} onChange={setVariant} />
          <GridToggle value={grid} onChange={setGrid} />
          <ColorPicker align="left" />
          {/* One button to the eye, but two to click: the frame holds the toggle and its X. */}
          <div className={`btn gap-0 p-0 ${showCategories || category ? "border-foreground" : ""}`}>
            <button
              className={`flex h-full items-center pl-3 ${showCategories || category ? "pr-1.5" : "pr-3"}`}
              aria-expanded={showCategories}
              onClick={() => setCategoriesOpen(!showCategories)}
            >
              {category ? category.label : "Categories"}
            </button>
            {(showCategories || category) && (
              <button className="btn-icon mr-1 size-6" title="Hide categories" aria-label="Hide categories" onClick={hideCategories}>
                <CloseIcon />
              </button>
            )}
          </div>
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
              className="range w-28"
              style={{ "--fill": `${((size - 16) / (192 - 16)) * 100}%` } as React.CSSProperties}
              aria-label="Preview size"
            />
            <span className="w-11 text-right font-mono text-xs text-muted">{size}px</span>
          </label>
        </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {showCategories && (
        // A side list on large screens, a row to swipe through on small ones.
        <nav
          aria-label="Categories"
          className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-background p-2 lg:sticky lg:top-[13rem] lg:max-h-[calc(100vh-14rem)] lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-y-auto"
        >
          {[{ slug: null, label: "All", icon: "pixcon", total: icons.length }, ...categoryTotals].map((c) => {
            const glyph = icons.find((i) => i.name === c.icon);
            const active = (category?.slug ?? null) === c.slug;
            return (
              <button
                key={c.label}
                aria-current={active ? "true" : undefined}
                onClick={() => setCategory(c.slug)}
                className={`flex shrink-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-subtle ${
                  active ? "bg-subtle font-semibold text-foreground" : "text-muted"
                }`}
              >
                {glyph && <IconGlyph pixels={glyph.pixels} style={style} size={22} color={color} />}
                <span>{c.label}</span>
                <span className="font-mono text-xs lg:ml-auto">{c.total}</span>
              </button>
            );
          })}
        </nav>
      )}
      <div className="min-w-0 flex-1">
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          {icons.length === 0 ? (
            <>
              <p className="text-sm text-muted">No icons yet.</p>
              {canEdit && (
                <Link href="/new" className="btn">
                  Draw the first one
                </Link>
              )}
            </>
          ) : category ? (
            // It may well exist elsewhere: look everywhere before offering to request it.
            <>
              <p className="text-sm text-muted">Nothing in {category.label}.</p>
              <button className="btn" onClick={() => setCategory(null)}>
                Search all icons
              </button>
            </>
          ) : (
            // Nothing found: offer to request it, with the search carried over to /manage.
            <Link
              href={`/manage?q=${encodeURIComponent(query.trim())}`}
              className="group flex flex-col items-center gap-4 px-6"
            >
              {robot && (
                <IconGlyph
                  pixels={robot.pixels}
                  style={style}
                  size={112}
                  color={color}
                  className="transition-transform group-hover:-rotate-6 group-hover:scale-110"
                />
              )}
              <span className="font-display text-3xl">No icon for “{query.trim()}” yet</span>
              <span className="btn-primary h-11 px-5 text-base">Ask for it</span>
              <span className="text-sm text-muted">Then follow its progress on the requests page.</span>
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
                    grid={grid}
                    className={missing ? "opacity-15" : undefined}
                  />
                  <span className="w-full truncate text-center font-mono text-xs text-muted">{i.name}</span>
                </button>
                {i.isNew && (
                  <span className="absolute top-2 left-2 rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold tracking-wide text-on-foreground uppercase">
                    New
                  </span>
                )}
                {!missing && (
                  <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
                    <button className="btn-icon size-7" title="Copy SVG" onClick={() => copy(i)}>
                      {copied === i.id ? <CheckIcon /> : <CopyIcon />}
                    </button>
                    <button
                      className="btn-icon size-7"
                      title="Download SVG"
                      onClick={() => {
                        downloadFile(`${slugify(i.name)}-${variant}-${style}${grid ? "-grid" : ""}.svg`, svgFor(i));
                        recordDownload(i.id).catch(() => {});
                      }}
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
      </div>
      </div>

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
          grid={grid}
          setGrid={setGrid}
        />
      )}
    </div>
  );
}

// The URL is read through our own store rather than useSearchParams, which would need a
// Suspense boundary around the gallery.
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
